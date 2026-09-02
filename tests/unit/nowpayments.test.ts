import { createHmac } from "node:crypto";
import { afterEach,describe,expect,it,vi } from "vitest";
import { canonicalJson,mapNowPaymentsStatus,NowPaymentsProvider,usdFromCents,verifyNowPaymentsSignature } from "@/lib/providers/nowpayments";
import { NowPaymentsHttpClient,NowPaymentsHttpError } from "@/lib/providers/nowpayments-client";

const API_KEY="private-api-key-never-return",SECRET="ipn-secret-long-enough",CALLBACK="https://academy.test/api/webhooks/payments",BASE="https://api-sandbox.nowpayments.io/v1",ADDRESS=`T${"A".repeat(33)}`;
const payment=(overrides:Record<string,unknown>={})=>({payment_id:7,payment_status:"waiting",pay_address:ADDRESS,pay_amount:"12.500000",actually_paid:"0",pay_currency:"usdttrc20",price_amount:"25.00",price_currency:"usd",order_id:"purchase-1",expiration_estimate_date:"2026-09-01T12:00:00.000Z",...overrides});
const provider=()=>new NowPaymentsProvider(API_KEY,SECRET,CALLBACK,BASE);
const jsonResponse=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()});

describe("NOWPayments Create Payment",()=>{
 it("creates and validates a USDT TRC20 payment from authoritative fields",async()=>{const fetchMock=vi.fn().mockResolvedValue(jsonResponse(payment()));vi.stubGlobal("fetch",fetchMock);await expect(provider().createCheckout({purchaseId:"purchase-1",userId:"user-1",courseIds:["course-1"],amountCents:2500})).resolves.toEqual({id:"7",purchaseId:"purchase-1",providerStatus:"waiting",payAddress:ADDRESS,payAmount:"12.500000",payCurrency:"usdttrc20",network:"TRC20",expiresAt:"2026-09-01T12:00:00.000Z"});const [url,request]=fetchMock.mock.calls[0],body=JSON.parse(request.body);expect(url).toBe(`${BASE}/payment`);expect(request.method).toBe("POST");expect(request.headers).toMatchObject({"x-api-key":API_KEY,"Content-Type":"application/json"});expect(body).toEqual({price_amount:"25.00",price_currency:"usd",pay_currency:"usdttrc20",ipn_callback_url:CALLBACK,order_id:"purchase-1",order_description:"Mr.ME Trading Academy purchase purchase-1"})});
 it.each([[9900,"99.00"],[1,"0.01"],[100,"1.00"],[9007199254740991,"90071992547409.91"]] as const)("converts %i cents to %s without floating-point arithmetic",(cents,usd)=>expect(usdFromCents(cents)).toBe(usd));
 it("does not allow caller fields to override currency, callback, order ID, or price",async()=>{const fetchMock=vi.fn().mockResolvedValue(jsonResponse(payment()));vi.stubGlobal("fetch",fetchMock);await provider().createCheckout({purchaseId:"purchase-1",userId:"user-1",courseIds:["course-1"],amountCents:2500,...{pay_currency:"btc",price_amount:"0.01",ipn_callback_url:"https://attacker.test",order_id:"attacker"}} as never);expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({price_amount:"25.00",price_currency:"usd",pay_currency:"usdttrc20",ipn_callback_url:CALLBACK,order_id:"purchase-1"})});
 it.each([
  ["missing payment ID",payment({payment_id:undefined})],
  ["wrong pay currency",payment({pay_currency:"usdterc20"})],
  ["wrong price currency",payment({price_currency:"eur"})],
  ["invalid payment address",payment({pay_address:"not-a-tron-address"})],
  ["invalid amount",payment({pay_amount:"NaN"})],
  ["wrong order binding",payment({order_id:"other"})],
  ["wrong price binding",payment({price_amount:"24.99"})],
  ["unexpected initial status",payment({payment_status:"finished"})],
 ] as const)("rejects %s",async(_,body)=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(jsonResponse(body)));await expect(provider().createCheckout({purchaseId:"purchase-1",userId:"u",courseIds:["c"],amountCents:2500})).rejects.toThrow("NOWPayments operation failed")});
 it("rejects malformed provider JSON",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("{",{status:200})));await expect(provider().createCheckout({purchaseId:"purchase-1",userId:"u",courseIds:["c"],amountCents:2500})).rejects.toMatchObject({code:"MALFORMED_JSON"})});
});

