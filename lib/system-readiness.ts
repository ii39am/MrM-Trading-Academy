import { db } from "@/lib/db";
import { env } from "@/lib/env";

export type ReadinessItem = { label: string; state: "Configured" | "Missing" | "Enabled" | "Disabled" | "Reachable" | "Unavailable"; ready: boolean };
export async function getSystemReadiness() {
  let database = false;
  try { await db.$queryRaw`SELECT 1`; database = true; } catch {}
  const publishedTelegramCourses = await db.course.count({ where: { status: "PUBLISHED", telegramAccessEnabled: true, telegramChatId: { not: null } } }).catch(() => 0);
  const items: Record<string, ReadinessItem[]> = {
    application: [
      { label: "Database connectivity", state: database ? "Reachable" : "Unavailable", ready: database },
      { label: `Environment mode: ${env.NODE_ENV}`, state: env.NODE_ENV === "production" ? "Enabled" : "Configured", ready: true },
    ],
    payments: [
      { label: "Payments globally enabled", state: env.PAYMENTS_ENABLED ? "Enabled" : "Disabled", ready: env.PAYMENTS_ENABLED },
      { label: "NOWPayments API key", state: env.NOWPAYMENTS_API_KEY ? "Configured" : "Missing", ready: Boolean(env.NOWPAYMENTS_API_KEY) },
      { label: "NOWPayments IPN secret", state: env.NOWPAYMENTS_IPN_SECRET ? "Configured" : "Missing", ready: Boolean(env.NOWPAYMENTS_IPN_SECRET) },
      { label: "Payment callback URL", state: env.NOWPAYMENTS_CALLBACK_URL ? "Configured" : "Missing", ready: Boolean(env.NOWPAYMENTS_CALLBACK_URL) },
      { label: "Reconciliation provider capability", state: env.PAYMENTS_ENABLED && env.NOWPAYMENTS_API_KEY ? "Configured" : "Missing", ready: Boolean(env.PAYMENTS_ENABLED && env.NOWPAYMENTS_API_KEY) },
      { label: "Cron authentication", state: env.CRON_SECRET ? "Configured" : "Missing", ready: Boolean(env.CRON_SECRET) },
    ],
    email: [
      { label: "Email globally enabled", state: env.EMAIL_ENABLED ? "Enabled" : "Disabled", ready: env.EMAIL_ENABLED },
      { label: "Email provider credentials", state: env.EMAIL_PROVIDER && env.EMAIL_FROM && env.RESEND_API_KEY ? "Configured" : "Missing", ready: Boolean(env.EMAIL_PROVIDER && env.EMAIL_FROM && env.RESEND_API_KEY) },
    ],
    telegram: [
      { label: "Telegram access globally enabled", state: env.TELEGRAM_ACCESS_ENABLED ? "Enabled" : "Disabled", ready: env.TELEGRAM_ACCESS_ENABLED },
      { label: "Telegram bot token", state: env.TELEGRAM_BOT_TOKEN ? "Configured" : "Missing", ready: Boolean(env.TELEGRAM_BOT_TOKEN) },
      { label: `Published Telegram-enabled courses: ${publishedTelegramCourses}`, state: publishedTelegramCourses > 0 ? "Configured" : "Missing", ready: publishedTelegramCourses > 0 },
    ],
  };
  return { items, publishedTelegramCourses };
}
