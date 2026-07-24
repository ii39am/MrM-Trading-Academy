import { createHmac } from "node:crypto";
import { describe,expect,it,vi,afterEach } from "vitest";
import { canonicalJson,NowPaymentsProvider,verifyNowPaymentsSignature } from "@/lib/providers/nowpayments";
import { CloudflareStreamProvider } from "@/lib/providers/cloudflare-stream";
import { verifyStreamWebhookSignature } from "@/lib/video";
afterEach(()=>vi.unstubAllGlobals());
describe("NOWPayments",()=>{
 it("uses canonical constant-time compatible signature validation",()=>{const payload='{"payment_status":"finished","payment_id":1}',secret="ipn-secret-long-enough",signature=createHmac("sha512",secret).update(canonicalJson(JSON.parse(payload))).digest("hex");expect(verifyNowPaymentsSignature(payload,signature,secret)).toBe(true);expect(verifyNowPaymentsSignature(payload,"00".repeat(64),secret)).toBe(false)});
 it("creates only USDT TRC20 invoices from trusted input",async()=>{const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({payment_id:7,pay_address:"TRON_ADDRESS",pay_amount:12.5,pay_currency:"usdttrc20",order_id:"purchase-1"}),{status:200}));vi.stubGlobal("fetch",fetchMock);const provider=new NowPaymentsProvider("api","secret-secret-secret","https://app.test/api/webhooks/payments","https://app.test");const result=await provider.createCheckout({purchaseId:"purchase-1",userId:"u",courseIds:["c"],amountCents:2500});const sent=JSON.parse(fetchMock.mock.calls[0][1].body);expect(sent).toMatchObject({price_amount:"25.00",price_currency:"usd",pay_currency:"usdttrc20",order_id:"purchase-1",ipn_callback_url:"https://app.test/api/webhooks/payments"});expect(result.network).toBe("TRC20")});
});
describe("Cloudflare Stream",()=>{
 it("rejects forged and expired webhooks",()=>{const payload='{"uid":"video","readyToStream":true}',secret="stream-secret-long-enough",time=Math.floor(Date.now()/1000),signature=createHmac("sha256",secret).update(`${time}.${payload}`).digest("hex");expect(verifyStreamWebhookSignature(payload,`time=${time},sig1=${signature}`,secret)).toBe(true);expect(verifyStreamWebhookSignature(payload,`time=${time},sig1=${"00".repeat(32)}`,secret)).toBe(false);expect(verifyStreamWebhookSignature(payload,`time=${time-1000},sig1=${signature}`,secret)).toBe(false)});
 it("maps verified processing completion",()=>{const payload='{"uid":"video","readyToStream":true,"duration":12,"thumbnail":"https://example.test/t.jpg"}',secret="stream-secret-long-enough",time=Math.floor(Date.now()/1000),signature=createHmac("sha256",secret).update(`${time}.${payload}`).digest("hex");const provider=new CloudflareStreamProvider("account","token",secret);expect(provider.verifyWebhook(payload,`time=${time},sig1=${signature}`)).toMatchObject({uid:"video",state:"READY",ready:true,durationSeconds:12})});
});
