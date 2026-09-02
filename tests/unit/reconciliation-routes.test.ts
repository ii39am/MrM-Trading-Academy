import { beforeEach, describe, expect, it, vi } from "vitest";

const cron = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { PAYMENTS_ENABLED: true, CRON_SECRET: "0123456789abcdef0123456789abcdef" } }));
vi.mock("@/lib/payment-reconciliation", () => ({ runPaymentReconciliation: cron.run }));

import { POST as cronPost } from "@/app/api/internal/reconcile-payments/route";

describe("payment reconciliation cron route", () => {
  beforeEach(() => {
    cron.run.mockReset().mockResolvedValue({ scanned: 4, reconciled: 3, changed: 1, errors: 0 });
  });

  it("rejects a missing or invalid cron secret without running", async () => {
    expect((await cronPost(new Request("http://localhost/api/internal/reconcile-payments", { method: "POST" }))).status).toBe(401);
    expect((await cronPost(new Request("http://localhost/api/internal/reconcile-payments", { method: "POST", headers: { "x-cron-secret": "wrong-secret-that-is-long-enough-000" } }))).status).toBe(401);
    expect(cron.run).not.toHaveBeenCalled();
  });

  it("accepts the configured secret and returns safe statistics only", async () => {
    const response = await cronPost(new Request("http://localhost/api/internal/reconcile-payments", {
      method: "POST", headers: { "x-cron-secret": "0123456789abcdef0123456789abcdef" },
    }));
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ scanned: 4, reconciled: 3, changed: 1, errors: 0 });
    expect(body).not.toContain("0123456789abcdef");
  });
});
