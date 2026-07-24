import { getPaymentProvider,processPaymentEvent } from "@/lib/payment";
import { errorResponse } from "@/lib/security";
export async function POST(request:Request){
 const signature=request.headers.get("x-nowpayments-sig");if(!signature)return errorResponse("INVALID_SIGNATURE","Missing signature",400);
 const payload=await request.text();if(payload.length>1_000_000)return errorResponse("PAYLOAD_TOO_LARGE","Payload too large",413);
 try{const provider=getPaymentProvider();const event=await provider.verifyWebhook(payload,signature);const result=await processPaymentEvent(provider.name,event,payload);return Response.json({received:true,duplicate:result.duplicate})}
 catch{return errorResponse("WEBHOOK_REJECTED","Webhook rejected",400)}
}
