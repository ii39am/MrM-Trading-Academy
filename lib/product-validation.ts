import { z } from "zod";

const telegramChatId = z.string().trim().max(32).refine(
  value => value === "" || /^-?[1-9]\d{4,19}$/.test(value) || /^@[A-Za-z][A-Za-z0-9_]{4,31}$/.test(value),
  "Telegram chat ID must be a numeric chat ID or @channel username",
);

export const productSchema = z.object({
  slug:z.string().regex(/^[a-z0-9-]{3,80}$/),titleEn:z.string().trim().min(2).max(140),titleAr:z.string().trim().min(2).max(140),shortDescriptionEn:z.string().trim().min(10).max(500),shortDescriptionAr:z.string().trim().min(10).max(500),fullDescriptionEn:z.string().trim().min(20).max(5000),fullDescriptionAr:z.string().trim().min(20).max(5000),instructor:z.string().trim().min(2).max(120),priceCents:z.number().int().positive().max(100_000_000),currency:z.literal("USD"),image:z.string().url().max(2000),accent:z.string().regex(/^#[0-9a-f]{6}$/i),telegramChatId,telegramAccessEnabled:z.boolean(),telegramButtonLabelEn:z.string().trim().max(80).optional().or(z.literal("")),telegramButtonLabelAr:z.string().trim().max(80).optional().or(z.literal("")),published:z.boolean()
}).strict().superRefine((value,ctx)=>{
  if(value.published&&(!value.telegramAccessEnabled||!value.telegramChatId))ctx.addIssue({code:"custom",path:["telegramChatId"],message:"Secure Telegram access must be configured before publication"});
});
