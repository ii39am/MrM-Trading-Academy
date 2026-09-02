import { createHash } from "node:crypto";
import { PaymentStatus, PaymentUpdateSource, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getEmailProvider, paymentConfirmedEmail } from "@/lib/email";
import { writeAudit } from "@/lib/audit";

export interface CheckoutInput {
  purchaseId: string;
  userId: string;
  courseIds: string[];
  amountCents: number;
}
export interface CheckoutSession {
  id: string;
  purchaseId: string;
  providerStatus: string;
  payAddress: string;
  payAmount: string;
  payCurrency: "usdttrc20";
  network: "TRC20";
  expiresAt?: string;
}
interface TrustedPaymentUpdate {
  purchaseId: string;
  providerPaymentId: string;
  status: PaymentStatus;
  providerStatus: string;
  expectedAmount: string;
  receivedAmount: string;
  payCurrency: string;
  network: string;
  paymentAddress: string;
  priceAmount: string;
  priceCurrency: string;
  transactionHash?: string;
  expiresAt?: string;
}
export interface VerifiedPaymentEvent extends TrustedPaymentUpdate {
  eventId: string;
  raw: unknown;
}
export type ProviderPaymentStatus = TrustedPaymentUpdate;
export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  verifyWebhook(
    payload: string,
    signature: string,
  ): Promise<VerifiedPaymentEvent>;
  getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentStatus>;
}

const paymentRegistry = globalThis as typeof globalThis & {
  __academyPaymentProvider?: PaymentProvider;
};
export function registerPaymentProvider(value: PaymentProvider) {
  paymentRegistry.__academyPaymentProvider = value;
}
export function getPaymentProvider() {
  if (!paymentRegistry.__academyPaymentProvider)
    throw new Error("Payment provider is not configured");
  return paymentRegistry.__academyPaymentProvider;
}

const transitions: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["PAID", "FAILED", "EXPIRED", "CANCELLED"],
  PAID: ["REFUNDED"],
  FAILED: [],
  EXPIRED: ["PAID"],
  REFUNDED: [],
  CANCELLED: ["PAID"],
};
export function canTransition(from: PaymentStatus, to: PaymentStatus) {
  return from === to || transitions[from].includes(to);
}

export type PaymentProcessingErrorCode =
  | "BINDING_MISMATCH"
  | "SETTLEMENT_TERMS_INCOMPLETE"
  | "INVALID_SETTLEMENT_ASSET"
  | "INVALID_PROVIDER_AMOUNTS"
  | "SETTLEMENT_TERMS_MISMATCH"
  | "INVALID_RECEIVED_AMOUNT"
  | "INVALID_PAYMENT_TRANSITION";
export class PaymentProcessingError extends Error {
  readonly name = "PaymentProcessingError";
  constructor(
    readonly code: PaymentProcessingErrorCode,
    message: string,
  ) {
    super(message);
  }
}

type ApplyOptions = {
  source: PaymentUpdateSource;
  eventId: string;
  payloadHash: string;
  webhook?: { id: string; provider: string; payloadHash: string };
  reconciliation?: { attemptedAt: Date; nextReconcileAt: Date };
};
type ApplyResult = {
  duplicate: boolean;
  status: PaymentStatus | null;
  changed: boolean;
  email?: string;
  products?: string[];
};

function parseDecimal(
  value: string,
  code: PaymentProcessingErrorCode,
  message: string,
) {
  try {
    const decimal = new Prisma.Decimal(value);
    if (!decimal.isFinite()) throw new Error("non-finite");
    return decimal;
  } catch {
    throw new PaymentProcessingError(code, message);
  }
}

async function serializable<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        attempt < 2 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      )
        continue;
      throw error;
    }
  }
  throw new Error("Payment transaction retry exhausted");
}

