import { createHmac,timingSafeEqual,createHash } from "node:crypto";
import type { CheckoutInput,CheckoutSession,PaymentProvider,VerifiedPaymentEvent } from "@/lib/payment";
type Json=string|number|boolean|null|Json[]|{[key:string]:Json};
export function canonicalJson(value:Json):string{if(Array.isArray(value))return `[${value.map(canonicalJson).join(",")}]`;if(value&&typeof value==="object")return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;return JSON.stringify(value)}
export function verifyNowPaymentsSignature(payload:string,signature:string,secret:string){let parsed:Json;try{parsed=JSON.parse(payload) as Json}catch{return false}const expected=createHmac("sha512",secret).update(canonicalJson(parsed)).digest("hex"),supplied=signature.trim().toLowerCase();if(supplied.length!==expected.length||!/^[a-f0-9]+$/.test(supplied))return false;return timingSafeEqual(Buffer.from(supplied,"hex"),Buffer.from(expected,"hex"))}
const mapStatus=(status:string):"PENDING"|"PAID"|"FAILED"|"CANCELLED"|"REFUNDED"=>{if(["finished","confirmed"].includes(status))return "PAID";if(status==="failed")return "FAILED";if(["expired","cancelled"].includes(status))return "CANCELLED";if(status==="refunded")return "REFUNDED";return "PENDING"};
export class NowPaymentsProvider implements PaymentProvider{
 readonly name="nowpayments";
 constructor(private apiKey:string,private ipnSecret:string,private callbackUrl:string,private appUrl:string){}
 async createCheckout(input:CheckoutInput):Promise<CheckoutSession>{
  const response=await fetch("https://api.nowpayments.io/v1/payment",{method:"POST",headers:{"x-api-key":this.apiKey,"Content-Type":"application/json"},body:JSON.stringify({price_amount:(input.amountCents/100).toFixed(2),price_currency:"usd",pay_currency:"usdttrc20",order_id:input.purchaseId,order_description:`Mr.M Academy purchase ${input.purchaseId}`,ipn_callback_url:this.callbackUrl,success_url:`${this.appUrl}/dashboard?payment=${input.purchaseId}`,cancel_url:`${this.appUrl}/courses`}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error("NOWPayments invoice creation failed");
  const data=await response.json() as {payment_id:number|string;pay_address:string;pay_amount:number;pay_currency:string;order_id:string;expiration_estimate_date?:string};
  if(data.order_id!==input.purchaseId||data.pay_currency.toLowerCase()!=="usdttrc20")throw new Error("Invalid NOWPayments response");
  return {id:String(data.payment_id),purchaseId:input.purchaseId,payAddress:data.pay_address,payAmount:String(data.pay_amount),payCurrency:"usdttrc20",network:"TRC20",expiresAt:data.expiration_estimate_date??new Date(Date.now()+20*60_000).toISOString()};
 }
 async verifyWebhook(payload:string,signature:string):Promise<VerifiedPaymentEvent>{
  if(!verifyNowPaymentsSignature(payload,signature,this.ipnSecret))throw new Error("Invalid IPN signature");
  const data=JSON.parse(payload) as {payment_id:number|string;payment_status:string;pay_currency:string;actually_paid?:number;outcome_amount?:number;order_id:string;payin_hash?:string};
  const received=String(data.actually_paid??data.outcome_amount??0),network=data.pay_currency.toLowerCase()==="usdttrc20"?"TRC20":"INVALID";
  const eventId=createHash("sha256").update(`${data.payment_id}:${data.payment_status}:${received}:${data.payin_hash??""}`).digest("hex");
  return {eventId,purchaseId:data.order_id,providerPaymentId:String(data.payment_id),status:mapStatus(data.payment_status),providerStatus:data.payment_status,receivedAmount:received,payCurrency:data.pay_currency,network,transactionHash:data.payin_hash,raw:data};
 }
}
