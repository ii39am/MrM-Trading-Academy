"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/types";
import { Button, Spinner } from "@/components/ui";
import { checkoutCopy, checkoutError } from "@/lib/checkout-ui";

export function PurchaseButton({
  courseId,
  locale,
}: {
  courseId: string;
  locale: Locale;
}) {
  const router = useRouter(),
    ar = locale === "ar",
    copy = checkoutCopy(locale),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [couponCode, setCouponCode] = useState(""),
    [verificationRequired, setVerificationRequired] = useState(false);
  async function purchase() {
    if (busy) return;
    setBusy(true);
    setError("");
    setVerificationRequired(false);
    try {
      const response = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseIds: [courseId],
          couponCode: couponCode.trim() || undefined,
        }),
      });
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
        return;
      }
      const body = await response.json();
      if (!response.ok) {
        if (body.error?.code === "EMAIL_VERIFICATION_REQUIRED")
          setVerificationRequired(true);
        throw new Error(checkoutError(locale, body.error?.code));
      }
      router.push(`/checkout/${body.purchaseId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : checkoutError(locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-6">
      <div className="mb-4 rounded-xl border border-violet-300/10 bg-violet-500/[.06] p-4 text-sm">
        <p className="font-medium">USDT · {copy.networkName}</p>
        <p className="mt-1 text-xs text-white/40">{copy.couponAfter}</p>
      </div>
      <label className="mb-3 block text-xs text-white/45">
        {ar ? "رمز الخصم" : "Coupon code"}
        <input
          value={couponCode}
          onChange={(event) => setCouponCode(event.target.value)}
          maxLength={40}
          autoComplete="off"
          className="input mt-2 uppercase"
          placeholder={ar ? "أدخل الرمز" : "Enter code"}
        />
      </label>
      <Button onClick={purchase} disabled={busy} className="w-full">
        {busy && <Spinner />}
        {ar ? "المتابعة إلى الدفع الآمن" : "Continue to secure payment"}
      </Button>
      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
      {verificationRequired && (
        <Link
          className="mt-3 inline-block text-sm text-violet-300"
          href={`/verify-email?next=${encodeURIComponent(location.pathname)}`}
        >
          {ar ? "إعادة إرسال رمز التحقق" : "Resend verification code"}
        </Link>
      )}
    </div>
  );
}
