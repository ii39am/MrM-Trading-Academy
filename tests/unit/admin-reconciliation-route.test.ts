import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  reconcile: vi.fn(),
  audit: vi.fn(),
  sameOrigin: vi.fn(),
  rate: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.user }));
vi.mock("@/lib/admin", () => ({ isAdmin: (user: { role?: string; status?: string } | null) => user?.role === "ADMIN" && user.status === "ACTIVE" }));
vi.mock("@/lib/payment-reconciliation", () => ({ reconcilePurchase: mocks.reconcile }));
vi.mock("@/lib/audit", () => ({ writeAudit: mocks.audit }));
vi.mock("@/lib/security", async () => {
  const actual = await vi.importActual<typeof import("@/lib/security")>("@/lib/security");
  return {
    ...actual,
    verifySameOrigin: mocks.sameOrigin,
    enforceRateLimit: mocks.rate,
    clientKey: () => "safe-rate-key",
  };
});

import { POST } from "@/app/api/admin/purchases/[id]/reconcile/route";

const request = () => new Request("http://localhost:3000/api/admin/purchases/purchase-1/reconcile", {
  method: "POST", headers: { origin: "http://localhost:3000" },
});
const params = { params: Promise.resolve({ id: "purchase-1" }) };

beforeEach(() => {
  mocks.sameOrigin.mockReturnValue(true);
  mocks.rate.mockResolvedValue({ allowed: true, retryAfter: 0 });
  mocks.audit.mockResolvedValue({});
  mocks.reconcile.mockResolvedValue({ changed: true, status: "PAID" });
});

describe("manual admin payment reconciliation", () => {
  it("rejects non-admin and cross-origin requests", async () => {
    mocks.user.mockResolvedValue({ id: "student", role: "STUDENT", status: "ACTIVE" });
    expect((await POST(request(), params)).status).toBe(403);
    mocks.sameOrigin.mockReturnValue(false);
    expect((await POST(request(), params)).status).toBe(403);
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });

  it("allows an active admin to reconcile only the internal purchase ID", async () => {
    mocks.user.mockResolvedValue({ id: "admin", role: "ADMIN", status: "ACTIVE" });
    const response = await POST(request(), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, changed: true, status: "PAID" });
    expect(mocks.reconcile).toHaveBeenCalledWith("purchase-1");
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "PAYMENT_RECONCILIATION_REQUESTED", entityId: "purchase-1" }));
  });
});