async function applyTrustedPaymentUpdate(
  providerName: string,
  event: TrustedPaymentUpdate,
  options: ApplyOptions,
): Promise<ApplyResult> {
  return serializable(async (tx) => {
    if (options.webhook) {
      const existing = await tx.webhookEvent.findUnique({
        where: { id: options.webhook.id },
      });
      if (existing) {
        if (
          existing.provider !== options.webhook.provider ||
          existing.payloadHash !== options.webhook.payloadHash
        )
          throw new Error("Webhook replay payload mismatch");
        return { duplicate: true, status: null, changed: false };
      }
    }

    const purchase = await tx.purchase.findUnique({
      where: { id: event.purchaseId },
      include: {
        user: { select: { email: true } },
        items: { include: { course: { select: { titleEn: true } } } },
      },
    });
    if (
      !purchase ||
      purchase.provider !== providerName ||
      !purchase.providerPaymentId ||
      purchase.providerPaymentId !== event.providerPaymentId
    )
      throw new PaymentProcessingError(
        "BINDING_MISMATCH",
        "Purchase binding mismatch",
      );
    if (
      !purchase.expectedAmount ||
      !purchase.payCurrency ||
      !purchase.network ||
      !purchase.paymentAddress
    )
      throw new PaymentProcessingError(
        "SETTLEMENT_TERMS_INCOMPLETE",
        "Purchase settlement terms are incomplete",
      );
    if (
      event.payCurrency.toLowerCase() !== purchase.payCurrency.toLowerCase() ||
      event.network.toUpperCase() !== purchase.network.toUpperCase() ||
      purchase.payCurrency.toLowerCase() !== "usdttrc20" ||
      purchase.network.toUpperCase() !== "TRC20"
    )
      throw new PaymentProcessingError(
        "INVALID_SETTLEMENT_ASSET",
        "Invalid settlement asset",
      );

    const providerExpected = parseDecimal(
      event.expectedAmount,
      "INVALID_PROVIDER_AMOUNTS",
      "Invalid provider amounts",
    );
    const providerPrice = parseDecimal(
      event.priceAmount,
      "INVALID_PROVIDER_AMOUNTS",
      "Invalid provider amounts",
    );
    if (
      providerExpected.isNegative() ||
      providerExpected.decimalPlaces() > 12 ||
      providerPrice.isNegative() ||
      !providerExpected.eq(purchase.expectedAmount) ||
      event.paymentAddress !== purchase.paymentAddress ||
      event.priceCurrency.toUpperCase() !== purchase.currency.toUpperCase() ||
      !providerPrice.eq(new Prisma.Decimal(purchase.amountCents).div(100))
    )
      throw new PaymentProcessingError(
        "SETTLEMENT_TERMS_MISMATCH",
        "Purchase settlement terms mismatch",
      );

    const received = parseDecimal(
      event.receivedAmount,
      "INVALID_RECEIVED_AMOUNT",
      "Invalid received amount",
    );
    if (received.isNegative() || received.decimalPlaces() > 12)
      throw new PaymentProcessingError(
        "INVALID_RECEIVED_AMOUNT",
        "Invalid received amount",
      );

    let target = event.status;
    if (target === "PAID" && received.lt(purchase.expectedAmount))
      target = "PENDING";
    if (!canTransition(purchase.status, target))
      throw new PaymentProcessingError(
        "INVALID_PAYMENT_TRANSITION",
        "Invalid payment transition",
      );

    const storedReceived =
      purchase.receivedAmount && purchase.receivedAmount.gt(received)
        ? purchase.receivedAmount
        : received;
    const stateChanged = target !== purchase.status;
    const progressChanged =
      !purchase.receivedAmount ||
      storedReceived.gt(purchase.receivedAmount) ||
      purchase.providerStatus !== event.providerStatus ||
      (!!event.transactionHash &&
        event.transactionHash !== purchase.transactionHash);
    const now = options.reconciliation?.attemptedAt ?? new Date();

    if (options.webhook)
      await tx.webhookEvent.create({ data: options.webhook });
    await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        status: target,
        receivedAmount: storedReceived,
        providerStatus: event.providerStatus,
        transactionHash: event.transactionHash ?? purchase.transactionHash,
        expiresAt: event.expiresAt
          ? new Date(event.expiresAt)
          : purchase.expiresAt,
        rawWebhookHash:
          options.source === "WEBHOOK"
            ? options.payloadHash
            : purchase.rawWebhookHash,
        paidAt: target === "PAID" ? (purchase.paidAt ?? now) : purchase.paidAt,
        refundedAt:
          target === "REFUNDED"
            ? (purchase.refundedAt ?? now)
            : purchase.refundedAt,
        ...(options.reconciliation
          ? {
              lastReconciledAt: options.reconciliation.attemptedAt,
              nextReconcileAt: options.reconciliation.nextReconcileAt,
              reconcileAttempts: { increment: 1 },
              reconciliationErrorCode: null,
            }
          : {}),
      },
    });

    if (stateChanged)
      await tx.paymentTransaction.create({
        data: {
          purchaseId: purchase.id,
          eventId: options.eventId,
          fromStatus: purchase.status,
          toStatus: target,
          payloadHash: options.payloadHash,
          source: options.source,
        },
      });
    if (target === "PAID")
      for (const item of purchase.items)
        await tx.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: purchase.userId,
              courseId: item.courseId,
            },
          },
          create: {
            userId: purchase.userId,
            courseId: item.courseId,
            purchaseId: purchase.id,
          },
          update: { purchaseId: purchase.id },
        });
    if (target === "REFUNDED") {
      await tx.courseAccessGrant.updateMany({
        where: { purchaseId: purchase.id, status: { in: ["PENDING", "ACTIVE"] } },
        data: { status: "REVOKED", revokedAt: now, lastErrorCode: "PURCHASE_REFUNDED" },
      });
      await tx.enrollment.deleteMany({ where: { purchaseId: purchase.id } });
    }
    if (target === "PAID")
      await tx.couponRedemption.updateMany({
        where: {
          purchaseId: purchase.id,
          status: { in: ["RESERVED", "RELEASED"] },
        },
        data: { status: "REDEEMED", redeemedAt: now, releasedAt: null },
      });
    if (["FAILED", "EXPIRED", "CANCELLED"].includes(target))
      await tx.couponRedemption.updateMany({
        where: { purchaseId: purchase.id, status: "RESERVED" },
        data: { status: "RELEASED", releasedAt: now },
      });

    if (stateChanged)
      await writeAudit(
        {
          action: "PAYMENT_STATUS_CHANGED",
          targetUserId: purchase.userId,
          entityType: "Purchase",
          entityId: purchase.id,
          category: "PAYMENT",
          metadata: {
            purchaseId: purchase.id,
            fromStatus: purchase.status,
            toStatus: target,
            source: options.source,
          },
        },
        tx,
      );
    else if (progressChanged)
      await writeAudit(
        {
          action: "PAYMENT_PROGRESS_UPDATED",
          targetUserId: purchase.userId,
          entityType: "Purchase",
          entityId: purchase.id,
          category: "PAYMENT",
          metadata: {
            purchaseId: purchase.id,
            status: target,
            source: options.source,
          },
        },
        tx,
      );
    if (stateChanged && target === "PAID")
      await writeAudit(
        {
          action: "PURCHASE_GRANTED",
          targetUserId: purchase.userId,
          entityType: "Purchase",
          entityId: purchase.id,
          category: "ACCESS",
          metadata: { purchaseId: purchase.id, source: options.source },
        },
        tx,
      );
    if (stateChanged && target === "REFUNDED")
      await writeAudit(
        {
          action: "PURCHASE_REVOKED",
          targetUserId: purchase.userId,
          entityType: "Purchase",
          entityId: purchase.id,
          category: "ACCESS",
          metadata: { purchaseId: purchase.id, source: options.source },
        },
        tx,
      );
    if (stateChanged && target === "REFUNDED")
      await writeAudit(
        {
          action: "COURSE_ACCESS_REVOKED",
          targetUserId: purchase.userId,
          entityType: "Purchase",
          entityId: purchase.id,
          category: "ACCESS",
          metadata: { purchaseId: purchase.id, reason: "PURCHASE_REFUNDED" },
        },
        tx,
      );
    if (options.webhook)
      await tx.webhookEvent.update({
        where: { id: options.webhook.id },
        data: { processedAt: now },
      });

    return {
      duplicate: false,
      status: target,
      changed: stateChanged || progressChanged,
      email:
        stateChanged && target === "PAID" ? purchase.user.email : undefined,
      products:
        stateChanged && target === "PAID"
          ? purchase.items.map((item) => item.course.titleEn)
          : undefined,
    };
  });
}

