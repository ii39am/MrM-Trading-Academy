import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  getPaymentProvider,
  PaymentProcessingError,
  processReconciliationUpdate,
} from "@/lib/payment";

export const RECONCILIATION_BATCH_LIMIT = 50;
export const RECONCILIATION_MAX_BATCH_LIMIT = 100;
export const RECONCILIATION_RETENTION_MS = 7 * 24 * 60 * 60_000;
export const RECONCILIATION_DEADLINE_MS = 45_000;

export type ReconciliationErrorCode =
  | "PURCHASE_NOT_FOUND"
  | "UNSUPPORTED_PROVIDER"
  | "PROVIDER_PAYMENT_ID_MISSING"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_INVALID_RESPONSE"
  | "BINDING_MISMATCH"
  | "INVALID_TRANSITION"
  | "RECONCILIATION_FAILED";

export class PaymentReconciliationError extends Error {
  readonly name = "PaymentReconciliationError";
  constructor(readonly code: ReconciliationErrorCode) {
    super("Payment reconciliation failed");
  }
}

function errorCode(error: unknown): ReconciliationErrorCode {
  if (error instanceof PaymentReconciliationError) return error.code;
  if (error instanceof PaymentProcessingError) {
    if (error.code === "INVALID_PAYMENT_TRANSITION")
      return "INVALID_TRANSITION";
    return "BINDING_MISMATCH";
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    const status = "statusCode" in error ? Number(error.statusCode) : undefined;
    if (code === "TIMEOUT") return "PROVIDER_TIMEOUT";
    if (code === "HTTP_4XX" && status === 429) return "PROVIDER_RATE_LIMITED";
    if (["HTTP_5XX", "NETWORK"].includes(code)) return "PROVIDER_UNAVAILABLE";
    if (
      ["MALFORMED_JSON", "RESPONSE_TOO_LARGE", "INVALID_RESPONSE"].includes(
        code,
      )
    )
      return "PROVIDER_INVALID_RESPONSE";
    if (code === "BINDING_MISMATCH") return "BINDING_MISMATCH";
  }
  return "RECONCILIATION_FAILED";
}

function nextAttempt(
  createdAt: Date,
  attempts: number,
  now: Date,
  failed: boolean,
) {
  const age = now.getTime() - createdAt.getTime();
  let delay =
    age < 60 * 60_000
      ? 2 * 60_000
      : age < 24 * 60 * 60_000
        ? 10 * 60_000
        : 60 * 60_000;
  if (failed)
    delay = Math.min(6 * 60 * 60_000, delay * 2 ** Math.min(attempts, 3));
  return new Date(now.getTime() + delay);
}

function safeLog(
  event: string,
  values: Record<string, string | number | boolean | null>,
) {
  console.info(JSON.stringify({ level: "info", event, ...values }));
}

export async function reconcilePurchase(purchaseId: string, now = new Date()) {
  const purchase = await db.purchase.findUnique({
    where: { id: purchaseId },
    select: {
      id: true,
      provider: true,
      providerPaymentId: true,
      createdAt: true,
      reconcileAttempts: true,
    },
  });
  if (!purchase) throw new PaymentReconciliationError("PURCHASE_NOT_FOUND");
  if (purchase.provider !== "nowpayments")
    throw new PaymentReconciliationError("UNSUPPORTED_PROVIDER");
  if (!purchase.providerPaymentId)
    throw new PaymentReconciliationError("PROVIDER_PAYMENT_ID_MISSING");

  const provider = getPaymentProvider();
  if (provider.name !== purchase.provider)
    throw new PaymentReconciliationError("UNSUPPORTED_PROVIDER");
  try {
    const status = await provider.getPaymentStatus(purchase.providerPaymentId);
    const nextReconcileAt = nextAttempt(
      purchase.createdAt,
      purchase.reconcileAttempts + 1,
      now,
      false,
    );
    const result = await processReconciliationUpdate(
      provider.name,
      status,
      now,
      nextReconcileAt,
    );
    safeLog("payment_reconciliation_completed", {
      purchaseId: purchase.id,
      providerPaymentId: purchase.providerPaymentId,
      status: result.status,
      changed: result.changed,
    });
    return result;
  } catch (error) {
    const code = errorCode(error);
    const retryAt = nextAttempt(
      purchase.createdAt,
      purchase.reconcileAttempts + 1,
      now,
      true,
    );
    await db.purchase
      .updateMany({
        where: { id: purchase.id },
        data: {
          lastReconciledAt: now,
          nextReconcileAt: retryAt,
          reconcileAttempts: { increment: 1 },
          reconciliationErrorCode: code,
        },
      })
      .catch(() => undefined);
    await writeAudit({
      action: "PAYMENT_RECONCILIATION_FAILED",
      entityType: "Purchase",
      entityId: purchase.id,
      category: "PAYMENT",
      metadata: {
        purchaseId: purchase.id,
        source: "RECONCILIATION",
        reason: code,
      },
    }).catch(() => undefined);
    safeLog("payment_reconciliation_error", {
      purchaseId: purchase.id,
      providerPaymentId: purchase.providerPaymentId,
      reason: code,
    });
    throw new PaymentReconciliationError(code);
  }
}

export type ReconciliationStats = {
  scanned: number;
  reconciled: number;
  changed: number;
  errors: number;
};
export async function runPaymentReconciliation(
  options: {
    limit?: number;
    deadlineMs?: number;
    now?: Date;
    reconcile?: typeof reconcilePurchase;
  } = {},
): Promise<ReconciliationStats> {
  const now = options.now ?? new Date();
  const limit = Math.max(
    1,
    Math.min(
      options.limit ?? RECONCILIATION_BATCH_LIMIT,
      RECONCILIATION_MAX_BATCH_LIMIT,
    ),
  );
  const deadline =
    Date.now() +
    Math.max(1_000, options.deadlineMs ?? RECONCILIATION_DEADLINE_MS);
  const reconcile = options.reconcile ?? reconcilePurchase;
  safeLog("payment_reconciliation_batch_started", { limit });

  await db.couponRedemption.updateMany({
    where: { status: "RESERVED", expiresAt: { lte: now } },
    data: { status: "RELEASED", releasedAt: now },
  });
  const candidates = await db.purchase.findMany({
    where: {
      provider: "nowpayments",
      providerPaymentId: { not: null },
      status: { in: ["PENDING", "EXPIRED"] },
      createdAt: { gte: new Date(now.getTime() - RECONCILIATION_RETENTION_MS) },
      OR: [{ nextReconcileAt: null }, { nextReconcileAt: { lte: now } }],
    },
    select: { id: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit,
  });
  safeLog("payment_reconciliation_candidates_found", {
    count: candidates.length,
  });

  const stats: ReconciliationStats = {
    scanned: candidates.length,
    reconciled: 0,
    changed: 0,
    errors: 0,
  };
  for (const candidate of candidates) {
    if (Date.now() >= deadline) break;
    try {
      const result = await reconcile(candidate.id, now);
      stats.reconciled += 1;
      if (result.changed) stats.changed += 1;
    } catch {
      stats.reconciled += 1;
      stats.errors += 1;
    }
  }
  safeLog("payment_reconciliation_batch_completed", stats);
  return stats;
}