describe("NOWPayments HTTP failures",()=>{
 it.each([[400,"HTTP_4XX"],[401,"HTTP_4XX"],[500,"HTTP_5XX"]] as const)("returns a typed safe error for HTTP %i",async(status,code)=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({message:`rejected ${API_KEY}`}),{status})));const error=await provider().createCheckout({purchaseId:"purchase-1",userId:"u",courseIds:["c"],amountCents:2500}).catch(value=>value);expect(error).toBeInstanceOf(NowPaymentsHttpError);expect(error).toMatchObject({code,statusCode:status,message:"NOWPayments request failed"});expect(JSON.stringify(error)).not.toContain(API_KEY)});
 it("returns a typed timeout without retrying",async()=>{const fetchMock=vi.fn((_url:string,init:RequestInit)=>new Promise((_resolve,reject)=>init.signal?.addEventListener("abort",()=>reject(new DOMException("aborted","AbortError")))));vi.stubGlobal("fetch",fetchMock);await expect(new NowPaymentsHttpClient(API_KEY,BASE,5).request("/payment")).rejects.toMatchObject({code:"TIMEOUT",message:"NOWPayments request failed"});expect(fetchMock).toHaveBeenCalledTimes(1)});
 it("returns a typed network failure without leaking credentials",async()=>{vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error(`DNS failure ${API_KEY}`)));const error=await provider().createCheckout({purchaseId:"purchase-1",userId:"u",courseIds:["c"],amountCents:2500}).catch(value=>value);expect(error).toMatchObject({code:"NETWORK",message:"NOWPayments request failed"});expect(error.message).not.toContain(API_KEY)});
});

describe("NOWPayments payment status and IPN",()=>{
 it("gets and validates payment status by provider ID",async()=>{const fetchMock=vi.fn().mockResolvedValue(jsonResponse(payment({payment_status:"confirmed",actually_paid:"12"})));vi.stubGlobal("fetch",fetchMock);await expect(provider().getPaymentStatus("7")).resolves.toMatchObject({purchaseId:"purchase-1",providerPaymentId:"7",providerStatus:"confirmed",status:"PENDING",expectedAmount:"12.500000",receivedAmount:"12",payCurrency:"usdttrc20",network:"TRC20",paymentAddress:ADDRESS,priceAmount:"25.00",priceCurrency:"usd"});expect(fetchMock).toHaveBeenCalledWith(`${BASE}/payment/7`,expect.objectContaining({method:"GET",headers:{"x-api-key":API_KEY}}))});
 it.each([new Response("{",{status:200}),jsonResponse(payment({payment_id:undefined})),jsonResponse(payment({payment_id:8}))])("rejects malformed or mismatched status responses",async(response)=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(response));await expect(provider().getPaymentStatus("7")).rejects.toThrow()});
 it.each([
  ["waiting","PENDING"],["confirming","PENDING"],["confirmed","PENDING"],["sending","PENDING"],["partially_paid","PENDING"],["finished","PAID"],["expired","EXPIRED"],["failed","FAILED"],["refunded","REFUNDED"],["blocked_by_provider","PENDING"],
 ] as const)("maps %s conservatively to %s",(providerStatus,internal)=>expect(mapNowPaymentsStatus(providerStatus)).toBe(internal));
 it("verifies the documented IPN shape and normalizes it",async()=>{const body=payment({payment_status:"finished",actually_paid:"12.5",payin_hash:"hash-1"}),payload=JSON.stringify(body),signature=createHmac("sha512",SECRET).update(canonicalJson(body)).digest("hex");await expect(provider().verifyWebhook(payload,signature)).resolves.toMatchObject({purchaseId:"purchase-1",providerPaymentId:"7",status:"PAID",providerStatus:"finished",expectedAmount:"12.500000",receivedAmount:"12.5",payCurrency:"usdttrc20",network:"TRC20",paymentAddress:ADDRESS,priceAmount:"25.00",priceCurrency:"usd",transactionHash:"hash-1"})});
 it("fails closed for invalid signatures and modified payloads",async()=>{const body=payment(),payload=JSON.stringify(body),signature=createHmac("sha512",SECRET).update(canonicalJson(body)).digest("hex");expect(verifyNowPaymentsSignature(payload,signature,SECRET)).toBe(true);expect(verifyNowPaymentsSignature(payload.replace("waiting","finished"),signature,SECRET)).toBe(false);await expect(provider().verifyWebhook(payload,"00".repeat(64))).rejects.toMatchObject({code:"INVALID_SIGNATURE"})});
 it("rejects a correctly signed but unexpected IPN schema before fulfillment",async()=>{const body=payment({pay_address:"invalid"}),payload=JSON.stringify(body),signature=createHmac("sha512",SECRET).update(canonicalJson(body)).digest("hex");await expect(provider().verifyWebhook(payload,signature)).rejects.toMatchObject({code:"INVALID_RESPONSE"})});
});
