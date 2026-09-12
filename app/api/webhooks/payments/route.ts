import { after } from "next/server";
import { getPaymentProvider,processPaymentEvent,PaymentProcessingError } from "@/lib/payment";
import { NowPaymentsProviderError } from "@/lib/providers/nowpayments";
import { errorResponse } from "@/lib/security";
import { env } from "@/lib/env";
import { PayloadTooLargeError,readWebhookBody } from "@/lib/webhook-body";

export const runtime = "nodejs";

export async function POST(request:Request){
 if(!env.PAYMENTS_ENABLED)return errorResponse("PAYMENT_UNAVAILABLE","Payments are temporarily unavailable.",503);
 const signature=request.headers.get("x-nowpayments-sig");
 if(!signature)return errorResponse("INVALID_SIGNATURE","Missing signature",400);
 let payload:string;
 try{payload=await readWebhookBody(request)}
 catch(error){return errorResponse("WEBHOOK_REJECTED","Webhook rejected",error instanceof PayloadTooLargeError?413:400)}
 try{
  const provider=getPaymentProvider();
  const event=await provider.verifyWebhook(payload,signature);
  // Settlement and its audit records commit before acknowledgment. Next.js
  // tracks best-effort email work with after(), including on supported serverless hosts.
  const result=await processPaymentEvent(provider.name,event,payload,after);
  return Response.json({received:true,duplicate:result.duplicate});
 }catch(error){
  if(error instanceof NowPaymentsProviderError||error instanceof PaymentProcessingError)
   return errorResponse("WEBHOOK_REJECTED","Webhook rejected",400);
  return errorResponse("PAYMENT_PROCESSING_UNAVAILABLE","Payment processing temporarily unavailable",503);
 }
}
