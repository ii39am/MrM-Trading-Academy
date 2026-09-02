import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  processPaymentEvent,
  registerPaymentProvider,
  type PaymentProvider,
  type ProviderPaymentStatus,
  type VerifiedPaymentEvent,
} from "@/lib/payment";
import { reconcilePurchase } from "@/lib/payment-reconciliation";
import { NowPaymentsHttpError } from "@/lib/providers/nowpayments-client";
import { NowPaymentsProviderError } from "@/lib/providers/nowpayments";

const suffix = randomUUID();
const userId = `reconcile-user-${suffix}`;
const courseId = `reconcile-course-${suffix}`;
const address = `T${"A".repeat(33)}`;
const getPaymentStatus = vi.fn<(id: string) => Promise<ProviderPaymentStatus>>();
const provider: PaymentProvider = {
  name: "nowpayments",
  getPaymentStatus,
  createCheckout: vi.fn(() => Promise.reject(new Error("not used"))),
  verifyWebhook: vi.fn(() => Promise.reject(new Error("not used"))),
};

beforeAll(async () => {
  const email = `${userId}@example.test`;
  await db.user.create({ data: { id: userId, name: "Reconcile", email, normalizedEmail: email, emailVerifiedAt: new Date(), status: "ACTIVE", passwordHash: "x" } });
  await db.course.create({ data: {
    id: courseId, slug: courseId, titleEn: "Reconcile", titleAr: "تسوية", shortDescriptionEn: "Test reconciliation",
    shortDescriptionAr: "اختبار التسوية", fullDescriptionEn: "Reconciliation test product.", fullDescriptionAr: "منتج لاختبار التسوية.",
    instructor: "Test", priceCents: 1000, image: "https://example.test/reconcile.jpg", accent: "#000000",
    telegramAccessUrl: "https://t.me/test", status: "PUBLISHED", publishedAt: new Date(),
  } });
});
beforeEach(async () => {
  registerPaymentProvider(provider);
  getPaymentStatus.mockReset();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  await db.enrollment.deleteMany({ where: { userId } });
  await db.purchase.deleteMany({ where: { userId } });
});
afterAll(async () => {
  await db.enrollment.deleteMany({ where: { userId } });
  await db.purchase.deleteMany({ where: { userId } });
  await db.course.delete({ where: { id: courseId } });
  await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
});

async function purchase(status: "PENDING" | "PAID" | "EXPIRED" | "REFUNDED" = "PENDING") {
  const id = `reconcile-${randomUUID()}`;
  return db.purchase.create({ data: {
    id, userId, provider: "nowpayments", providerSessionId: `session-${id}`, providerPaymentId: `provider-${id}`,
    status, amountCents: 1000, currency: "USD", expectedAmount: "10", receivedAmount: status === "PENDING" ? null : "10",
    payCurrency: "usdttrc20", network: "TRC20", paymentAddress: address,
    items: { create: { courseId, priceCents: 1000 } },
  } });
}
function status(value: Awaited<ReturnType<typeof purchase>>, overrides: Partial<ProviderPaymentStatus> = {}): ProviderPaymentStatus {
  return {
    purchaseId: value.id, providerPaymentId: `provider-${value.id}`, status: "PAID", providerStatus: "finished",
    expectedAmount: "10", receivedAmount: "10", payCurrency: "usdttrc20", network: "TRC20", paymentAddress: address,
    priceAmount: "10", priceCurrency: "USD", transactionHash: "tron-hash", ...overrides,
  };
}
function webhook(value: Awaited<ReturnType<typeof purchase>>, overrides: Partial<VerifiedPaymentEvent> = {}): VerifiedPaymentEvent {
  return { ...status(value), eventId: `webhook-${randomUUID()}`, raw: {}, ...overrides };
}

