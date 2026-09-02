import { env } from "@/lib/env";
import { registerPaymentProvider } from "@/lib/payment";
import { registerEmailProvider } from "@/lib/email";
import { NowPaymentsProvider } from "@/lib/providers/nowpayments";
import { ResendEmailProvider } from "@/lib/providers/resend-email";
import { TelegramBotClient } from "@/lib/providers/telegram";
import { registerTelegramProvider } from "@/lib/telegram-access";

if(env.PAYMENTS_ENABLED&&env.NOWPAYMENTS_API_KEY&&env.NOWPAYMENTS_IPN_SECRET&&env.NOWPAYMENTS_CALLBACK_URL){
 registerPaymentProvider(new NowPaymentsProvider(env.NOWPAYMENTS_API_KEY,env.NOWPAYMENTS_IPN_SECRET,env.NOWPAYMENTS_CALLBACK_URL,env.NOWPAYMENTS_API_BASE_URL));
}

if(env.EMAIL_ENABLED&&env.EMAIL_PROVIDER==="resend"&&env.RESEND_API_KEY&&env.EMAIL_FROM){
 registerEmailProvider(new ResendEmailProvider(env.RESEND_API_KEY,env.EMAIL_FROM));
}else if(env.NODE_ENV!=="production"&&env.EMAIL_PROVIDER==="test"){
 const { TestEmailProvider }=await import("@/lib/providers/test-email");
 registerEmailProvider(new TestEmailProvider());
}

if(env.TELEGRAM_ACCESS_ENABLED&&env.TELEGRAM_BOT_TOKEN){
 registerTelegramProvider(new TelegramBotClient(env.TELEGRAM_BOT_TOKEN));
}
