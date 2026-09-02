// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutClient } from "@/components/checkout-client";
import { PurchaseButton } from "@/components/purchase-button";
import type { CheckoutPurchase } from "@/lib/checkout-ui";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement("span", { "data-testid": "course-image", "data-src": props.src }),
}));

const address = "TXyzExampleTronAddress1234567890123";
const basePurchase: CheckoutPurchase = {
  id: "purchase-1",
  status: "PENDING",
  originalAmountCents: 12_000,
  discountAmountCents: 2_100,
  amountCents: 9_900,
  currency: "USD",
  expectedAmount: "99.327481",
  receivedAmount: null,
  payCurrency: "usdttrc20",
  network: "TRC20",
  paymentAddress: address,
  providerStatus: "waiting",
  expiresAt: "2030-01-01T00:15:00.000Z",
  transactionHash: null,
  paidAt: null,
  createdAt: "2030-01-01T00:00:00.000Z",
  updatedAt: "2030-01-01T00:00:00.000Z",
  items: [{ course: { slug: "test-course", titleEn: "Test Course", titleAr: "دورة اختبار", image: "/course.jpg" } }],
};

function response(purchase: CheckoutPurchase, status = 200) {
  return Promise.resolve(new Response(JSON.stringify({ purchase }), { status, headers: { "Content-Type": "application/json" } }));
}
function mockPurchase(overrides: Partial<CheckoutPurchase> = {}) {
  const purchase = { ...basePurchase, ...overrides };
  vi.mocked(fetch).mockImplementation(() => response(purchase));
  return purchase;
}
async function renderCheckout(overrides: Partial<CheckoutPurchase> = {}, locale: "en" | "ar" = "en") {
  const purchase = mockPurchase(overrides);
  const view = render(<CheckoutClient purchaseId={purchase.id} locale={locale} />);
  await screen.findByRole("heading", { name: locale === "ar" ? purchase.items[0].course.titleAr : purchase.items[0].course.titleEn, level: 1 });
  return view;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  push.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("purchase creation UI", () => {
  it("disables submission and navigates to the recoverable checkout route", async () => {
    let finish!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<PurchaseButton courseId="course-1" locale="en" />);
    const button = screen.getByRole("button", { name: "Continue to secure payment" });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(1);
    finish(new Response(JSON.stringify({ purchaseId: "purchase-1" }), { status: 200 }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout/purchase-1"));
  });

  it("renders a safe known backend error", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: { code: "PAYMENT_UNAVAILABLE" } }), { status: 503 }));
    render(<PurchaseButton courseId="course-1" locale="en" />);
    await userEvent.click(screen.getByRole("button", { name: "Continue to secure payment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Payments are temporarily unavailable.");
  });
});

