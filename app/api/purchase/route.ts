import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payment";
import { db } from "@/lib/db";
import { errorResponse, verifySameOrigin } from "@/lib/security";
import { env } from "@/lib/env";
import { createReservedPurchase } from "@/lib/coupons";
import { writeAudit } from "@/lib/audit";

const schema = z
  .object({
    courseIds: z.array(z.string().min(1).max(100)).min(1).max(10),
    couponCode: z.string().trim().min(1).max(40).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.courseIds).size !== value.courseIds.length)
      ctx.addIssue({
        code: "custom",
        path: ["courseIds"],
        message: "Course IDs must be unique",
      });
  });

async function failPurchase(purchaseId: string, providerStatus: string) {
  const now = new Date();
  await db.$transaction([
    db.purchase.update({
      where: { id: purchaseId },
      data: { status: "FAILED", providerStatus },
    }),
    db.couponRedemption.updateMany({
      where: { purchaseId, status: "RESERVED" },
      data: { status: "RELEASED", releasedAt: now },
    }),
  ]);
}

export async function POST(request: Request) {
  if (!verifySameOrigin(request))
    return errorResponse("CSRF_REJECTED", "Request origin rejected", 403);
  const user = await getSessionUser();
  if (!user)
    return errorResponse("UNAUTHORIZED", "Authentication required", 401);
  if (!user.emailVerified)
    return errorResponse(
      "EMAIL_VERIFICATION_REQUIRED",
      "Please verify your email address before completing your purchase.",
      403,
    );
  if (!env.PAYMENTS_ENABLED)
    return errorResponse(
      "PAYMENT_UNAVAILABLE",
      "Payments are temporarily unavailable.",
      503,
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return errorResponse("INVALID_INPUT", "Invalid checkout request", 400);

  const ids = parsed.data.courseIds;
  const provider = getPaymentProvider();
  let purchase;
  try {
    purchase = await createReservedPurchase({
      userId: user.id,
      courseIds: ids,
      couponCode: parsed.data.couponCode,
      provider: provider.name,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "CHECKOUT_FAILED";
    const clientCodes = new Set([
      "INVALID_COURSE",
      "INVALID_CURRENCY",
      "ALREADY_OWNED",
      "INVALID_COUPON",
      "COUPON_NOT_ELIGIBLE",
      "COUPON_USAGE_LIMIT",
      "COUPON_USER_LIMIT",
      "MINIMUM_ORDER_NOT_MET",
      "COUPON_CURRENCY_MISMATCH",
      "ZERO_VALUE_CHECKOUT_UNSUPPORTED",
    ]);
    return errorResponse(
      clientCodes.has(code) ? code : "CHECKOUT_CONFLICT",
      "Checkout could not be created",
      clientCodes.has(code) ? 409 : 503,
    );
  }

  let checkout: Awaited<ReturnType<typeof provider.createCheckout>>;
  try {
    await writeAudit({
      action: "PAYMENT_CREATED",
      actorId: user.id,
      actorRole: user.role,
      targetUserId: user.id,
      entityType: "Purchase",
      entityId: purchase.id,
      category: "PAYMENT",
      metadata: {
        purchaseId: purchase.id,
        amountCents: purchase.amountCents,
        discountAmountCents: purchase.discountAmountCents,
        currency: purchase.currency,
      },
      request,
    });
    checkout = await provider.createCheckout({
      purchaseId: purchase.id,
      userId: user.id,
      courseIds: ids,
      amountCents: purchase.amountCents,
    });
    if (checkout.purchaseId !== purchase.id)
      throw new Error("Provider purchase binding mismatch");
  } catch {
    try {
      await failPurchase(purchase.id, "payment_creation_error");
    } catch {
      console.error(
        JSON.stringify({
          level: "error",
          event: "payment_checkout_failure_persistence_failed",
          purchaseId: purchase.id,
        }),
      );
    }
    return errorResponse(
      "PAYMENT_UNAVAILABLE",
      "Payments are unavailable",
      503,
    );
  }

  const providerData = {
    provider: provider.name,
    providerSessionId: checkout.id,
    providerPaymentId: checkout.id,
    expectedAmount: checkout.payAmount,
    payCurrency: checkout.payCurrency,
    network: checkout.network,
    paymentAddress: checkout.payAddress,
    expiresAt: checkout.expiresAt ? new Date(checkout.expiresAt) : null,
  };
  try {
    await db.purchase.update({
      where: { id: purchase.id },
      data: {
        ...providerData,
        providerStatus: checkout.providerStatus,
        nextReconcileAt: new Date(),
      },
    });
    return Response.json(
      {
        ...checkout,
        originalAmountCents: purchase.originalAmountCents,
        discountAmountCents: purchase.discountAmountCents,
        finalAmountCents: purchase.amountCents,
      },
      { status: 201 },
    );
  } catch {
    console.error(
      JSON.stringify({
        level: "error",
        event: "payment_checkout_persistence_failed",
        purchaseId: purchase.id,
        providerPaymentId: checkout.id,
      }),
    );
    try {
      await db.purchase.update({
        where: { id: purchase.id },
        data: {
          ...providerData,
          status: "PENDING",
          providerStatus: "persistence_recovery_pending",
          nextReconcileAt: new Date(),
          reconciliationErrorCode: "LOCAL_PERSISTENCE_FAILED",
        },
      });
    } catch {
      console.error(
        JSON.stringify({
          level: "error",
          event: "payment_checkout_recovery_persistence_failed",
          purchaseId: purchase.id,
          providerPaymentId: checkout.id,
        }),
      );
    }
    return errorResponse(
      "PAYMENT_UNAVAILABLE",
      "Payments are unavailable",
      503,
    );
  }
}
