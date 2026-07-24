import { z } from "zod";

const optionalUrl=z.string().url().optional();
const schema=z.object({
 NODE_ENV:z.enum(["development","test","production"]).default("development"),
 DATABASE_URL:z.string().min(1),
 JWT_SECRET:z.string().min(32),
 APP_URL:z.string().url(),
 NEXT_PUBLIC_APP_URL:optionalUrl,
 COURSE_API_URL:optionalUrl,
 NOWPAYMENTS_API_KEY:z.string().min(1).optional(),
 NOWPAYMENTS_IPN_SECRET:z.string().min(16).optional(),
 NOWPAYMENTS_CALLBACK_URL:optionalUrl,
 CLOUDFLARE_ACCOUNT_ID:z.string().min(1).optional(),
 CLOUDFLARE_STREAM_API_TOKEN:z.string().min(1).optional(),
 CLOUDFLARE_STREAM_WEBHOOK_SECRET:z.string().min(16).optional(),
 CLOUDFLARE_STREAM_CUSTOMER_CODE:z.string().min(1).optional(),
 EMAIL_PROVIDER:z.enum(["resend","test"]).optional(),
 EMAIL_FROM:z.string().min(3).max(320).optional(),
 RESEND_API_KEY:z.string().min(1).optional(),
 PLAYBACK_SESSION_LIMIT:z.coerce.number().int().min(1).max(10).default(2),
 TRUST_PROXY:z.enum(["true","false"]).default("false"),
 E2E_EMAIL_CODE:z.string().regex(/^\d{6}$/).optional(),
 E2E_PROVIDER_MOCKS:z.enum(["true"]).optional(),
}).superRefine((value,ctx)=>{
 if(value.NODE_ENV!=="production")return;
 const required=["NOWPAYMENTS_API_KEY","NOWPAYMENTS_IPN_SECRET","NOWPAYMENTS_CALLBACK_URL","CLOUDFLARE_ACCOUNT_ID","CLOUDFLARE_STREAM_API_TOKEN","CLOUDFLARE_STREAM_WEBHOOK_SECRET","EMAIL_PROVIDER","EMAIL_FROM","RESEND_API_KEY"] as const;
 for(const key of required)if(!value[key])ctx.addIssue({code:"custom",path:[key],message:`${key} is required in production`});
 if(value.EMAIL_PROVIDER&&value.EMAIL_PROVIDER!=="resend")ctx.addIssue({code:"custom",path:["EMAIL_PROVIDER"],message:"EMAIL_PROVIDER must be resend in production"});
});
const parsed=schema.safeParse({
 ...process.env,
 APP_URL:process.env.APP_URL??process.env.NEXT_PUBLIC_APP_URL,
 NEXT_PUBLIC_APP_URL:process.env.NEXT_PUBLIC_APP_URL||undefined,
 COURSE_API_URL:process.env.COURSE_API_URL||undefined,
 NOWPAYMENTS_CALLBACK_URL:process.env.NOWPAYMENTS_CALLBACK_URL||undefined,
});

if(!parsed.success){
 const details=parsed.error.issues.map(issue=>`${issue.path.join(".")||"environment"}: ${issue.message}`).join("; ");
 throw new Error(`Invalid server environment: ${details}`);
}

export const env=parsed.data;
