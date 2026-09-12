"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { productImageError } from "@/lib/product-image-validation";

export function ProductImageUpload({ value, onChange, onBusyChange, disabled, error, ar = false }: {
  value: string; onChange: (url: string) => void; onBusyChange: (busy: boolean) => void;
  disabled?: boolean; error?: string; ar?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function message(code: string) {
    if (code === "IMAGE_TOO_LARGE") return ar ? "اختر صورة لا يتجاوز حجمها 5 ميغابايت." : "Choose an image no larger than 5 MB.";
    if (code === "INVALID_IMAGE") return ar ? "اختر صورة PNG أو JPG أو WEBP صالحة وغير متحركة (حتى 16 ميغابكسل)." : "Choose a valid, non-animated PNG, JPG or WEBP image (up to 16 megapixels).";
    if (code === "RATE_LIMITED") return ar ? "محاولات رفع كثيرة. حاول لاحقاً." : "Too many uploads. Please try again later.";
    return ar ? "تعذر رفع الصورة. حاول مجدداً." : "Image upload failed. Please try again.";
  }

  async function upload(file?: File) {
    if (!file || busy || disabled) return;
    setUploadError("");
    const invalid = productImageError(file);
    if (invalid) { setUploadError(message(invalid)); return; }
    const abort = new AbortController();
    controller.current = abort;
    setPreview(URL.createObjectURL(file));
    setBusy(true); onBusyChange(true);
    const timeout = setTimeout(() => abort.abort(), 60_000);
    try {
      const body = new FormData(); body.append("image", file);
      const response = await fetch("/api/admin/uploads/product-image", { method: "POST", body, signal: abort.signal });
      const result = await response.json();
      if (!response.ok) { setUploadError(message(result?.error?.code)); return; }
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.pathname.indexOf("/media/products/") !== 0) throw new Error("Invalid upload response");
      onChange(url.href);
    } catch { setUploadError(message("UPLOAD_UNAVAILABLE")); }
    finally { clearTimeout(timeout); setPreview(""); setBusy(false); onBusyChange(false); }
  }

  return <div aria-busy={busy}>
    <label htmlFor="image" className="mb-2 block text-sm font-medium text-violet-100/75">{ar ? "صورة المنتج" : "Product image"} <span aria-hidden="true">*</span></label>
    {(preview || value) && <div className="mb-3 aspect-video overflow-hidden rounded-xl border border-violet-200/15 bg-violet-950/30">
      {/* Local blob previews and existing URLs need no image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview || value} alt={ar ? "معاينة صورة المنتج" : "Product image preview"} className="h-full w-full object-cover" />
    </div>}
    <input ref={input} id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" className="sr-only" disabled={busy || disabled} aria-required="true" aria-invalid={!!(error || uploadError)} aria-describedby="image-help image-error" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void upload(file); }} />
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={busy || disabled} onClick={() => input.current?.click()}>{busy ? <Spinner /> : null}{busy ? (ar ? "جارٍ الرفع..." : "Uploading…") : value ? (ar ? "استبدال الصورة" : "Replace image") : (ar ? "اختيار صورة" : "Choose image")}</Button>
      {value && <Button type="button" disabled={busy || disabled} onClick={() => { setUploadError(""); onChange(""); }}>{ar ? "إزالة الصورة" : "Remove image"}</Button>}
    </div>
    <p id="image-help" className="mt-2 text-xs text-violet-100/50">PNG, JPG, WEBP · {ar ? "حتى 5 ميغابايت. الصورة مطلوبة لحفظ المنتج." : "Up to 5 MB. An image is required to save the product."}</p>
    <p role="status" className="mt-1 text-xs text-violet-200">{busy ? (ar ? "جارٍ التحقق من الصورة ورفعها..." : "Validating and uploading image…") : ""}</p>
    <p id="image-error" className="mt-1 text-xs text-red-300" aria-live="polite">{uploadError || error}</p>
  </div>;
}
