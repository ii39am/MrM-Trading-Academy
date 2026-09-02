import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  redemptionUpdate: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    purchase: { findMany: mocks.findMany },
    couponRedemption: { updateMany: mocks.redemptionUpdate },
  },
}));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn() }));
vi.mock("@/lib/payment", () => ({
  getPaymentProvider: vi.fn(),
  processReconciliationUpdate: vi.fn(),
  PaymentProcessingError: class extends Error {},
}));

import {
  RECONCILIATION_MAX_BATCH_LIMIT,
  runPaymentReconciliation,
} from "@/lib/payment-reconciliation";

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.redemptionUpdate.mockReset().mockResolvedValue({ count: 0 });
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

describe("reconciliation batch runner", () => {
  it("uses a bounded deterministic scan and excludes terminal states", async () => {
    mocks.findMany.mockResolvedValue([]);
    await runPaymentReconciliation({ limit: 999, now: new Date("2026-09-01T12:00:00Z") });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: RECONCILIATION_MAX_BATCH_LIMIT,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      where: expect.objectContaining({ status: { in: ["PENDING", "EXPIRED"] }, providerPaymentId: { not: null } }),
    }));
  });

  it("continues after one candidate fails and returns safe statistics", async () => {
    mocks.findMany.mockResolvedValue([{ id: "one" }, { id: "two" }, { id: "three" }]);
    const reconcile = vi.fn()
      .mockRejectedValueOnce(new Error("provider failed with private-key"))
      .mockResolvedValueOnce({ changed: true, status: "PAID" })
      .mockResolvedValueOnce({ changed: false, status: "PENDING" });
    await expect(runPaymentReconciliation({ reconcile })).resolves.toEqual({ scanned: 3, reconciled: 3, changed: 1, errors: 1 });
    expect(reconcile).toHaveBeenCalledTimes(3);
  });

  it("releases only explicitly expired coupon reservations", async () => {
    mocks.findMany.mockResolvedValue([]);
    const now = new Date("2026-09-01T12:00:00Z");
    await runPaymentReconciliation({ now });
    expect(mocks.redemptionUpdate).toHaveBeenCalledWith({
      where: { status: "RESERVED", expiresAt: { lte: now } },
      data: { status: "RELEASED", releasedAt: now },
    });
  });
});
