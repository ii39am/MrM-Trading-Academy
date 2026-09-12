// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL() { return "blob:preview"; }
    static revokeObjectURL() {}
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

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
    expect(screen.queryByRole("textbox", { name: /image/i })).toBeNull();
    expect(screen.queryByText("Product image URL")).toBeNull();
    expect(screen.getByAltText("Product image preview").getAttribute("src")).toBe(product.image);
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

it("replaces an image through upload and sends its generated URL to the product save API", async () => {
  const url = "https://academy.example.test/media/products/12345678-1234-4234-8234-123456789abc.webp";
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ url }), { status: 201 })).mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));
  const user = userEvent.setup(); render(<AdminProductForm products={[product]} locale="en" />);
  await user.upload(screen.getByLabelText(/Product image/), new File(["fixture"], "new.png", { type: "image/png" }));
  await waitFor(() => expect(screen.getByAltText("Product image preview").getAttribute("src")).toBe(url));
  await user.click(screen.getByRole("button", { name: "Save product" }));
  expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/admin/uploads/product-image");
  expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body)).image).toBe(url);
});

it("removes only the draft image and requires a replacement before saving", async () => {
  const user = userEvent.setup(); render(<AdminProductForm products={[product]} locale="en" />);
  await user.click(screen.getByRole("button", { name: "Remove image" }));
  expect(screen.queryByAltText("Product image preview")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Save product" }));
  expect(fetch).not.toHaveBeenCalled(); expect(screen.getByRole("button", { name: "Choose image" })).toBeTruthy();
});

it("shows upload progress, disables save, and retains the original image after failure", async () => {
  let finish!: (response: Response) => void;
  vi.mocked(fetch).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const user = userEvent.setup(); render(<AdminProductForm products={[product]} locale="en" />);
  await user.upload(screen.getByLabelText(/Product image/), new File(["fixture"], "new.png", { type: "image/png" }));
  expect((screen.getByRole("button", { name: "Save product" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("Validating and uploading image…")).toBeTruthy();
  finish(new Response(JSON.stringify({ error: { code: "UPLOAD_UNAVAILABLE", message: "internal path must not display" } }), { status: 503 }));
  await screen.findByText("Image upload failed. Please try again.");
  expect(screen.getByAltText("Product image preview").getAttribute("src")).toBe(product.image);
  expect(screen.queryByText(/internal path/)).toBeNull();
});

it.each([
  [new File(["bad"], "bad.svg", { type: "image/svg+xml" }), "Choose a valid"],
  [new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }), "no larger than 5 MB"],
])("validates selected files before uploading", async (file, expected) => {
  render(<AdminProductForm products={[product]} locale="en" />);
  fireEvent.change(screen.getByLabelText(/Product image/), { target: { files: [file] } });
  expect(await screen.findByText(new RegExp(expected))).toBeTruthy(); expect(fetch).not.toHaveBeenCalled();
});
