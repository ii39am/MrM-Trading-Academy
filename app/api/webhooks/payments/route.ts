import { getPaymentProvider,processPaymentEvent } from "@/lib/payment";
import { errorResponse } from "@/lib/security";
import { env } from "@/lib/env";
import { writeAudit } from "@/lib/audit";
export async function POST(request:Request){
 if(!env.PAYMENTS_ENABLED)return errorResponse("PAYMENT_UNAVAILABLE","Payments are temporarily unavailable.",503);
 const signature=request.headers.get("x-nowpayments-sig");if(!signature)return errorResponse("INVALID_SIGNATURE","Missing signature",400);
 const payload=await request.text();if(payload.length>1_000_000)return errorResponse("PAYLOAD_TOO_LARGE","Payload too large",413);
 try{const provider=getPaymentProvider();const event=await provider.verifyWebhook(payload,signature);const result=await processPaymentEvent(provider.name,event,payload);await writeAudit({action:"WEBHOOK_ACCEPTED",entityType:"Purchase",entityId:event.purchaseId,category:"PAYMENT",metadata:{purchaseId:event.purchaseId,status:event.status}});return Response.json({received:true,duplicate:result.duplicate})}
 catch{await writeAudit({action:"WEBHOOK_REJECTED",category:"PAYMENT"}).catch(()=>undefined);return errorResponse("WEBHOOK_REJECTED","Webhook rejected",400)}
}
