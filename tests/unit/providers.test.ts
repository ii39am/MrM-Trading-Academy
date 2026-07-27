import { createHmac } from "node:crypto";
import { describe,expect,it,vi,afterEach } from "vitest";
import { canonicalJson,NowPaymentsProvider,verifyNowPaymentsSignature } from "@/lib/providers/nowpayments";
import { ResendEmailProvider } from "@/lib/providers/resend-email";
afterEach(()=>vi.unstubAllGlobals());
describe("NOWPayments",()=>{
 it("uses canonical constant-time compatible signature validation",()=>{const payload='{"payment_status":"finished","payment_id":1}',secret="ipn-secret-long-enough",signature=createHmac("sha512",secret).update(canonicalJson(JSON.parse(payload))).digest("hex");expect(verifyNowPaymentsSignature(payload,signature,secret)).toBe(true);expect(verifyNowPaymentsSignature(payload,"00".repeat(64),secret)).toBe(false)});
 it("creates only USDT TRC20 invoices from trusted input",async()=>{const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({payment_id:7,pay_address:"TRON_ADDRESS",pay_amount:12.5,pay_currency:"usdttrc20",order_id:"purchase-1"}),{status:200}));vi.stubGlobal("fetch",fetchMock);const provider=new NowPaymentsProvider("api","secret-secret-secret","https://app.test/api/webhooks/payments","https://app.test");const result=await provider.createCheckout({purchaseId:"purchase-1",userId:"u",courseIds:["c"],amountCents:2500});const sent=JSON.parse(fetchMock.mock.calls[0][1].body);expect(sent).toMatchObject({price_amount:"25.00",price_currency:"usd",pay_currency:"usdttrc20",order_id:"purchase-1",ipn_callback_url:"https://app.test/api/webhooks/payments"});expect(result.network).toBe("TRC20")});
});
describe("Resend email",()=>{
 it("preserves the configured sender and normalizes the recipient",async()=>{
  const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({data:{id:"email-1"},error:null}),{status:200}));
  vi.stubGlobal("fetch",fetchMock);
  const provider=new ResendEmailProvider("secret","Mr.ME Trading Academy <onboarding@resend.dev>");
  await provider.send({to:" User@Example.com ",subject:"Verify",html:"<p>Verify</p>",text:"Verify"});
  const sent=JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(sent.from).toBe("Mr.ME Trading Academy <onboarding@resend.dev>");
  expect(sent.to).toEqual(["user@example.com"]);
 });
 it("rejects a successful HTTP response containing response.error",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({data:null,error:{name:"validation_error",message:"Recipient is not permitted",code:"restricted_recipient",type:"validation_error",statusCode:403}}),{status:200,headers:{"x-request-id":"request-1"}})));
  const provider=new ResendEmailProvider("secret","Mr.ME Trading Academy <onboarding@resend.dev>");
  await expect(provider.send({to:"user@example.com",subject:"Verify",html:"<p>Verify</p>",text:"Verify"})).rejects.toMatchObject({
   name:"ResendEmailError",
   safeDetails:{statusCode:403,errorName:"validation_error",errorMessage:"Recipient is not permitted",providerCode:"restricted_recipient",providerType:"validation_error",requestId:"request-1"}
  });
 });
});
