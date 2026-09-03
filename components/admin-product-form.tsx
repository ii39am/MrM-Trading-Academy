"use client";

import { BookOpenText, Bot, CircleDollarSign, ImageIcon, Info, Languages, PackagePlus, Save, Settings2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui";
import { productSchema } from "@/lib/product-validation";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  shortDescriptionEn: string;
  shortDescriptionAr: string;
  fullDescriptionEn: string;
  fullDescriptionAr: string;
  instructor: string;
  priceCents: number;
  currency: string;
  image: string;
  accent: string;
  status: string;
  publishedAt: string | null;
  telegramChatId: string | null;
  telegramAccessEnabled: boolean;
  telegramButtonLabelEn: string | null;
  telegramButtonLabelAr: string | null;
};

type Draft = {
  slug: string;
  titleEn: string;
  titleAr: string;
  shortDescriptionEn: string;
  shortDescriptionAr: string;
  fullDescriptionEn: string;
  fullDescriptionAr: string;
  instructor: string;
  price: string;
  currency: "USD";
  image: string;
  accent: string;
  telegramChatId: string;
  telegramAccessEnabled: boolean;
  telegramButtonLabelEn: string;
  telegramButtonLabelAr: string;
  published: boolean;
};

const emptyDraft: Draft = {
  slug: "",
  titleEn: "",
  titleAr: "",
  shortDescriptionEn: "",
  shortDescriptionAr: "",
  fullDescriptionEn: "",
  fullDescriptionAr: "",
  instructor: "Mr.ME",
  price: "10.00",
  currency: "USD",
  image: "",
  accent: "#7C3AED",
  telegramChatId: "",
  telegramAccessEnabled: false,
  telegramButtonLabelEn: "Access Course",
  telegramButtonLabelAr: "دخول الدورة",
  published: false,
};

function toDraft(product?: Product): Draft {
  if (!product) return { ...emptyDraft };
  return {
    slug: product.slug,
    titleEn: product.titleEn,
    titleAr: product.titleAr,
    shortDescriptionEn: product.shortDescriptionEn,
    shortDescriptionAr: product.shortDescriptionAr,
    fullDescriptionEn: product.fullDescriptionEn,
    fullDescriptionAr: product.fullDescriptionAr,
    instructor: product.instructor,
    price: (product.priceCents / 100).toFixed(2),
    currency: "USD",
    image: product.image,
    accent: product.accent,
    telegramChatId: product.telegramChatId ?? "",
    telegramAccessEnabled: product.telegramAccessEnabled,
    telegramButtonLabelEn: product.telegramButtonLabelEn ?? "Access Course",
    telegramButtonLabelAr: product.telegramButtonLabelAr ?? "دخول الدورة",
    published: product.status === "PUBLISHED",
  };
}

