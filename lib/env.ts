import { z } from "zod";

const optionalUrl = z.string().url().optional();
const nowPaymentsApiBase = z
  .enum([
    "https://api.nowpayments.io/v1",
    "https://api-sandbox.nowpayments.io/v1",
  ])
  .default("https://api.nowpayments.io/v1");
const featureFlag = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");
const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    APP_URL: z.string().url(),
    PAYMENTS_ENABLED: featureFlag,
    EMAIL_ENABLED: featureFlag,
    TELEGRAM_ACCESS_ENABLED: featureFlag,
    NEXT_PUBLIC_APP_URL: optionalUrl,
    COURSE_API_URL: optionalUrl,
    NOWPAYMENTS_API_KEY: z.string().min(1).optional(),
    NOWPAYMENTS_IPN_SECRET: z.string().min(16).optional(),
    NOWPAYMENTS_CALLBACK_URL: optionalUrl,
    NOWPAYMENTS_API_BASE_URL: nowPaymentsApiBase,
    CRON_SECRET: z.string().min(32).optional(),
    TELEGRAM_BOT_TOKEN: z.string().min(30).optional(),
    EMAIL_PROVIDER: z.enum(["resend", "test"]).optional(),
    EMAIL_FROM: z.string().min(3).max(320).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    TRUST_PROXY: z.enum(["true", "false"]).default("false"),
    E2E_EMAIL_CODE: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
  })
  .superRefine((value, ctx) => {
    const placeholder =
      /(change[-_ ]?me|replace[-_ ]?with|placeholder|example|test[-_ ]?secret)/i;
    if (
      value.NODE_ENV === "production" &&
      (value.JWT_SECRET.length < 48 ||
        placeholder.test(value.JWT_SECRET) ||
        new Set(value.JWT_SECRET).size < 12)
    )
      ctx.addIssue({
        code: "custom",
        path: ["JWT_SECRET"],
        message:
          "JWT_SECRET must be a strong, non-placeholder secret in production",
      });
    if (
      value.NODE_ENV === "production" &&
      value.CRON_SECRET &&
      (placeholder.test(value.CRON_SECRET) ||
        new Set(value.CRON_SECRET).size < 12)
    )
      ctx.addIssue({
        code: "custom",
        path: ["CRON_SECRET"],
        message:
          "CRON_SECRET must be a strong, non-placeholder secret in production",
      });
    if (value.PAYMENTS_ENABLED) {
      const required = [
        "NOWPAYMENTS_API_KEY",
        "NOWPAYMENTS_IPN_SECRET",
        "NOWPAYMENTS_CALLBACK_URL",
      ] as const;
      for (const key of required)
        if (!value[key])
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required when PAYMENTS_ENABLED=true`,
          });
      if (value.NODE_ENV === "production") {
        for (const key of [
          "NOWPAYMENTS_API_KEY",
          "NOWPAYMENTS_IPN_SECRET",
        ] as const)
          if (value[key] && placeholder.test(value[key]))
            ctx.addIssue({
              code: "custom",
              path: [key],
              message: `${key} cannot be a placeholder in production`,
            });
        if (value.NOWPAYMENTS_CALLBACK_URL) {
          const callback = new URL(value.NOWPAYMENTS_CALLBACK_URL),
            app = new URL(value.APP_URL);
          if (
            callback.protocol !== "https:" ||
            callback.origin !== app.origin ||
            callback.pathname !== "/api/webhooks/payments"
          )
            ctx.addIssue({
              code: "custom",
              path: ["NOWPAYMENTS_CALLBACK_URL"],
              message:
                "Production payment callback must use APP_URL over HTTPS and the payment webhook path",
            });
        }
        if (value.NOWPAYMENTS_API_BASE_URL !== "https://api.nowpayments.io/v1")
          ctx.addIssue({
            code: "custom",
            path: ["NOWPAYMENTS_API_BASE_URL"],
            message:
              "Production payments must use the production NOWPayments API",
          });
      }
    }
    if (value.EMAIL_ENABLED) {
      const required = [
        "EMAIL_PROVIDER",
        "EMAIL_FROM",
        "RESEND_API_KEY",
      ] as const;
      for (const key of required)
        if (!value[key])
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required when EMAIL_ENABLED=true`,
          });
      if (
        value.NODE_ENV === "production" &&
        value.EMAIL_PROVIDER &&
        value.EMAIL_PROVIDER !== "resend"
      )
        ctx.addIssue({
          code: "custom",
          path: ["EMAIL_PROVIDER"],
          message: "EMAIL_PROVIDER must be resend in production",
        });
    }
    if (value.TELEGRAM_ACCESS_ENABLED) {
      if (!value.TELEGRAM_BOT_TOKEN)
        ctx.addIssue({
          code: "custom",
          path: ["TELEGRAM_BOT_TOKEN"],
          message:
            "TELEGRAM_BOT_TOKEN is required when TELEGRAM_ACCESS_ENABLED=true",
        });
      if (
        value.NODE_ENV === "production" &&
        value.TELEGRAM_BOT_TOKEN &&
        (placeholder.test(value.TELEGRAM_BOT_TOKEN) ||
          !/^\d{5,15}:[A-Za-z0-9_-]{20,}$/.test(value.TELEGRAM_BOT_TOKEN))
      )
        ctx.addIssue({
          code: "custom",
          path: ["TELEGRAM_BOT_TOKEN"],
          message:
            "TELEGRAM_BOT_TOKEN must be a valid non-placeholder bot token in production",
        });
    }
  });
const parsed = schema.safeParse({
  ...process.env,
  APP_URL: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
  COURSE_API_URL: process.env.COURSE_API_URL || undefined,
  NOWPAYMENTS_CALLBACK_URL: process.env.NOWPAYMENTS_CALLBACK_URL || undefined,
  NOWPAYMENTS_API_BASE_URL: process.env.NOWPAYMENTS_API_BASE_URL || undefined,
  CRON_SECRET: process.env.CRON_SECRET || undefined,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || undefined,
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map(
      (issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`,
    )
    .join("; ");
  throw new Error(`Invalid server environment: ${details}`);
}

export const env = parsed.data;
