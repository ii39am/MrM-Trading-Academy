import { createHash,createHmac,timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { CheckoutInput,CheckoutSession,PaymentProvider,ProviderPaymentStatus,VerifiedPaymentEvent } from "@/lib/payment";
import { NowPaymentsHttpClient } from "@/lib/providers/nowpayments-client";

const PAY_CURRENCY="usdttrc20",PRICE_CURRENCY="usd",NETWORK="TRC20";
type Json=string|number|boolean|null|Json[]|{[key:string]:Json};

export type NowPaymentsProviderErrorCode="INVALID_INPUT"|"INVALID_SIGNATURE"|"INVALID_RESPONSE"|"BINDING_MISMATCH";
export class NowPaymentsProviderError extends Error{
 readonly name="NowPaymentsProviderError";
 constructor(readonly code:NowPaymentsProviderErrorCode){super("NOWPayments operation failed")}
}

export function canonicalJson(value:Json):string{if(Array.isArray(value))return `[${value.map(canonicalJson).join(",")}]`;if(value&&typeof value==="object")return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;return JSON.stringify(value)}
export function verifyNowPaymentsSignature(payload:string,signature:string,secret:string){let parsed:Json;try{parsed=JSON.parse(payload) as Json}catch{return false}const expected=createHmac("sha512",secret).update(canonicalJson(parsed)).digest("hex"),supplied=signature.trim().toLowerCase();if(supplied.length!==expected.length||!/^[a-f0-9]+$/.test(supplied))return false;return timingSafeEqual(Buffer.from(supplied,"hex"),Buffer.from(expected,"hex"))}
export function usdFromCents(amountCents:number){if(!Number.isSafeInteger(amountCents)||amountCents<=0)throw new NowPaymentsProviderError("INVALID_INPUT");const cents=BigInt(amountCents);return `${cents/100n}.${String(cents%100n).padStart(2,"0")}`}

const decimalValue=z.union([z.string(),z.number().finite()]).transform(String).pipe(z.string().regex(/^\d+(?:\.\d{1,12})?$/).max(43));
const paymentId=z.union([z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),z.number().int().nonnegative()]).transform(String);
const tronAddress=z.string().regex(/^T[1-9A-HJ-NP-Za-km-z]{33}$/);
const providerPayment=z.object({
 payment_id:paymentId,
 payment_status:z.string().min(1).max(40).transform(value=>value.toLowerCase()),
 pay_address:tronAddress,
 pay_amount:decimalValue,
 actually_paid:decimalValue.optional(),
 pay_currency:z.string().min(1).max(40).transform(value=>value.toLowerCase()),
 price_amount:decimalValue,
 price_currency:z.string().min(1).max(20).transform(value=>value.toLowerCase()),
 order_id:z.string().min(1).max(100),
 expiration_estimate_date:z.string().datetime({offset:true}).optional(),
 payin_hash:z.string().min(1).max(200).optional(),
});
type ProviderPayment=z.infer<typeof providerPayment>;

export const mapNowPaymentsStatus=(status:string):"PENDING"|"PAID"|"FAILED"|"EXPIRED"|"CANCELLED"|"REFUNDED"=>{switch(status.toLowerCase()){case "finished":return "PAID";case "failed":return "FAILED";case "expired":return "EXPIRED";case "cancelled":return "CANCELLED";case "refunded":return "REFUNDED";default:return "PENDING"}};
function decimalCanonical(value:string){return value.replace(/^0+(?=\d)/,"").replace(/\.0+$/,"").replace(/(\.\d*?)0+$/,"$1")}
function parsePayment(value:unknown){const result=providerPayment.safeParse(value);if(!result.success)throw new NowPaymentsProviderError("INVALID_RESPONSE");return result.data}
function assertUsdtTrc20(data:ProviderPayment){if(data.pay_currency!==PAY_CURRENCY||data.price_currency!==PRICE_CURRENCY)throw new NowPaymentsProviderError("BINDING_MISMATCH")}
function toStatus(data:ProviderPayment):ProviderPaymentStatus{
 assertUsdtTrc20(data);
 return {purchaseId:data.order_id,providerPaymentId:data.payment_id,status:mapNowPaymentsStatus(data.payment_status),providerStatus:data.payment_status,expectedAmount:data.pay_amount,receivedAmount:data.actually_paid??"0",payCurrency:PAY_CURRENCY,network:NETWORK,paymentAddress:data.pay_address,priceAmount:data.price_amount,priceCurrency:PRICE_CURRENCY,transactionHash:data.payin_hash,expiresAt:data.expiration_estimate_date};
}

export class NowPaymentsProvider implements PaymentProvider{
 readonly name="nowpayments";
 private readonly client:NowPaymentsHttpClient;
 constructor(apiKey:string,private readonly ipnSecret:string,private readonly callbackUrl:string,baseUrl="https://api.nowpayments.io/v1"){this.client=new NowPaymentsHttpClient(apiKey,baseUrl)}

 async createCheckout(input:CheckoutInput):Promise<CheckoutSession>{
  const priceAmount=usdFromCents(input.amountCents);
  const data=parsePayment(await this.client.request("/payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({price_amount:priceAmount,price_currency:PRICE_CURRENCY,pay_currency:PAY_CURRENCY,ipn_callback_url:this.callbackUrl,order_id:input.purchaseId,order_description:`Mr.ME Trading Academy purchase ${input.purchaseId}`})}));
  assertUsdtTrc20(data);
  if(data.order_id!==input.purchaseId||data.payment_status!=="waiting"||decimalCanonical(data.price_amount)!==decimalCanonical(priceAmount))throw new NowPaymentsProviderError("BINDING_MISMATCH");
  return {id:data.payment_id,purchaseId:input.purchaseId,providerStatus:data.payment_status,payAddress:data.pay_address,payAmount:data.pay_amount,payCurrency:PAY_CURRENCY,network:NETWORK,expiresAt:data.expiration_estimate_date};
 }

 async getPaymentStatus(providerPaymentId:string):Promise<ProviderPaymentStatus>{
  const id=paymentId.safeParse(providerPaymentId);if(!id.success)throw new NowPaymentsProviderError("INVALID_INPUT");
  const data=parsePayment(await this.client.request(`/payment/${encodeURIComponent(id.data)}`,{method:"GET"}));
  if(data.payment_id!==id.data)throw new NowPaymentsProviderError("BINDING_MISMATCH");
  return toStatus(data);
 }

 async verifyWebhook(payload:string,signature:string):Promise<VerifiedPaymentEvent>{
  if(!verifyNowPaymentsSignature(payload,signature,this.ipnSecret))throw new NowPaymentsProviderError("INVALID_SIGNATURE");
  let raw:unknown;try{raw=JSON.parse(payload)}catch{throw new NowPaymentsProviderError("INVALID_RESPONSE")}
  const data=parsePayment(raw),status=toStatus(data),received=data.actually_paid??"0";
  const eventId=createHash("sha256").update([data.payment_id,data.order_id,data.payment_status,data.pay_currency,data.pay_amount,received,data.payin_hash??""].join(":")).digest("hex");
  return {...status,eventId,raw};
 }
}
