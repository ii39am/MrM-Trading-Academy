import { z } from "zod";

const optionalUrl=z.string().url().optional();
const featureFlag=z.enum(["true","false"]).default("false").transform(value=>value==="true");
const schema=z.object({
 NODE_ENV:z.enum(["development","test","production"]).default("development"),
 DATABASE_URL:z.string().min(1),
 JWT_SECRET:z.string().min(32),
 APP_URL:z.string().url(),
 PAYMENTS_ENABLED:featureFlag,
 EMAIL_ENABLED:featureFlag,
 NEXT_PUBLIC_APP_URL:optionalUrl,
 COURSE_API_URL:optionalUrl,
 NOWPAYMENTS_API_KEY:z.string().min(1).optional(),
 NOWPAYMENTS_IPN_SECRET:z.string().min(16).optional(),
 NOWPAYMENTS_CALLBACK_URL:optionalUrl,
 EMAIL_PROVIDER:z.enum(["resend","test"]).optional(),
 EMAIL_FROM:z.string().min(3).max(320).optional(),
 RESEND_API_KEY:z.string().min(1).optional(),
 TRUST_PROXY:z.enum(["true","false"]).default("false"),
 E2E_EMAIL_CODE:z.string().regex(/^\d{6}$/).optional(),
}).superRefine((value,ctx)=>{
 if(value.PAYMENTS_ENABLED){
  const required=["NOWPAYMENTS_API_KEY","NOWPAYMENTS_IPN_SECRET","NOWPAYMENTS_CALLBACK_URL"] as const;
  for(const key of required)if(!value[key])ctx.addIssue({code:"custom",path:[key],message:`${key} is required when PAYMENTS_ENABLED=true`});
 }
 if(value.EMAIL_ENABLED){
  const required=["EMAIL_PROVIDER","EMAIL_FROM","RESEND_API_KEY"] as const;
  for(const key of required)if(!value[key])ctx.addIssue({code:"custom",path:[key],message:`${key} is required when EMAIL_ENABLED=true`});
  if(value.NODE_ENV==="production"&&value.EMAIL_PROVIDER&&value.EMAIL_PROVIDER!=="resend")ctx.addIssue({code:"custom",path:["EMAIL_PROVIDER"],message:"EMAIL_PROVIDER must be resend in production"});
 }
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