describe("checkout status UI", () => {
  it("restores exact trusted payment details and generates the QR locally", async () => {
    const { container } = await renderCheckout();
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "99.327481 USDT")).toBeInTheDocument();
    expect(screen.getByText(address)).toBeInTheDocument();
    expect(screen.getAllByText("TRON (TRC20)").length).toBeGreaterThan(0);
    expect(screen.getByText(/Sending funds using another network may result in permanent loss/)).toBeInTheDocument();
    expect(container.querySelector("svg title")?.textContent).toBe("QR code containing the exact payment address");
    expect(fetch).toHaveBeenCalledWith("/api/purchases/purchase-1", expect.objectContaining({ cache: "no-store" }));
  });

  it.each([
    ["waiting", "Waiting for payment"],
    ["confirming", "Payment detected. Waiting for blockchain confirmations."],
    ["confirmed", "Payment confirmed on the network. Finalizing your order."],
    ["sending", "Payment confirmed. Finalizing settlement."],
  ])("shows %s without prematurely showing success", async (providerStatus, message) => {
    await renderCheckout({ providerStatus });
    expect(screen.getByRole("heading", { name: message, level: 2 })).toBeInTheDocument();
    expect(screen.queryByText("Payment successful")).not.toBeInTheDocument();
    expect(screen.queryByText(/Telegram/i)).not.toBeInTheDocument();
  });

  it("shows partial amounts without granting success", async () => {
    await renderCheckout({ providerStatus: "partially_paid", receivedAmount: "12.5" });
    expect(screen.getByRole("heading", { name: "Partial payment received", level: 2 })).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === "STRONG" && element.textContent === "12.5 USDT")).toBeInTheDocument();
    expect(screen.getAllByText((_, element) => element?.tagName === "STRONG" && element.textContent === "99.327481 USDT").length).toBeGreaterThan(0);
    expect(screen.queryByText("Payment successful")).not.toBeInTheDocument();
  });

  it.each([
    ["EXPIRED", "Payment expired"],
    ["FAILED", "Payment failed"],
    ["REFUNDED", "Payment refunded"],
    ["CANCELLED", "Payment cancelled"],
  ] as const)("renders terminal %s state", async (status, message) => {
    await renderCheckout({ status, providerStatus: status.toLowerCase() });
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("shows success only for backend PAID and never shows Telegram", async () => {
    await renderCheckout({ status: "PAID", providerStatus: "finished", paidAt: "2030-01-01T00:10:00.000Z", transactionHash: "abcdef1234567890abcdef1234567890" });
    expect(screen.getByText("Payment successful")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to My Courses" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByText(/Telegram/i)).not.toBeInTheDocument();
  });

  it("copies the exact amount and address", async () => {
    await renderCheckout();
    await userEvent.click(screen.getByRole("button", { name: "Copy amount" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy address" }));
    expect(navigator.clipboard.writeText).toHaveBeenNthCalledWith(1, "99.327481");
    expect(navigator.clipboard.writeText).toHaveBeenNthCalledWith(2, address);
  });

  it("renders professional Arabic strings", async () => {
    await renderCheckout({}, "ar");
    expect(screen.getByText("بانتظار الدفع")).toBeInTheDocument();
    expect(screen.getByText("المبلغ المطلوب")).toBeInTheDocument();
    expect(screen.getAllByText("شبكة TRON ‏(TRC20)").length).toBeGreaterThan(0);
  });

  it("shows the server expiration countdown without changing status locally", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
    mockPurchase({ expiresAt: "2030-01-01T00:15:00.000Z" });
    render(<CheckoutClient purchaseId="purchase-1" locale="en" />);
    await act(async () => {});
    expect(screen.getByText("Payment expires in 15:00")).toBeInTheDocument();
    act(() => vi.setSystemTime(new Date("2030-01-01T00:16:00.000Z")));
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText("Checking payment status...")).toBeInTheDocument();
    expect(screen.getByText("Waiting for payment")).toBeInTheDocument();
    await act(async () => {});
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each(["PAID", "FAILED", "EXPIRED", "REFUNDED", "CANCELLED"] as const)(
    "stops polling after terminal status %s",
    async (status) => {
      vi.useFakeTimers();
      mockPurchase({ status, providerStatus: status === "PAID" ? "finished" : status.toLowerCase() });
      render(<CheckoutClient purchaseId="purchase-1" locale="en" />);
      await act(async () => {});
      expect(fetch).toHaveBeenCalledTimes(1);
      await act(async () => { vi.advanceTimersByTime(30_000); });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it("retries a temporary refresh failure without showing payment failure", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockImplementation(() => response(basePurchase));
    render(<CheckoutClient purchaseId="purchase-1" locale="en" />);
    await act(async () => {});
    expect(screen.getByText("Unable to refresh payment status. Retrying...")).toBeInTheDocument();
    expect(screen.queryByText("Payment failed")).not.toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(5_000); });
    expect(screen.getByText("Waiting for payment")).toBeInTheDocument();
  });

  it("does not render an unauthorized or foreign purchase", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: { code: "NOT_FOUND" } }), { status: 404 }));
    render(<CheckoutClient purchaseId="foreign-id" locale="en" />);
    expect(await screen.findByText("This purchase could not be displayed.")).toBeInTheDocument();
    expect(screen.queryByText(address)).not.toBeInTheDocument();
  });

  it("contains no provider secrets in client output", async () => {
    const { container } = await renderCheckout();
    expect(container.textContent).not.toMatch(/api[_ -]?key|ipn[_ -]?secret|NOWPAYMENTS_/i);
  });
});
