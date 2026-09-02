import { env } from "@/lib/env";
import { runPaymentReconciliation } from "@/lib/payment-reconciliation";
import { errorResponse } from "@/lib/security";
import { secureSecretEqual } from "@/lib/secret-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!env.PAYMENTS_ENABLED)
    return errorResponse(
      "RECONCILIATION_DISABLED",
      "Payment reconciliation is not configured",
      503,
    );
  if (!env.CRON_SECRET)
    return errorResponse(
      "RECONCILIATION_DISABLED",
      "Payment reconciliation is not configured",
      503,
    );
  if (!secureSecretEqual(request.headers.get("x-cron-secret"), env.CRON_SECRET))
    return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  const stats = await runPaymentReconciliation();
  return Response.json(stats, { headers: { "Cache-Control": "no-store" } });
}
