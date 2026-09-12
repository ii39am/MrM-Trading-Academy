import {beforeEach,it,expect,vi} from "vitest";
import {Prisma} from "@prisma/client";
const mocks=vi.hoisted(()=>({purchase:vi.fn(),update:vi.fn(),enroll:vi.fn(),send:vi.fn()}));
vi.mock("@/lib/env",()=>({env:{EMAIL_ENABLED:true}}));
vi.mock("@/lib/email",()=>({getEmailProvider:()=>({send:mocks.send}),paymentConfirmedEmail:()=>({subject:"confirmed"})}));
vi.mock("@/lib/audit",()=>({writeAudit:vi.fn().mockResolvedValue(undefined)}));
vi.mock("@/lib/db",()=>({db:{$transaction:async(fn:(tx:unknown)=>unknown)=>fn({
 webhookEvent:{findUnique:async()=>null,create:async()=>({}),update:async()=>({})},
 purchase:{findUnique:mocks.purchase,update:mocks.update},
 paymentTransaction:{create:async()=>({})},
 enrollment:{upsert:mocks.enroll},
 couponRedemption:{updateMany:async()=>({count:0})}
})}}));
import {processPaymentEvent,type VerifiedPaymentEvent} from "@/lib/payment";
const event:VerifiedPaymentEvent={eventId:"event",purchaseId:"p",providerPaymentId:"provider",status:"PAID",providerStatus:"finished",expectedAmount:"14.963173",receivedAmount:"14.963173",payCurrency:"usdttrc20",network:"TRC20",paymentAddress:"address",priceAmount:"15",priceCurrency:"usd",raw:{}};
function purchase(expected="14.963173"){return {id:"p",userId:"u",provider:"nowpayments",providerPaymentId:"provider",expectedAmount:new Prisma.Decimal(expected),receivedAmount:null,payCurrency:"usdttrc20",network:"TRC20",paymentAddress:"address",currency:"USD",amountCents:1500,status:"PENDING",user:{email:"fixture@example.test"},items:[{courseId:"c",course:{titleEn:"Course"}}]}}
beforeEach(()=>{mocks.purchase.mockResolvedValue(purchase());mocks.update.mockResolvedValue({});mocks.enroll.mockResolvedValue({});mocks.send.mockResolvedValue(undefined)});
it.each(["0","-1"])("rejects stored quote %s before any writes",async expected=>{
 mocks.purchase.mockResolvedValue(purchase(expected));
 await expect(processPaymentEvent("nowpayments",event,"fixture")).rejects.toThrow();
 expect(mocks.update).not.toHaveBeenCalled();expect(mocks.enroll).not.toHaveBeenCalled();
});
it.each(["0","-1"])("rejects provider quote %s",async expectedAmount=>{
 await expect(processPaymentEvent("nowpayments",{...event,expectedAmount},"fixture")).rejects.toThrow();expect(mocks.enroll).not.toHaveBeenCalled();
});
it("keeps underpayment pending",async()=>{
 expect(await processPaymentEvent("nowpayments",{...event,receivedAmount:"14.963172"},"fixture")).toMatchObject({status:"PENDING"});
 expect(mocks.enroll).not.toHaveBeenCalled();
});
it.each(["14.963173","15"])("settles valid exact/overpayment %s and defers only email",async receivedAmount=>{
 const tasks:Array<()=>Promise<void>>=[];
 expect(await processPaymentEvent("nowpayments",{...event,receivedAmount},"fixture",task=>tasks.push(task))).toMatchObject({status:"PAID"});
 expect(mocks.enroll).toHaveBeenCalledTimes(1);expect(mocks.send).not.toHaveBeenCalled();
 mocks.send.mockRejectedValueOnce(new Error("delivery failed"));
 await expect(tasks[0]()).resolves.toBeUndefined();
});
it.each(["waiting","confirmed","sending","partially_paid"])("rejects inconsistent PAID candidate %s",async providerStatus=>{
 await expect(processPaymentEvent("nowpayments",{...event,providerStatus},"fixture")).rejects.toThrow("Only finished");
 expect(mocks.enroll).not.toHaveBeenCalled();
});
it.each([{paymentAddress:"other"},{providerPaymentId:"other"},{payCurrency:"btc"},{network:"erc20"},{priceAmount:"1"}])("rejects mismatched settlement %j",async overrides=>{
 await expect(processPaymentEvent("nowpayments",{...event,...overrides},"fixture")).rejects.toThrow();
 expect(mocks.enroll).not.toHaveBeenCalled();
});
