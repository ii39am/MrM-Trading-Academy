import { PaymentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const ADMIN_SALES_PAGE_SIZE = 25;
export const ADMIN_SALES_MAX_PAGE_SIZE = 50;

const statuses = new Set(Object.values(PaymentStatus));
const text = (value: string | undefined, max: number) => (value ?? "").trim().slice(0, max);
function date(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export type AdminSalesQuery = ReturnType<typeof parseAdminSalesQuery>;
export function parseAdminSalesQuery(input: Record<string, string | undefined>) {
  const rawPage = Number(input.page ?? 1);
  return {
    search: text(input.search, 100),
    status: statuses.has(input.status as PaymentStatus) ? (input.status as PaymentStatus) : undefined,
    providerStatus: text(input.providerStatus, 40),
    course: text(input.course, 100),
    from: date(input.from),
    to: date(input.to, true),
    page: Number.isSafeInteger(rawPage) ? Math.min(100_000, Math.max(1, rawPage)) : 1,
    take: ADMIN_SALES_PAGE_SIZE,
  };
}

export function adminPurchaseWhere(query: AdminSalesQuery): Prisma.PurchaseWhereInput {
  const AND: Prisma.PurchaseWhereInput[] = [];
  if (query.status) AND.push({ status: query.status });
  if (query.providerStatus)
    AND.push({ providerStatus: { contains: query.providerStatus, mode: "insensitive" } });
  if (query.course)
    AND.push({ items: { some: { course: { OR: [
      { slug: { contains: query.course, mode: "insensitive" } },
      { titleEn: { contains: query.course, mode: "insensitive" } },
      { titleAr: { contains: query.course, mode: "insensitive" } },
    ] } } } });
  if (query.from || query.to) AND.push({ createdAt: { gte: query.from, lte: query.to } });
  if (query.search) {
    const search = query.search;
    AND.push({ OR: [
      { id: { contains: search, mode: "insensitive" } },
      { providerPaymentId: { contains: search, mode: "insensitive" } },
      { transactionHash: { contains: search, mode: "insensitive" } },
      { user: { normalizedEmail: { contains: search.toLowerCase(), mode: "insensitive" } } },
      { items: { some: { course: { OR: [
        { slug: { contains: search, mode: "insensitive" } },
        { titleEn: { contains: search, mode: "insensitive" } },
        { titleAr: { contains: search, mode: "insensitive" } },
      ] } } } },
    ] });
  }
  return AND.length ? { AND } : {};
}

export async function listAdminPurchases(input: Record<string, string | undefined>) {
  const query = parseAdminSalesQuery(input), where = adminPurchaseWhere(query);
  const [purchases, total] = await db.$transaction([
    db.purchase.findMany({
      where,
      select: {
        id: true, amountCents: true, currency: true, status: true, providerStatus: true,
        provider: true, providerPaymentId: true, transactionHash: true, createdAt: true,
        lastReconciledAt: true, reconciliationErrorCode: true,
        user: { select: { name: true, email: true } },
        items: { select: { course: { select: { titleEn: true } } } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.take,
      take: Math.min(query.take, ADMIN_SALES_MAX_PAGE_SIZE),
    }),
    db.purchase.count({ where }),
  ]);
  return { purchases, total, query, pages: Math.max(1, Math.ceil(total / query.take)) };
}

export async function getAdminPurchaseDiagnostics(purchaseId: string) {
  const purchase = await db.purchase.findUnique({
    where: { id: purchaseId },
    select: {
      id: true, userId: true, provider: true, providerPaymentId: true, providerStatus: true,
      status: true, originalAmountCents: true, discountAmountCents: true, amountCents: true,
      currency: true, expectedAmount: true, receivedAmount: true, payCurrency: true, network: true,
      paymentAddress: true, transactionHash: true, createdAt: true, updatedAt: true, paidAt: true,
      expiresAt: true, refundedAt: true, refundedAmountCents: true, refundReference: true,
      lastReconciledAt: true, nextReconcileAt: true, reconcileAttempts: true,
      reconciliationErrorCode: true,
      user: { select: { id: true, name: true, email: true } },
      coupon: { select: { id: true, code: true } },
      couponRedemption: { select: { status: true, discountAmount: true, reservedAt: true, redeemedAt: true, releasedAt: true } },
      items: { select: { courseId: true, priceCents: true, course: { select: {
        titleEn: true, slug: true, status: true, telegramAccessEnabled: true, telegramChatId: true,
      } } } },
      transactions: { select: { id: true, eventId: true, fromStatus: true, toStatus: true, source: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      enrollments: { select: { id: true, courseId: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      accessGrants: { select: {
        id: true, courseId: true, enrollmentId: true, provider: true, externalInviteId: true,
        status: true, createdAt: true, expiresAt: true, redeemedAt: true, revokedAt: true,
        lastErrorCode: true, course: { select: { titleEn: true } },
      }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!purchase) return null;
  const [webhooks, audits] = await Promise.all([
    db.webhookEvent.findMany({
      where: { id: { in: purchase.transactions.map(item => item.eventId) } },
      select: { id: true, provider: true, receivedAt: true, processedAt: true },
    }),
    db.securityAuditLog.findMany({
      where: { OR: [
        { entityType: "Purchase", entityId: purchase.id },
        { entityType: "CourseAccessGrant", entityId: { in: purchase.accessGrants.map(item => item.id) } },
      ] },
      select: { id: true, action: true, category: true, entityType: true, entityId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
  ]);
  return { purchase, webhooks, audits };
}

export type AdminTimelineEvent = { id: string; at: Date; title: string; detail: string };
export function buildPurchaseTimeline(diagnostics: NonNullable<Awaited<ReturnType<typeof getAdminPurchaseDiagnostics>>>) {
  const { purchase, webhooks, audits } = diagnostics;
  const events: AdminTimelineEvent[] = [{ id: `purchase:${purchase.id}`, at: purchase.createdAt, title: "Purchase created", detail: purchase.id }];
  for (const webhook of webhooks)
    events.push({ id: `webhook:${webhook.id}`, at: webhook.receivedAt, title: "Verified webhook received", detail: `${webhook.provider} · ${webhook.processedAt ? "Processed" : "Unprocessed"}` });
  for (const transaction of purchase.transactions)
    events.push({ id: `transaction:${transaction.id}`, at: transaction.createdAt, title: "Payment status changed", detail: `${transaction.fromStatus ?? "Created"} → ${transaction.toStatus} · ${transaction.source}` });
  for (const enrollment of purchase.enrollments)
    events.push({ id: `enrollment:${enrollment.id}`, at: enrollment.createdAt, title: "Enrollment granted", detail: enrollment.courseId });
  for (const grant of purchase.accessGrants)
    events.push({ id: `grant:${grant.id}`, at: grant.createdAt, title: "Telegram access grant recorded", detail: `${grant.status} · ${grant.course.titleEn}` });
  for (const audit of audits)
    events.push({ id: `audit:${audit.id}`, at: audit.createdAt, title: audit.action.replaceAll("_", " "), detail: audit.category ?? audit.entityType ?? "Audit" });
  return events.sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id));
}
