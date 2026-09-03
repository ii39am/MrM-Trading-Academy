// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

import { AdminProductForm } from "@/components/admin-product-form";

const product = {
  id: "course-1",
  slug: "price-action-foundations",
  titleEn: "Price Action Foundations",
  titleAr: "أساسيات حركة السعر",
  shortDescriptionEn: "A structured introduction to reading price action.",
  shortDescriptionAr: "مقدمة منظمة تساعدك على فهم حركة السعر بوضوح.",
  fullDescriptionEn: "A complete and structured course for understanding price action responsibly.",
  fullDescriptionAr: "دورة كاملة ومنظمة لفهم حركة السعر وتطبيق المفاهيم بمسؤولية.",
  instructor: "Mr.ME",
  priceCents: 9925,
  currency: "USD",
  image: "https://example.com/course.jpg",
  accent: "#7C3AED",
  status: "PUBLISHED",
  publishedAt: "2026-09-01T00:00:00.000Z",
  telegramChatId: "-1001234567890",
  telegramAccessEnabled: true,
  telegramButtonLabelEn: "Access Course",
  telegramButtonLabelAr: "دخول الدورة",
};

beforeEach(() => {
  navigation.refresh.mockReset();
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => cleanup());

describe("admin product editor", () => {
  it("renders structured, human-readable English fields and the live preview", () => {
    render(<AdminProductForm products={[product]} locale="en" />);
    expect(screen.getByRole("heading", { name: "Products" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Basic information" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Telegram fulfillment" })).toBeTruthy();
    expect((screen.getByLabelText(/English title/) as HTMLInputElement).value).toBe(product.titleEn);
    expect((screen.getByRole("textbox", { name: /Price/ }) as HTMLInputElement).value).toBe("99.25");
    expect(screen.getAllByText("$99.25")).toHaveLength(2);
    expect(screen.queryByText("titleEn")).toBeNull();
    expect(screen.queryByText("priceCents")).toBeNull();
  });

  it("renders natural Arabic labels in an RTL editor", () => {
    const { container } = render(<AdminProductForm products={[product]} locale="ar" />);
    expect(container.firstElementChild?.getAttribute("dir")).toBe("rtl");
    expect(screen.getByRole("heading", { name: "المنتجات" })).toBeTruthy();
    expect((screen.getByLabelText(/العنوان بالعربية/) as HTMLInputElement).value).toBe(product.titleAr);
    expect(screen.getByRole("heading", { name: "الوصول عبر Telegram" })).toBeTruthy();
    expect(screen.getByText(/رمز البوت محفوظ في إعدادات الخادم فقط/)).toBeTruthy();
  });

  it("shows inline validation and does not call the API for an invalid new product", async () => {
    const user = userEvent.setup();
    render(<AdminProductForm products={[]} locale="en" />);
    await user.click(screen.getByRole("button", { name: "Save product" }));
    expect((await screen.findByRole("alert")).textContent).toContain("could not be saved");
    expect(screen.getAllByText("Please review this field.").length).toBeGreaterThan(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("saves through the existing API contract with a cents price", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const user = userEvent.setup();
    render(<AdminProductForm products={[product]} locale="en" />);
    await user.clear(screen.getByLabelText(/English title/));
    await user.type(screen.getByLabelText(/English title/), "Advanced Price Action");
    await user.click(screen.getByRole("button", { name: "Save product" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/admin/products/course-1");
    expect(options?.method).toBe("PATCH");
    expect(JSON.parse(String(options?.body))).toMatchObject({
      titleEn: "Advanced Price Action",
      priceCents: 9925,
      currency: "USD",
      telegramChatId: "-1001234567890",
      telegramAccessEnabled: true,
      published: true,
    });
    expect(await screen.findByText("Product saved successfully.")).toBeTruthy();
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });

  it("provides accessible Telegram and publishing switches", async () => {
    const user = userEvent.setup();
    render(<AdminProductForm products={[{ ...product, telegramAccessEnabled: false, status: "DRAFT", publishedAt: null }]} locale="en" />);
    const telegram = screen.getByRole("checkbox", { name: /Enable secure Telegram access/ });
    const publishing = screen.getByRole("checkbox", { name: /Publish product/ });
    expect((telegram as HTMLInputElement).checked).toBe(false);
    expect((publishing as HTMLInputElement).checked).toBe(false);
    await user.click(telegram);
    await user.click(publishing);
    expect((telegram as HTMLInputElement).checked).toBe(true);
    expect((publishing as HTMLInputElement).checked).toBe(true);
  });
});