describe("payment reconciliation", () => {
  it("recovers a finished payment when the webhook was missed and grants exactly one enrollment", async () => {
    const value = await purchase();
    getPaymentStatus.mockResolvedValue(status(value));
    await expect(reconcilePurchase(value.id)).resolves.toMatchObject({ status: "PAID", changed: true });
    expect((await db.purchase.findUniqueOrThrow({ where: { id: value.id } })).status).toBe("PAID");
    expect(await db.enrollment.count({ where: { userId, courseId } })).toBe(1);
    expect(await db.paymentTransaction.count({ where: { purchaseId: value.id, source: "RECONCILIATION" } })).toBe(1);
  });

  it("keeps a delayed webhook idempotent after reconciliation", async () => {
    const value = await purchase();
    getPaymentStatus.mockResolvedValue(status(value));
    await reconcilePurchase(value.id);
    await processPaymentEvent("nowpayments", webhook(value), "delayed-webhook");
    expect(await db.enrollment.count({ where: { userId, courseId } })).toBe(1);
    expect(await db.paymentTransaction.count({ where: { purchaseId: value.id } })).toBe(1);
  });

  it("does not duplicate side effects when webhook processing happens first", async () => {
    const value = await purchase();
    await processPaymentEvent("nowpayments", webhook(value), "webhook-first");
    getPaymentStatus.mockResolvedValue(status(value));
    await reconcilePurchase(value.id);
    expect(await db.enrollment.count({ where: { userId, courseId } })).toBe(1);
    expect(await db.paymentTransaction.count({ where: { purchaseId: value.id } })).toBe(1);
  });

  it("is idempotent when repeated and when run concurrently", async () => {
    const value = await purchase();
    getPaymentStatus.mockResolvedValue(status(value));
    await Promise.all([reconcilePurchase(value.id), reconcilePurchase(value.id)]);
    await reconcilePurchase(value.id);
    expect(await db.enrollment.count({ where: { userId, courseId } })).toBe(1);
    expect(await db.paymentTransaction.count({ where: { purchaseId: value.id } })).toBe(1);
  });

  it("keeps partial payment pending and stores only monotonic received progress", async () => {
    const value = await purchase();
    getPaymentStatus.mockResolvedValueOnce(status(value, { status: "PENDING", providerStatus: "partially_paid", receivedAmount: "4" }));
    await reconcilePurchase(value.id);
    getPaymentStatus.mockResolvedValueOnce(status(value, { status: "PENDING", providerStatus: "partially_paid", receivedAmount: "7" }));
    await reconcilePurchase(value.id);
    getPaymentStatus.mockResolvedValueOnce(status(value, { status: "PENDING", providerStatus: "confirming", receivedAmount: "5" }));
    await reconcilePurchase(value.id);
    const stored = await db.purchase.findUniqueOrThrow({ where: { id: value.id } });
    expect(stored.status).toBe("PENDING");
    expect(stored.receivedAmount?.toString()).toBe("7");
    expect(await db.enrollment.count({ where: { userId, courseId } })).toBe(0);
  });

  it("allows a fully verified late EXPIRED to PAID settlement", async () => {
    const value = await purchase("EXPIRED");
    getPaymentStatus.mockResolvedValue(status(value));
    await reconcilePurchase(value.id);
    expect((await db.purchase.findUniqueOrThrow({ where: { id: value.id } })).status).toBe("PAID");
    expect(await db.enrollment.count({ where: { userId, courseId } })).toBe(1);
  });

  it("never downgrades PAID when the provider unexpectedly returns waiting", async () => {
    const value = await purchase("PAID");
    getPaymentStatus.mockResolvedValue(status(value, { status: "PENDING", providerStatus: "waiting", receivedAmount: "0" }));
    await expect(reconcilePurchase(value.id)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect((await db.purchase.findUniqueOrThrow({ where: { id: value.id } })).status).toBe("PAID");
  });

  it("processes a refund through the same path and does not re-grant access", async () => {
    const value = await purchase();
    getPaymentStatus.mockResolvedValueOnce(status(value));
    await reconcilePurchase(value.id);
    getPaymentStatus.mockResolvedValueOnce(status(value, { status: "REFUNDED", providerStatus: "refunded" }));
    await reconcilePurchase(value.id);
    expect((await db.purchase.findUniqueOrThrow({ where: { id: value.id } })).status).toBe("REFUNDED");
    expect(await db.enrollment.count({ where: { userId, courseId } })).toBe(0);
    getPaymentStatus.mockResolvedValueOnce(status(value));
    await expect(reconcilePurchase(value.id)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(await db.enrollment.count({ where: { userId, courseId } })).toBe(0);
  });

  it.each([
    ["payment ID", { providerPaymentId: "other" }],
    ["order ID", { purchaseId: "other" }],
    ["currency", { payCurrency: "usdterc20" }],
    ["network", { network: "ERC20" }],
    ["payment address", { paymentAddress: `T${"B".repeat(33)}` }],
  ] as const)("rejects wrong %s binding", async (_, overrides) => {
    const value = await purchase();
    getPaymentStatus.mockResolvedValue(status(value, overrides));
    await expect(reconcilePurchase(value.id)).rejects.toMatchObject({ code: "BINDING_MISMATCH" });
    expect((await db.purchase.findUniqueOrThrow({ where: { id: value.id } })).status).toBe("PENDING");
  });

  it.each([
    ["timeout", new NowPaymentsHttpError("TIMEOUT"), "PROVIDER_TIMEOUT"],
    ["429", new NowPaymentsHttpError("HTTP_4XX", 429), "PROVIDER_RATE_LIMITED"],
    ["500", new NowPaymentsHttpError("HTTP_5XX", 500), "PROVIDER_UNAVAILABLE"],
    ["malformed response", new NowPaymentsProviderError("INVALID_RESPONSE"), "PROVIDER_INVALID_RESPONSE"],
  ] as const)("leaves state unchanged after provider %s", async (_, providerError, expectedCode) => {
    const value = await purchase();
    getPaymentStatus.mockRejectedValue(providerError);
    await expect(reconcilePurchase(value.id)).rejects.toMatchObject({ code: expectedCode });
    const stored = await db.purchase.findUniqueOrThrow({ where: { id: value.id } });
    expect(stored.status).toBe("PENDING");
    expect(stored.reconciliationErrorCode).toBe(expectedCode);
  });
});
