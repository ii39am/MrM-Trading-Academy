import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { writeAudit } from "@/lib/audit";
import { reconcilePurchase } from "@/lib/payment-reconciliation";
import {
  clientKey,
  enforceRateLimit,
  errorResponse,
  rateLimited,
  verifySameOrigin,
} from "@/lib/security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifySameOrigin(request))
    return errorResponse("CSRF_REJECTED", "Request origin rejected", 403);
  const actor = await getSessionUser();
  if (!isAdmin(actor))
    return errorResponse("FORBIDDEN", "Insufficient permission", 403);
  const rate = await enforceRateLimit(
    clientKey(request, `admin-payment-reconcile:${actor.id}`),
    10,
    15 * 60_000,
  );
  if (!rate.allowed) return rateLimited(rate.retryAfter);
  const purchaseId = (await params).id;
  await writeAudit({
    action: "PAYMENT_RECONCILIATION_REQUESTED",
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "Purchase",
    entityId: purchaseId,
    category: "PAYMENT",
    metadata: { purchaseId, source: "RECONCILIATION" },
    request,
  });
  try {
    const result = await reconcilePurchase(purchaseId);
    await writeAudit({
      action: "ADMIN_PAYMENT_RECONCILED",
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "Purchase",
      entityId: purchaseId,
      category: "PAYMENT",
      metadata: { purchaseId, source: "RECONCILIATION", status: result.status },
      request,
    });
    return Response.json({
      ok: true,
      changed: result.changed,
      status: result.status,
    });
  } catch {
    return errorResponse(
      "RECONCILIATION_FAILED",
      "Payment reconciliation failed",
      409,
    );
  }
}
