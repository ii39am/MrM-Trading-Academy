import {beforeEach,it,expect,vi} from "vitest";
const mocks=vi.hoisted(()=>({enabled:true,verify:vi.fn(),process:vi.fn(),after:vi.fn()}));
vi.mock("@/lib/env",()=>({env:{get PAYMENTS_ENABLED(){return mocks.enabled}}}));
vi.mock("next/server",async()=>({...await vi.importActual("next/server"),after:mocks.after}));
vi.mock("@/lib/payment",async()=>({...await vi.importActual("@/lib/payment"),getPaymentProvider:()=>({name:"nowpayments",verifyWebhook:mocks.verify}),processPaymentEvent:mocks.process}));
import {POST} from "@/app/api/webhooks/payments/route";
import {NowPaymentsProviderError} from "@/lib/providers/nowpayments";
import {PaymentProcessingError} from "@/lib/payment";
const request=(signature=true)=>new Request("http://localhost/api/webhooks/payments",{method:"POST",headers:signature?{"x-nowpayments-sig":"synthetic"}:{},body:"{}"});
beforeEach(()=>{mocks.enabled=true;mocks.verify.mockResolvedValue({purchaseId:"p"});mocks.process.mockResolvedValue({duplicate:false})});
it("requires a signature and respects the disabled switch",async()=>{
 expect((await POST(request(false))).status).toBe(400);
 mocks.enabled=false;expect((await POST(request())).status).toBe(503);
 expect(mocks.process).not.toHaveBeenCalled();
});
it("acknowledges persisted work using the framework after lifecycle",async()=>{
 expect((await POST(request())).status).toBe(200);
 expect(mocks.process).toHaveBeenCalledWith("nowpayments",{purchaseId:"p"},"{}",mocks.after);
});
it.each(["INVALID_SIGNATURE","INVALID_RESPONSE"] as const)("rejects %s safely",async code=>{
 mocks.verify.mockRejectedValue(new NowPaymentsProviderError(code));
 expect((await POST(request())).status).toBe(400);expect(mocks.process).not.toHaveBeenCalled();
});
it("separates binding rejection from a transient database failure",async()=>{
 mocks.process.mockRejectedValueOnce(new PaymentProcessingError("BINDING_MISMATCH","internal detail"));
 expect((await POST(request())).status).toBe(400);
 mocks.process.mockRejectedValueOnce(new Error("private database detail"));
 const response=await POST(request());expect(response.status).toBe(503);
 expect(JSON.stringify(await response.json())).not.toContain("private");
});