function priceToCents(value: string) {
  const match = value.trim().match(/^(\d{1,7})(?:\.(\d{1,2}))?$/);
  if (!match) return Number.NaN;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

function strings(ar: boolean) {
  return ar ? {
    eyebrow: "إدارة المحتوى",
    title: "المنتجات",
    subtitle: "أنشئ دورات الأكاديمية وحدّث محتواها وتسعيرها وإعدادات الوصول الآمن من مكان واحد.",
    newProduct: "منتج جديد",
    catalog: "كتالوج المنتجات",
    catalogHelp: "اختر منتجاً للتعديل أو ابدأ منتجاً جديداً.",
    emptyCatalog: "لا توجد منتجات بعد.",
    creating: "إنشاء منتج جديد",
    editing: "تعديل المنتج",
    basic: "المعلومات الأساسية",
    basicHelp: "المعلومات الرئيسية التي تساعد العميل على التعرف على الدورة.",
    descriptions: "الوصف",
    descriptionsHelp: "اكتب وصفاً واضحاً ومتسقاً باللغتين دون وعود بنتائج مالية.",
    pricing: "التسعير",
    pricingHelp: "أدخل السعر بالدولار. سيُرسل إلى الخادم بوحدة السنت للتوافق مع نظام الدفع.",
    media: "الوسائط والهوية",
    mediaHelp: "استخدم رابط صورة موثوقاً ولوناً مناسباً لهوية المنتج.",
    telegram: "الوصول عبر Telegram",
    telegramHelp: "إعدادات المجموعة الخاصة التي تُستخدم لإنشاء روابط دخول مؤقتة وآمنة.",
    publishing: "النشر",
    publishingHelp: "راجع المعاينة وإعدادات الوصول قبل إتاحة المنتج للعملاء.",
    titleEn: "العنوان بالإنجليزية",
    titleAr: "العنوان بالعربية",
    slug: "الرابط المختصر",
    instructor: "المدرّب",
    shortEn: "الوصف المختصر بالإنجليزية",
    shortAr: "الوصف المختصر بالعربية",
    fullEn: "الوصف الكامل بالإنجليزية",
    fullAr: "الوصف الكامل بالعربية",
    price: "السعر",
    currency: "العملة",
    pricePreview: "معاينة السعر",
    image: "رابط صورة المنتج",
    accent: "لون المنتج",
    chatId: "معرّف محادثة Telegram",
    buttonEn: "نص زر Telegram بالإنجليزية",
    buttonAr: "نص زر Telegram بالعربية",
    secureAccess: "تفعيل الوصول الآمن عبر Telegram",
    secureAccessHelp: "لن يُنشأ رابط الدخول إلا لمستخدم يملك استحقاقاً صالحاً.",
    serverToken: "رمز البوت محفوظ في إعدادات الخادم فقط، ولا يجب إدخاله أو مشاركته هنا.",
    published: "نشر المنتج",
    publishedHelp: "يتطلب النشر تفعيل الوصول الآمن وإضافة معرّف محادثة صالح.",
    draft: "مسودة",
    live: "منشور",
    preview: "معاينة المنتج",
    previewHelp: "معاينة تقريبية لبطاقة المنتج العامة.",
    untitled: "عنوان المنتج",
    shortPlaceholder: "سيظهر الوصف المختصر هنا.",
    save: "حفظ المنتج",
    saving: "جارٍ الحفظ...",
    saved: "تم حفظ المنتج بنجاح.",
    saveError: "تعذر حفظ المنتج. راجع الحقول وحاول مجدداً.",
    invalid: "يرجى مراجعة هذا الحقل.",
    required: "مطلوب",
    slugHelp: "أحرف إنجليزية صغيرة وأرقام وشرطات فقط، مثل: price-action-basics",
    imageHelp: "استخدم رابط HTTPS لصورة مناسبة وعالية الجودة.",
    chatHelp: "معرّف رقمي للمجموعة أو اسم مستخدم يبدأ بعلامة @.",
  } : {
    eyebrow: "Content management",
    title: "Products",
    subtitle: "Create and maintain academy courses, pricing, branding, and secure access settings from one workspace.",
    newProduct: "New product",
    catalog: "Product catalog",
    catalogHelp: "Select a product to edit or begin a new one.",
    emptyCatalog: "No products yet.",
    creating: "Create a new product",
    editing: "Edit product",
    basic: "Basic information",
    basicHelp: "The essential details customers use to identify this course.",
    descriptions: "Descriptions",
    descriptionsHelp: "Keep both languages clear, consistent, and free of financial outcome promises.",
    pricing: "Pricing",
    pricingHelp: "Enter the USD display price. It is converted to cents for the existing payment contract.",
    media: "Media & branding",
    mediaHelp: "Use a trusted image URL and an accent that fits the product identity.",
    telegram: "Telegram fulfillment",
    telegramHelp: "Private community settings used to issue secure, temporary access links.",
    publishing: "Publishing",
    publishingHelp: "Review the preview and access configuration before making the product available.",
    titleEn: "English title",
    titleAr: "Arabic title",
    slug: "URL slug",
    instructor: "Instructor",
    shortEn: "English short description",
    shortAr: "Arabic short description",
    fullEn: "English full description",
    fullAr: "Arabic full description",
    price: "Price",
    currency: "Currency",
    pricePreview: "Price preview",
    image: "Product image URL",
    accent: "Product accent",
    chatId: "Telegram chat ID",
    buttonEn: "English Telegram button label",
    buttonAr: "Arabic Telegram button label",
    secureAccess: "Enable secure Telegram access",
    secureAccessHelp: "An invite can be issued only to a user with a valid entitlement.",
    serverToken: "The bot token is configured in the server environment only. Never enter or share it here.",
    published: "Publish product",
    publishedHelp: "Publishing requires secure access to be enabled with a valid chat ID.",
    draft: "Draft",
    live: "Published",
    preview: "Product preview",
    previewHelp: "An approximate preview of the public product card.",
    untitled: "Product title",
    shortPlaceholder: "The short description will appear here.",
    save: "Save product",
    saving: "Saving...",
    saved: "Product saved successfully.",
    saveError: "The product could not be saved. Review the fields and try again.",
    invalid: "Please review this field.",
    required: "Required",
    slugHelp: "Lowercase letters, numbers, and hyphens only, for example: price-action-basics",
    imageHelp: "Use a trusted HTTPS URL for a suitable high-quality image.",
    chatHelp: "A numeric private-chat ID or a username beginning with @.",
  };
}

export function AdminProductForm({ products, locale }: { products: Product[]; locale: Locale }) {
  const ar = locale === "ar";
  const copy = strings(ar);
  const [selected, setSelected] = useState(products[0]?.id ?? "new");
  const product = products.find(item => item.id === selected);

  return (
    <div dir={ar ? "rtl" : "ltr"}>
      <header className="flex flex-col gap-6 border-b border-violet-200/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] sm:text-4xl">{copy.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-violet-100/50">{copy.subtitle}</p>
        </div>
        <Button onClick={() => setSelected("new")}>
          <PackagePlus className="h-4 w-4" aria-hidden="true" />
          {copy.newProduct}
        </Button>
      </header>

      <div className="mt-8 grid min-w-0 items-start gap-6 xl:grid-cols-[15.5rem_minmax(0,1fr)]">
        <aside className="surface min-w-0 p-3 xl:sticky xl:top-28">
          <div className="px-2 pb-3 pt-1">
            <h2 className="text-sm font-semibold">{copy.catalog}</h2>
            <p className="mt-1 text-xs leading-5 text-violet-100/40">{copy.catalogHelp}</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 xl:grid xl:max-h-[calc(100vh-15rem)] xl:overflow-y-auto xl:overflow-x-hidden">
            <ProductSelector active={selected === "new"} onClick={() => setSelected("new")} title={copy.newProduct} subtitle={copy.draft} accent="#7C3AED" />
            {products.map(item => <ProductSelector key={item.id} active={selected === item.id} onClick={() => setSelected(item.id)} title={(ar ? item.titleAr : item.titleEn) || copy.untitled} subtitle={`${item.status === "PUBLISHED" ? copy.live : copy.draft} · ${item.slug}`} accent={item.accent} />)}
          </div>
          {!products.length && <p className="px-2 py-5 text-center text-xs text-violet-100/40">{copy.emptyCatalog}</p>}
        </aside>
        <ProductEditor key={selected} product={product} locale={locale} />
      </div>
    </div>
  );
}

function ProductSelector({ active, onClick, title, subtitle, accent }: { active: boolean; onClick: () => void; title: string; subtitle: string; accent: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("min-w-56 rounded-xl border p-3 text-start transition xl:min-w-0", active ? "border-violet-400/35 bg-violet-500/10 shadow-[inset_3px_0_0_var(--selector-accent)] rtl:shadow-[inset_-3px_0_0_var(--selector-accent)]" : "border-transparent hover:border-violet-200/10 hover:bg-violet-100/[.035]")} style={{ "--selector-accent": accent } as React.CSSProperties}>
      <span className="block truncate text-sm font-medium">{title}</span>
      <span className="mt-1 block truncate text-[11px] text-violet-100/40" dir="auto">{subtitle}</span>
    </button>
  );
}

function ProductEditor({ product, locale }: { product?: Product; locale: Locale }) {
  const router = useRouter();
  const ar = locale === "ar";
  const copy = strings(ar);
  const [values, setValues] = useState<Draft>(() => toDraft(product));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const cents = priceToCents(values.price);
  const formattedPrice = Number.isFinite(cents) && cents > 0
    ? new Intl.NumberFormat(ar ? "ar-IQ" : "en-US", { style: "currency", currency: "USD" }).format(cents / 100)
    : "—";

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setMessage(null);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const payload = {
      slug: values.slug,
      titleEn: values.titleEn,
      titleAr: values.titleAr,
      shortDescriptionEn: values.shortDescriptionEn,
      shortDescriptionAr: values.shortDescriptionAr,
      fullDescriptionEn: values.fullDescriptionEn,
      fullDescriptionAr: values.fullDescriptionAr,
      instructor: values.instructor,
      priceCents: cents,
      currency: values.currency,
      image: values.image,
      accent: values.accent,
      telegramChatId: values.telegramChatId,
      telegramAccessEnabled: values.telegramAccessEnabled,
      telegramButtonLabelEn: values.telegramButtonLabelEn,
      telegramButtonLabelAr: values.telegramButtonLabelAr,
      published: values.published,
    };
    const parsed = productSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form");
        next[field] ??= copy.invalid;
      }
      setErrors(next);
      setMessage({ tone: "error", text: copy.saveError });
      const first = String(parsed.error.issues[0]?.path[0] ?? "");
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`[name="${first === "priceCents" ? "price" : first}"]`)?.focus());
      return;
    }

    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const response = await fetch(product ? `/api/admin/products/${product.id}` : "/api/admin/products", {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      await response.json().catch(() => null);
      if (!response.ok) throw new Error("SAVE_FAILED");
      setMessage({ tone: "success", text: copy.saved });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: copy.saveError });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate aria-busy={busy} className="min-w-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-violet-300">{product ? copy.editing : copy.creating}</p>
          <h2 className="mt-1 text-xl font-semibold" dir="auto">{(ar ? values.titleAr : values.titleEn) || copy.untitled}</h2>
        </div>
        <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium", values.published ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300" : "border-violet-200/10 bg-violet-100/[.04] text-violet-100/55")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", values.published ? "bg-emerald-400" : "bg-violet-300/60")} />
          {values.published ? copy.live : copy.draft}
        </span>
      </div>

      <fieldset disabled={busy} className="grid min-w-0 items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-6">
          <EditorSection icon={Languages} title={copy.basic} description={copy.basicHelp}>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField name="titleEn" label={copy.titleEn} required value={values.titleEn} onChange={value => update("titleEn", value)} error={errors.titleEn} dir="ltr" />
              <TextField name="titleAr" label={copy.titleAr} required value={values.titleAr} onChange={value => update("titleAr", value)} error={errors.titleAr} dir="rtl" />
              <TextField name="slug" label={copy.slug} required value={values.slug} onChange={value => update("slug", value.toLowerCase())} error={errors.slug} help={copy.slugHelp} dir="ltr" autoComplete="off" />
              <TextField name="instructor" label={copy.instructor} required value={values.instructor} onChange={value => update("instructor", value)} error={errors.instructor} />
            </div>
          </EditorSection>

          <EditorSection icon={BookOpenText} title={copy.descriptions} description={copy.descriptionsHelp}>
            <div className="grid gap-5 md:grid-cols-2">
              <TextAreaField name="shortDescriptionEn" label={copy.shortEn} required value={values.shortDescriptionEn} onChange={value => update("shortDescriptionEn", value)} error={errors.shortDescriptionEn} dir="ltr" rows={3} maxLength={500} />
              <TextAreaField name="shortDescriptionAr" label={copy.shortAr} required value={values.shortDescriptionAr} onChange={value => update("shortDescriptionAr", value)} error={errors.shortDescriptionAr} dir="rtl" rows={3} maxLength={500} />
              <TextAreaField name="fullDescriptionEn" label={copy.fullEn} required value={values.fullDescriptionEn} onChange={value => update("fullDescriptionEn", value)} error={errors.fullDescriptionEn} dir="ltr" rows={7} maxLength={5000} />
              <TextAreaField name="fullDescriptionAr" label={copy.fullAr} required value={values.fullDescriptionAr} onChange={value => update("fullDescriptionAr", value)} error={errors.fullDescriptionAr} dir="rtl" rows={7} maxLength={5000} />
            </div>
          </EditorSection>

          <EditorSection icon={CircleDollarSign} title={copy.pricing} description={copy.pricingHelp}>
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <TextField name="price" label={copy.price} required value={values.price} onChange={value => update("price", value)} error={errors.priceCents} dir="ltr" inputMode="decimal" placeholder="99.00" prefix="$" />
              <FormField name="currency" label={copy.currency} required>
                <select id="currency" name="currency" className="input" value={values.currency} onChange={event => update("currency", event.target.value as "USD")}>
                  <option value="USD">USD</option>
                </select>
              </FormField>
            </div>
            <div className="mt-5 rounded-xl border border-violet-200/10 bg-violet-500/[.055] px-4 py-3">
              <p className="text-xs text-violet-100/45">{copy.pricePreview}</p>
              <p className="mt-1 text-xl font-semibold" dir="ltr">{formattedPrice}</p>
            </div>
          </EditorSection>

          <EditorSection icon={ImageIcon} title={copy.media} description={copy.mediaHelp}>
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_12rem]">
              <TextField name="image" label={copy.image} required value={values.image} onChange={value => update("image", value)} error={errors.image} help={copy.imageHelp} dir="ltr" inputMode="url" placeholder="https://…" />
              <FormField name="accent" label={copy.accent} required error={errors.accent}>
                <div className="flex gap-2">
                  <input type="color" aria-label={copy.accent} value={/^#[0-9a-f]{6}$/i.test(values.accent) ? values.accent : "#7C3AED"} onChange={event => update("accent", event.target.value.toUpperCase())} className="h-12 w-14 shrink-0 cursor-pointer rounded-xl border border-violet-200/15 bg-transparent p-1" />
                  <input id="accent" name="accent" value={values.accent} onChange={event => update("accent", event.target.value)} className="input min-w-0 font-mono uppercase" dir="ltr" autoComplete="off" />
                </div>
              </FormField>
            </div>
          </EditorSection>

          <EditorSection icon={Bot} title={copy.telegram} description={copy.telegramHelp}>
            <div className="mb-5 rounded-xl border border-violet-400/15 bg-violet-500/[.06] p-4 text-sm leading-6 text-violet-100/60">
              <Info className="me-2 inline h-4 w-4 text-violet-300" aria-hidden="true" />
              {copy.serverToken}
            </div>
            <ToggleField name="telegramAccessEnabled" checked={values.telegramAccessEnabled} onChange={checked => update("telegramAccessEnabled", checked)} label={copy.secureAccess} help={copy.secureAccessHelp} />
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <TextField name="telegramChatId" label={copy.chatId} value={values.telegramChatId} onChange={value => update("telegramChatId", value)} error={errors.telegramChatId} help={copy.chatHelp} dir="ltr" placeholder="-1001234567890" autoComplete="off" />
              </div>
              <TextField name="telegramButtonLabelEn" label={copy.buttonEn} value={values.telegramButtonLabelEn} onChange={value => update("telegramButtonLabelEn", value)} error={errors.telegramButtonLabelEn} dir="ltr" />
              <TextField name="telegramButtonLabelAr" label={copy.buttonAr} value={values.telegramButtonLabelAr} onChange={value => update("telegramButtonLabelAr", value)} error={errors.telegramButtonLabelAr} dir="rtl" />
            </div>
          </EditorSection>
        </div>

        <aside className="min-w-0 space-y-6 2xl:sticky 2xl:top-28">
          <ProductPreview values={values} locale={locale} formattedPrice={formattedPrice} copy={copy} />
          <EditorSection icon={Settings2} title={copy.publishing} description={copy.publishingHelp} compact>
            <ToggleField name="published" checked={values.published} onChange={checked => update("published", checked)} label={copy.published} help={copy.publishedHelp} />
            {errors.telegramChatId && values.published && <p role="alert" className="mt-3 text-xs leading-5 text-red-300">{errors.telegramChatId}</p>}
            <div className="mt-6 border-t border-violet-200/10 pt-5">
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Spinner /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {busy ? copy.saving : copy.save}
              </Button>
              <div className="mt-3 min-h-6" aria-live="polite">
                {message && <p role={message.tone === "error" ? "alert" : "status"} className={cn("text-center text-xs leading-5", message.tone === "success" ? "text-emerald-300" : "text-red-300")}>{message.text}</p>}
              </div>
            </div>
          </EditorSection>
        </aside>
      </fieldset>
    </form>
  );
}

