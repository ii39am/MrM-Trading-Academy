import { env } from "@/lib/env";
import { registerPaymentProvider } from "@/lib/payment";
import { registerEmailProvider } from "@/lib/email";
import { registerVideoProvider } from "@/lib/video";
import { NowPaymentsProvider } from "@/lib/providers/nowpayments";
import { CloudflareStreamProvider } from "@/lib/providers/cloudflare-stream";
import { ResendEmailProvider } from "@/lib/providers/resend-email";

if(env.NOWPAYMENTS_API_KEY&&env.NOWPAYMENTS_IPN_SECRET&&env.NOWPAYMENTS_CALLBACK_URL){
 registerPaymentProvider(new NowPaymentsProvider(env.NOWPAYMENTS_API_KEY,env.NOWPAYMENTS_IPN_SECRET,env.NOWPAYMENTS_CALLBACK_URL,env.APP_URL));
}

if(env.CLOUDFLARE_ACCOUNT_ID&&env.CLOUDFLARE_STREAM_API_TOKEN&&env.CLOUDFLARE_STREAM_WEBHOOK_SECRET){
 registerVideoProvider(new CloudflareStreamProvider(env.CLOUDFLARE_ACCOUNT_ID,env.CLOUDFLARE_STREAM_API_TOKEN,env.CLOUDFLARE_STREAM_WEBHOOK_SECRET,env.CLOUDFLARE_STREAM_CUSTOMER_CODE));
}else if(env.NODE_ENV!=="production"&&env.E2E_PROVIDER_MOCKS==="true"){
 const { TestVideoProvider }=await import("@/lib/providers/test-video");
 registerVideoProvider(new TestVideoProvider());
}

if(env.EMAIL_PROVIDER==="resend"&&env.RESEND_API_KEY&&env.EMAIL_FROM){
 registerEmailProvider(new ResendEmailProvider(env.RESEND_API_KEY,env.EMAIL_FROM));
}else if(env.NODE_ENV!=="production"&&env.EMAIL_PROVIDER==="test"){
 const { TestEmailProvider }=await import("@/lib/providers/test-email");
 registerEmailProvider(new TestEmailProvider());
}
