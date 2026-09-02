import { beforeEach,describe,expect,it,vi } from "vitest";

const mocks=vi.hoisted(()=>({
 user:vi.fn(),createReservedPurchase:vi.fn(),createCheckout:vi.fn(),writeAudit:vi.fn(),purchaseUpdate:vi.fn(),redemptionUpdate:vi.fn(),transaction:vi.fn()
}));
vi.mock("@/lib/auth",()=>({getSessionUser:mocks.user}));
vi.mock("@/lib/env",()=>({env:{PAYMENTS_ENABLED:true}}));
vi.mock("@/lib/payment",()=>({getPaymentProvider:()=>({name:"nowpayments",createCheckout:mocks.createCheckout})}));
vi.mock("@/lib/coupons",()=>({createReservedPurchase:mocks.createReservedPurchase}));
vi.mock("@/lib/audit",()=>({writeAudit:mocks.writeAudit}));
vi.mock("@/lib/db",()=>({db:{purchase:{update:mocks.purchaseUpdate},couponRedemption:{updateMany:mocks.redemptionUpdate},$transaction:mocks.transaction}}));

import { POST } from "@/app/api/purchase/route";
const request=(body:unknown)=>new Request("http://localhost:3000/api/purchase",{method:"POST",headers:{origin:"http://localhost:3000","content-type":"application/json"},body:JSON.stringify(body)});
const purchase={id:"purchase-1",originalAmountCents:1000,discountAmountCents:100,amountCents:900,currency:"USD"};

beforeEach(()=>{mocks.user.mockResolvedValue({id:"user-1",emailVerified:true,role:"STUDENT"});mocks.createReservedPurchase.mockResolvedValue(purchase);mocks.writeAudit.mockResolvedValue({});mocks.createCheckout.mockResolvedValue({id:"payment-1",purchaseId:"purchase-1",providerStatus:"waiting",payAddress:"TRON",payAmount:"1.25",payCurrency:"usdttrc20",network:"TRC20",expiresAt:new Date(Date.now()+60_000).toISOString()});mocks.purchaseUpdate.mockResolvedValue({});mocks.redemptionUpdate.mockResolvedValue({count:1});mocks.transaction.mockImplementation(async(values:unknown[])=>Promise.all(values))});

describe("purchase checkout route",()=>{
 it("requires authentication",async()=>{mocks.user.mockResolvedValue(null);expect((await POST(request({courseIds:["course-1"]}))).status).toBe(401);expect(mocks.createReservedPurchase).not.toHaveBeenCalled()});
 it("requires a verified email",async()=>{mocks.user.mockResolvedValue({id:"user-1",emailVerified:false,role:"STUDENT"});expect((await POST(request({courseIds:["course-1"]}))).status).toBe(403);expect(mocks.createReservedPurchase).not.toHaveBeenCalled()});
 it("rejects duplicate course IDs",async()=>{expect((await POST(request({courseIds:["course-1","course-1"]}))).status).toBe(400);expect(mocks.createReservedPurchase).not.toHaveBeenCalled()});
 it("uses only the reserved server-side total",async()=>{expect((await POST(request({courseIds:["course-1"],amountCents:1}))).status).toBe(400);expect(mocks.createCheckout).not.toHaveBeenCalled();const valid=await POST(request({courseIds:["course-1"]}));expect(valid.status).toBe(201);expect(mocks.createCheckout).toHaveBeenCalledWith(expect.objectContaining({amountCents:900}))});
 it("marks the purchase failed and releases a coupon reservation after provider failure",async()=>{mocks.createCheckout.mockRejectedValue(new Error("provider down"));expect((await POST(request({courseIds:["course-1"],couponCode:"SAVE"}))).status).toBe(503);expect(mocks.purchaseUpdate).toHaveBeenCalledWith({where:{id:"purchase-1"},data:{status:"FAILED",providerStatus:"payment_creation_error"}});expect(mocks.redemptionUpdate).toHaveBeenCalledWith({where:{purchaseId:"purchase-1",status:"RESERVED"},data:{status:"RELEASED",releasedAt:expect.any(Date)}})});
 it("preserves safe provider identifiers as a recoverable pending payment after local persistence failure",async()=>{const log=vi.spyOn(console,"error").mockImplementation(()=>undefined);mocks.purchaseUpdate.mockRejectedValueOnce(new Error("database unavailable")).mockResolvedValueOnce({});expect((await POST(request({courseIds:["course-1"]}))).status).toBe(503);expect(mocks.purchaseUpdate).toHaveBeenLastCalledWith({where:{id:"purchase-1"},data:expect.objectContaining({provider:"nowpayments",providerSessionId:"payment-1",providerPaymentId:"payment-1",status:"PENDING",providerStatus:"persistence_recovery_pending",nextReconcileAt:expect.any(Date),reconciliationErrorCode:"LOCAL_PERSISTENCE_FAILED"})});expect(log).toHaveBeenCalledWith(expect.stringContaining('"purchaseId":"purchase-1"'));expect(log).not.toHaveBeenCalledWith(expect.stringContaining("private"))});
});
