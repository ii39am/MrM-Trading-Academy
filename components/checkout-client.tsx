"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Alert, Badge, Button, Spinner } from "@/components/ui";
import {
  checkoutCopy,
  checkoutStatusKey,
  isTerminalPaymentStatus,
  type CheckoutPurchase,
} from "@/lib/checkout-ui";
import type { Locale } from "@/lib/types";

const POLL_MS = 5_000,
  MAX_BACKOFF_MS = 20_000;
function formatUsd(cents: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-IQ" : "en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
function remaining(expiresAt: string | null, now: number) {
  if (!expiresAt) return null;
  const seconds = Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - now) / 1000),
  );
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function CheckoutClient({
  purchaseId,
  locale,
}: {
  purchaseId: string;
  locale: Locale;
}) {
  const copy = checkoutCopy(locale),
    [purchase, setPurchase] = useState<CheckoutPurchase | null>(null),
    [loading, setLoading] = useState(true),
    [unavailable, setUnavailable] = useState(false),
    [refreshError, setRefreshError] = useState(false),
    [copied, setCopied] = useState<"amount" | "address" | "hash" | null>(null),
    [now, setNow] = useState(() => Date.now()),
    [refreshGeneration, setRefreshGeneration] = useState(0),
    expiryRefreshFor = useRef<string | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let disposed = false,
      timer: ReturnType<typeof setTimeout> | undefined,
      controller: AbortController | undefined,
      inFlight = false,
      failures = 0;
    const schedule = (delay: number) => {
      if (!disposed) timer = setTimeout(load, delay);
    };
    async function load() {
      if (disposed || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      controller = new AbortController();
      try {
        const response = await fetch(
          `/api/purchases/${encodeURIComponent(purchaseId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (response.status === 401) {
          location.assign(
            `/login?next=${encodeURIComponent(`/checkout/${purchaseId}`)}`,
          );
          return;
        }
        if (response.status === 403 || response.status === 404) {
          setUnavailable(true);
          setLoading(false);
          return;
        }
        if (!response.ok) throw new Error("refresh failed");
        const body = (await response.json()) as { purchase?: CheckoutPurchase };
        if (!body.purchase || body.purchase.id !== purchaseId)
          throw new Error("invalid purchase response");
        failures = 0;
        setRefreshError(false);
        setPurchase(body.purchase);
        setLoading(false);
        if (!isTerminalPaymentStatus(body.purchase.status)) schedule(POLL_MS);
      } catch (error) {
        if (
          !disposed &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          failures += 1;
          setRefreshError(true);
          setLoading(false);
          schedule(
            Math.min(MAX_BACKOFF_MS, POLL_MS * 2 ** Math.min(failures - 1, 2)),
          );
        }
      } finally {
        inFlight = false;
      }
    }
    function visibility() {
      if (document.visibilityState === "hidden") {
        if (timer) clearTimeout(timer);
        controller?.abort();
      } else {
        if (timer) clearTimeout(timer);
        void load();
      }
    }
    document.addEventListener("visibilitychange", visibility);
    void load();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [purchaseId, refreshGeneration]);
  const statusKey = purchase ? checkoutStatusKey(purchase) : "waiting",
    status = copy[statusKey],
    course = purchase?.items[0]?.course,
    title = purchase?.items
      .map((item) =>
        locale === "ar" ? item.course.titleAr : item.course.titleEn,
      )
      .join(" + "),
    countdown = remaining(purchase?.expiresAt ?? null, now);
  const isActive = purchase?.status === "PENDING",
    isPaid = purchase?.status === "PAID";
  useEffect(() => {
    if (
      isActive &&
      purchase?.expiresAt &&
      countdown === "00:00" &&
      expiryRefreshFor.current !== purchase.expiresAt
    ) {
      expiryRefreshFor.current = purchase.expiresAt;
      setRefreshGeneration((value) => value + 1);
    }
  }, [countdown, isActive, purchase?.expiresAt]);
  const shortHash = useMemo(
    () =>
      purchase?.transactionHash
        ? `${purchase.transactionHash.slice(0, 10)}\u2026${purchase.transactionHash.slice(-8)}`
        : null,
    [purchase?.transactionHash],
  );
  async function copyValue(kind: "amount" | "address" | "hash", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(
        () => setCopied((current) => (current === kind ? null : current)),
        1_800,
      );
    } catch {}
  }
  if (loading)
    return (
      <main className="page-shell min-h-[75vh]">
        <div className="mx-auto flex max-w-xl items-center justify-center gap-3 rounded-3xl border border-white/10 bg-surface p-10 text-white/60">
          <Spinner />
          {copy.loading}
        </div>
      </main>
    );
  if (unavailable)
    return (
      <main className="page-shell min-h-[75vh]">
        <div className="mx-auto max-w-xl surface p-8 text-center">
          <TriangleAlert className="mx-auto h-9 w-9 text-amber-300" />
          <h1 className="mt-5 text-2xl font-semibold">{copy.unavailable}</h1>
          <Button href="/dashboard" variant="secondary" className="mt-7">
            {copy.back}
          </Button>
        </div>
      </main>
    );
  if (!purchase)
    return (
      <main className="page-shell min-h-[75vh]">
        <div
          className="mx-auto flex max-w-xl items-center gap-3 rounded-3xl border border-amber-300/20 bg-amber-500/[.06] p-8 text-amber-100"
          role="status"
        >
          <RefreshCw className="h-5 w-5 shrink-0 animate-spin" />
          {copy.refreshError}
        </div>
      </main>
    );
  const statusDescription =
    statusKey === "waiting"
      ? copy.waitingBody
      : statusKey === "expired"
        ? copy.expiredBody
        : statusKey === "failed"
          ? copy.failedBody
          : statusKey === "refunded"
            ? copy.refundedBody
            : statusKey === "cancelled"
              ? copy.cancelledBody
              : isPaid
                ? copy.paidBody
                : status;
  return (
    <main className="page-shell min-h-[75vh]">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="text-sm text-white/45 transition hover:text-white"
        >
          ← {copy.back}
        </Link>
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.72fr)]">
          <section
            className="surface-elevated min-w-0 p-5 sm:p-8"
            aria-labelledby="payment-heading"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{copy.checkout}</p>
                <h1
                  id="payment-heading"
                  className="mt-3 text-2xl font-semibold sm:text-3xl"
                >
                  {title}
                </h1>
              </div>
              <Badge
                tone={
                  isPaid
                    ? "success"
                    : isActive
                      ? "warning"
                      : purchase.status === "REFUNDED"
                        ? "purple"
                        : "danger"
                }
              >
                {purchase.status}
              </Badge>
            </div>
            <div
              aria-live="polite"
              aria-atomic="true"
              className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5"
            >
              <div className="flex gap-3">
                {isPaid ? (
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" />
                ) : isActive ? (
                  <Clock3 className="mt-0.5 h-6 w-6 shrink-0 text-violet-300" />
                ) : (
                  <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-300" />
                )}
                <div>
                  <h2 className="text-lg font-semibold">{status}</h2>
                  <p className="mt-1 text-sm leading-6 text-white/55">
                    {statusDescription}
                  </p>
                </div>
              </div>
              {statusKey === "partiallyPaid" && (
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <p>
                    {copy.received}:{" "}
                    <strong>{purchase.receivedAmount ?? "0"} USDT</strong>
                  </p>
                  <p>
                    {copy.required}:{" "}
                    <strong>{purchase.expectedAmount} USDT</strong>
                  </p>
                </div>
              )}
              {refreshError && (
                <p className="mt-4 flex items-center gap-2 text-sm text-amber-200">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {copy.refreshError}
                </p>
              )}
            </div>
            {isActive && purchase.paymentAddress && purchase.expectedAmount && (
              <>
                <div className="mt-7 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/35">
                    {copy.amount}
                  </p>
                  <p className="text-sm font-medium text-violet-200">
                    {copy.sendExactly}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                    <p className="break-all text-3xl font-semibold tracking-tight sm:text-5xl">
                      {purchase.expectedAmount}{" "}
                      <span className="text-violet-300">USDT</span>
                    </p>
                    <CopyButton
                      label={copy.copyAmount}
                      copied={copied === "amount"}
                      copiedLabel={copy.copied}
                      onClick={() =>
                        copyValue("amount", purchase.expectedAmount!)
                      }
                    />
                  </div>
                </div>
                <div className="mt-7 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
                  <figure className="mx-auto w-full max-w-[220px] rounded-2xl bg-white p-3 text-center">
                    <QRCodeSVG
                      value={purchase.paymentAddress}
                      size={196}
                      level="M"
                      marginSize={1}
                      className="h-auto w-full"
                      title={copy.qrAlt}
                    />
                    <figcaption className="sr-only">
                      {copy.qrAlt}: {purchase.paymentAddress}
                    </figcaption>
                  </figure>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/35">
                      {copy.network}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-amber-200">
                      {copy.networkName}
                    </p>
                    <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/35">
                      {copy.address}
                    </p>
                    <p
                      className="mt-2 break-all rounded-xl border border-white/10 bg-black/25 p-4 font-mono text-sm leading-6"
                      data-testid="payment-address"
                    >
                      {purchase.paymentAddress}
                    </p>
                    <CopyButton
                      label={copy.copyAddress}
                      copied={copied === "address"}
                      copiedLabel={copy.copied}
                      onClick={() =>
                        copyValue("address", purchase.paymentAddress!)
                      }
                      className="mt-3"
                    />
                  </div>
                </div>
                <Alert tone="error">
                  <span className="flex gap-2">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{copy.warning}</span>
                  </span>
                </Alert>
                <p className="mt-4 text-center text-sm text-white/45">
                  {purchase.expiresAt
                    ? countdown === "00:00"
                      ? copy.checking
                      : `${copy.expiresIn} ${countdown}`
                    : copy.noExpiry}
                </p>
              </>
            )}
            {isPaid && (
              <div
                id="purchase-details"
                className="mt-7 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.07] p-5"
              >
                <p className="text-sm text-emerald-200">
                  {purchase.receivedAmount ?? purchase.expectedAmount} USDT ·{" "}
                  {copy.networkName}
                </p>
                {purchase.transactionHash && (
                  <div className="mt-4">
                    <p className="text-xs text-white/35">{copy.transaction}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <code
                        className="break-all text-sm"
                        title={purchase.transactionHash}
                      >
                        {shortHash}
                      </code>
                      <CopyButton
                        label={copy.copyHash}
                        copied={copied === "hash"}
                        copiedLabel={copy.copied}
                        onClick={() =>
                          copyValue("hash", purchase.transactionHash!)
                        }
                      />
                    </div>
                  </div>
                )}
                <p className="mt-4 text-xs text-white/35">
                  {copy.updated}:{" "}
                  {new Intl.DateTimeFormat(
                    locale === "ar" ? "ar-IQ" : "en-US",
                    { dateStyle: "medium", timeStyle: "short" },
                  ).format(new Date(purchase.paidAt ?? purchase.updatedAt))}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button href="/dashboard">{copy.goCourses}</Button>
                  <Button href="#purchase-details" variant="secondary">
                    {copy.viewPurchase}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {!isActive && !isPaid && course && (
              <div className="mt-7">
                <Button href={`/courses/${course.slug}`}>{copy.retry}</Button>
              </div>
            )}
          </section>
          <aside className="surface h-fit min-w-0 overflow-hidden p-5 sm:p-6">
            <h2 className="text-lg font-semibold">{copy.summary}</h2>
            {course && (
              <div className="mt-5 flex gap-4">
                <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src={course.image}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{title}</p>
                  <p className="mt-2 text-xs text-white/40">
                    {copy.paymentMethod}: USDT · {copy.networkName}
                  </p>
                </div>
              </div>
            )}
            <dl className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
              <SummaryRow
                label={copy.originalPrice}
                value={formatUsd(
                  purchase.originalAmountCents,
                  purchase.currency,
                  locale,
                )}
              />
              {purchase.discountAmountCents > 0 && (
                <SummaryRow
                  label={copy.discount}
                  value={`−${formatUsd(purchase.discountAmountCents, purchase.currency, locale)}`}
                  accent
                />
              )}
              <SummaryRow
                label={copy.finalPrice}
                value={formatUsd(
                  purchase.amountCents,
                  purchase.currency,
                  locale,
                )}
                strong
              />
            </dl>
            <p className="mt-5 text-xs leading-5 text-white/35">
              {copy.couponAfter}
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-violet-300/10 bg-violet-500/[.06] p-4">
              <WalletCards className="h-5 w-5 text-violet-300" />
              <div>
                <p className="text-sm font-medium">USDT</p>
                <p className="text-xs text-white/40">{copy.networkName}</p>
              </div>
              <Check className="ms-auto h-4 w-4 text-emerald-300" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function CopyButton({
  label,
  copied,
  copiedLabel,
  onClick,
  className = "",
}: {
  label: string;
  copied: boolean;
  copiedLabel: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-semibold text-white/75 transition hover:bg-white/[.06] ${className}`}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-300" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {copied ? copiedLabel : label}
    </button>
  );
}
function SummaryRow({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${strong ? "border-t border-white/10 pt-4 text-base" : ""}`}
    >
      <dt className="text-white/45">{label}</dt>
      <dd
        className={
          strong
            ? "font-semibold"
            : accent
              ? "text-emerald-300"
              : "text-white/75"
        }
      >
        {value}
      </dd>
    </div>
  );
}