async function sendConfirmation(result: ApplyResult) {
  if (
    !result.duplicate &&
    result.status === "PAID" &&
    env.EMAIL_ENABLED &&
    result.email &&
    result.products
  )
    try {
      await getEmailProvider().send({
        to: result.email,
        ...paymentConfirmedEmail(result.products),
      });
    } catch {}
}

export function paymentUpdateFingerprint(event: TrustedPaymentUpdate) {
  return createHash("sha256")
    .update(
      [
        event.purchaseId,
        event.providerPaymentId,
        event.status,
        event.providerStatus,
        event.expectedAmount,
        event.receivedAmount,
        event.payCurrency,
        event.network,
        event.paymentAddress,
        event.priceAmount,
        event.priceCurrency,
        event.transactionHash ?? "",
      ].join(":"),
    )
    .digest("hex");
}

export async function processPaymentEvent(
  providerName: string,
  event: VerifiedPaymentEvent,
  payload: string,
) {
  const hash = createHash("sha256").update(payload).digest("hex");
  let result: ApplyResult;
  try {
    result = await applyTrustedPaymentUpdate(providerName, event, {
      source: "WEBHOOK",
      eventId: event.eventId,
      payloadHash: hash,
      webhook: { id: event.eventId, provider: providerName, payloadHash: hash },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await db.webhookEvent.findUnique({
        where: { id: event.eventId },
      });
      if (existing?.provider === providerName && existing.payloadHash === hash)
        return { duplicate: true, status: null, changed: false };
    }
    throw error;
  }
  await sendConfirmation(result);
  return {
    duplicate: result.duplicate,
    status: result.status,
    changed: result.changed,
  };
}

export async function processReconciliationUpdate(
  providerName: string,
  event: ProviderPaymentStatus,
  attemptedAt: Date,
  nextReconcileAt: Date,
) {
  const hash = paymentUpdateFingerprint(event);
  const result = await applyTrustedPaymentUpdate(providerName, event, {
    source: "RECONCILIATION",
    eventId: `reconciliation:${hash}`,
    payloadHash: hash,
    reconciliation: { attemptedAt, nextReconcileAt },
  });
  await sendConfirmation(result);
  return { status: result.status, changed: result.changed };
}
