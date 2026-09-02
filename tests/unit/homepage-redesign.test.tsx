import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), locale: vi.fn() }));
vi.mock("@/lib/course-repository", () => ({ courseRepository: { list: mocks.list } }));
vi.mock("@/lib/i18n", async () => {
  const actual = await vi.importActual<typeof import("@/lib/i18n")>("@/lib/i18n");
  return { ...actual, getLocale: mocks.locale };
});

import Home from "@/app/page";
import { BrandLogo } from "@/components/brand-logo";
import { EducationChart, HeroTradingVisual, InstrumentCards } from "@/components/trading-visuals";

const course = {
  id: "course-internal-id",
  slug: "price-action-foundations",
  titleEn: "Price Action Foundations",
  titleAr: "أساسيات حركة السعر",
  shortDescriptionEn: "A structured foundation for reading market movement responsibly.",
  shortDescriptionAr: "أساس منظم لقراءة حركة السوق بمسؤولية.",
  fullDescriptionEn: "A complete structured course for learning market context and risk awareness.",
  fullDescriptionAr: "دورة متكاملة لتعلم سياق السوق والوعي بالمخاطر.",
  instructor: "Mr.ME",
  price: 99,
  currency: "USD",
  image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3",
  accent: "#7C3AED",
};

beforeEach(() => {
  mocks.list.mockResolvedValue([course]);
  mocks.locale.mockResolvedValue("en");
});

describe("premium homepage redesign", () => {
  it("renders real dynamic course data without fabricated social proof or backend terminology", async () => {
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("Price Action Foundations");
    expect(html).toContain("$99");
    expect(html).toContain("/courses/price-action-foundations");
    expect(html).not.toMatch(/success rate|students enrolled|rating|guaranteed profit|NOWPayments|webhook|reconciliation/i);
    expect(html).not.toMatch(/\bbull\b|\bbear\b/i);
  });

  it("labels every market visual as illustrative in English", () => {
    const html = renderToStaticMarkup(<><HeroTradingVisual locale="en" /><InstrumentCards locale="en" /><EducationChart locale="en" /></>);
    expect(html).toContain("Illustrative chart");
    expect(html).toContain("not live data");
    expect(html).toContain("Illustrative model — not live");
    expect(html).not.toMatch(/\$[0-9]|real-time|live price/i);
  });

  it("provides professional Arabic labels and accessible chart descriptions", () => {
    const html = renderToStaticMarkup(<><HeroTradingVisual locale="ar" /><InstrumentCards locale="ar" /><EducationChart locale="ar" /></>);
    expect(html).toContain("نموذج تعليمي");
    expect(html).toContain("ليست بيانات مباشرة");
    expect(html).toContain("aria-label=\"رسم شموع توضيحي لأغراض تعليمية\"");
  });

  it("uses the dedicated transparent brand asset instead of an HTML wordmark", () => {
    const html = renderToStaticMarkup(<BrandLogo />);
    expect(html).toContain("/brand/mrme-trading-academy.svg");
    expect(html).toContain("aria-label=\"Mr.ME Trading Academy home\"");
    expect(html).not.toContain(">Mr.ME<");
  });
});