function EditorSection({ icon: Icon, title, description, children, compact = false }: { icon: typeof BookOpenText; title: string; description: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <section className={cn("surface", compact ? "p-5" : "p-5 sm:p-6")}>
      <div className="flex items-start gap-3 border-b border-violet-200/10 pb-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><Icon className="h-4 w-4" aria-hidden="true" /></span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-violet-100/45">{description}</p>
        </div>
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

function FormField({ name, label, required, help, error, children }: { name: string; label: string; required?: boolean; help?: string; error?: string; children: React.ReactNode }) {
  const descriptionId = `${name}-description`;
  return (
    <div>
      <label htmlFor={name} className="mb-2 flex items-center gap-1.5 text-sm font-medium text-violet-100/75">
        {label}
        {required && <span className="text-violet-400" aria-hidden="true">*</span>}
      </label>
      {children}
      {(error || help) && <p id={descriptionId} className={cn("mt-2 text-xs leading-5", error ? "text-red-300" : "text-violet-100/40")}>{error ?? help}</p>}
    </div>
  );
}

function TextField({ name, label, value, onChange, error, help, required, dir, inputMode, placeholder, prefix, autoComplete }: { name: string; label: string; value: string; onChange: (value: string) => void; error?: string; help?: string; required?: boolean; dir?: "ltr" | "rtl"; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; placeholder?: string; prefix?: string; autoComplete?: string }) {
  const input = <input id={name} name={name} required={required} value={value} onChange={event => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={(error || help) ? `${name}-description` : undefined} dir={dir} inputMode={inputMode} placeholder={placeholder} autoComplete={autoComplete} className={cn("input", prefix && "ps-10", error && "border-red-400/50 focus:border-red-400 focus:ring-red-500/10")} />;
  return <FormField name={name} label={label} required={required} help={help} error={error}>{prefix ? <div className="relative"><span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-sm text-violet-100/40">{prefix}</span>{input}</div> : input}</FormField>;
}

function TextAreaField({ name, label, value, onChange, error, required, dir, rows, maxLength }: { name: string; label: string; value: string; onChange: (value: string) => void; error?: string; required?: boolean; dir?: "ltr" | "rtl"; rows: number; maxLength: number }) {
  return (
    <FormField name={name} label={label} required={required} error={error}>
      <textarea id={name} name={name} required={required} value={value} onChange={event => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-description` : undefined} dir={dir} rows={rows} maxLength={maxLength} className={cn("input resize-y py-3 leading-6", error && "border-red-400/50 focus:border-red-400 focus:ring-red-500/10")} />
    </FormField>
  );
}

function ToggleField({ name, checked, onChange, label, help }: { name: string; checked: boolean; onChange: (checked: boolean) => void; label: string; help: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-violet-200/10 bg-violet-100/[.025] p-4">
      <span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs leading-5 text-violet-100/42">{help}</span></span>
      <span className="relative mt-0.5 shrink-0">
        <input name={name} type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="peer sr-only" />
        <span className="block h-6 w-11 rounded-full border border-violet-200/15 bg-violet-100/10 transition peer-checked:border-violet-400/40 peer-checked:bg-violet-600 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ink" />
        <span className="absolute start-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5" />
      </span>
    </label>
  );
}

function ProductPreview({ values, locale, formattedPrice, copy }: { values: Draft; locale: Locale; formattedPrice: string; copy: ReturnType<typeof strings> }) {
  const ar = locale === "ar";
  const title = (ar ? values.titleAr : values.titleEn) || copy.untitled;
  const description = (ar ? values.shortDescriptionAr : values.shortDescriptionEn) || copy.shortPlaceholder;
  const validImage = /^https?:\/\/[^\s]+$/i.test(values.image);
  const accent = /^#[0-9a-f]{6}$/i.test(values.accent) ? values.accent : "#7C3AED";
  return (
    <section className="surface overflow-hidden">
      <div className="border-b border-violet-200/10 px-5 py-4">
        <h3 className="text-sm font-semibold">{copy.preview}</h3>
        <p className="mt-1 text-xs text-violet-100/40">{copy.previewHelp}</p>
      </div>
      <div className="p-3">
        <div className="overflow-hidden rounded-2xl border border-violet-200/10 bg-panel">
          <div className="relative aspect-[16/9] overflow-hidden bg-violet-500/[.06]" style={validImage ? { backgroundImage: `linear-gradient(to top, rgba(7,5,17,.72), transparent 62%), url(${JSON.stringify(values.image)})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} role="img" aria-label={validImage ? title : copy.image}>
            {!validImage && <ImageIcon className="absolute start-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-violet-300/35 rtl:translate-x-1/2" aria-hidden="true" />}
            <span className="absolute inset-x-3 bottom-3 h-1 rounded-full" style={{ background: accent, boxShadow: `0 0 18px ${accent}` }} />
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <span className={cn("rounded-full border px-2 py-1 text-[10px] font-semibold", values.published ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300" : "border-violet-200/10 text-violet-100/45")}>{values.published ? copy.live : copy.draft}</span>
              <span className="text-xs text-violet-100/40">{values.instructor || "Mr.ME"}</span>
            </div>
            <h4 className="mt-4 text-lg font-semibold" dir="auto">{title}</h4>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-violet-100/48" dir="auto">{description}</p>
            <p className="mt-5 text-xl font-semibold" dir="ltr">{formattedPrice}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
