import {createHmac,randomBytes,randomUUID} from "node:crypto";
import {SignJWT} from "jose";
import {Prisma} from "@prisma/client";
import {afterAll,beforeAll,beforeEach,expect,it,vi} from "vitest";
import {db} from "@/lib/db";
import {hashSessionId} from "@/lib/auth";
import {createReservedPurchase} from "@/lib/coupons";
import {registerPaymentProvider} from "@/lib/payment";
import {NowPaymentsProvider,canonicalJson} from "@/lib/providers/nowpayments";
import {reconcilePurchase} from "@/lib/payment-reconciliation";
const context=vi.hoisted(()=>({token:"",enabled:true}));
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>context.token?{value:context.token}:undefined})}));
vi.mock("next/server",async()=>({...await vi.importActual("next/server"),after:vi.fn()}));
vi.mock("@/lib/env",()=>({env:{get PAYMENTS_ENABLED(){return context.enabled},EMAIL_ENABLED:false}}));
import {POST} from "@/app/api/webhooks/payments/route";
import {GET} from "@/app/api/purchases/[id]/route";
import {POST as manual} from "@/app/api/admin/purchases/[id]/reconcile/route";
const suffix=randomUUID(),owner="life-owner-"+suffix,other="life-other-"+suffix,course="life-course-"+suffix;
const secret=randomBytes(32).toString("hex");
const provider=new NowPaymentsProvider(secret,secret,"https://fixture.invalid/api/webhooks/payments");
let couponId:string;
const events:string[]=[];
const originalTransaction=db.$transaction.bind(db);
beforeAll(async()=>{
 await db.user.createMany({data:[owner,other].map(id=>({id,name:"Fixture",email:id+"@example.test",normalizedEmail:id+"@example.test",passwordHash:"unused",status:"ACTIVE",emailVerifiedAt:new Date(),role:"ADMIN"}))});
 await db.course.create({data:{id:course,slug:course,titleEn:"Fixture",titleAr:"Fixture",shortDescriptionEn:"Fixture",shortDescriptionAr:"Fixture",fullDescriptionEn:"Fixture",fullDescriptionAr:"Fixture",instructor:"Fixture",priceCents:2000,currency:"USD",image:"https://example.test/course.jpg",accent:"#000000",status:"PUBLISHED",publishedAt:new Date(),telegramChatId:"-1001234567890",telegramAccessEnabled:true}});
 couponId=(await db.coupon.create({data:{code:suffix,normalizedCode:suffix.toUpperCase(),descriptionEn:"Fixture",descriptionAr:"Fixture",discountType:"PERCENTAGE",discountValue:25,createdByUserId:owner}})).id;
});
beforeEach(async()=>{
 vi.restoreAllMocks();db.$transaction=originalTransaction;context.enabled=true;context.token="";registerPaymentProvider(provider);
 await db.courseAccessGrant.deleteMany({where:{userId:owner}});
 await db.enrollment.deleteMany({where:{userId:owner}});
});
afterAll(async()=>{
 vi.restoreAllMocks();db.$transaction=originalTransaction;
 await db.courseAccessGrant.deleteMany({where:{userId:owner}});
 await db.enrollment.deleteMany({where:{userId:owner}});
 await db.couponRedemption.deleteMany({where:{userId:owner}});
 await db.purchase.deleteMany({where:{userId:owner}});
 await db.coupon.delete({where:{id:couponId}});
 await db.course.delete({where:{id:course}});
 await db.user.deleteMany({where:{id:{in:[owner,other]}}});
 await db.webhookEvent.deleteMany({where:{id:{in:events}}});
 await db.$disconnect();
});
async function fixture(){
 const p=await createReservedPurchase({userId:owner,courseIds:[course],couponCode:suffix,provider:"nowpayments"});
 const paymentId="provider-"+p.id,address="T"+"A".repeat(33);
 await db.purchase.update({where:{id:p.id},data:{providerPaymentId:paymentId,providerSessionId:paymentId,expectedAmount:"14.963173",paymentAddress:address}});
 return {payment_id:paymentId,order_id:p.id,pay_address:address,payment_status:"finished",price_amount:15,price_currency:"usd",pay_amount:14.963173,actually_paid:14.963173,outcome_amount:14.813541,pay_currency:"usdttrc20",network:"trx",payin_hash:null};
}
async function deliver(body:Awaited<ReturnType<typeof fixture>>,invalid=false){
 const payload=JSON.stringify(body),signature=createHmac("sha512",secret).update(canonicalJson(body)).digest("hex");
 events.push((await provider.verifyWebhook(payload,signature)).eventId);
 return POST(new Request("http://localhost:3000/api/webhooks/payments",{method:"POST",headers:{"x-nowpayments-sig":invalid?"00".repeat(64):signature},body:payload}));
}
async function login(userId:string){
 const id=randomUUID();
 await db.session.create({data:{id:hashSessionId(id),userId,expiresAt:new Date(Date.now()+60000)}});
 context.token=await new SignJWT({sv:1}).setProtectedHeader({alg:"HS256"}).setSubject(userId).setJti(id).setIssuer("mr-m-academy").setAudience("mr-m-web").setExpirationTime("1m").sign(new TextEncoder().encode(process.env.JWT_SECRET!));
}
it("settles a signed fixture and redeems the coupon exactly once across duplicate delivery",async()=>{
 const body=await fixture();
 expect((await deliver(body)).status).toBe(200);
 expect(await (await deliver(body)).json()).toMatchObject({duplicate:true});
 expect((await db.purchase.findUniqueOrThrow({where:{id:body.order_id}})).status).toBe("PAID");
 expect(await db.enrollment.count({where:{purchaseId:body.order_id}})).toBe(1);
 expect(await db.paymentTransaction.count({where:{purchaseId:body.order_id}})).toBe(1);
 expect((await db.couponRedemption.findUniqueOrThrow({where:{purchaseId:body.order_id}})).status).toBe("REDEEMED");
});
it("rejects a forged signature without database fulfillment",async()=>{
 const body=await fixture();expect((await deliver(body,true)).status).toBe(400);
 expect(await db.enrollment.count({where:{purchaseId:body.order_id}})).toBe(0);
});
it("races duplicate signed webhooks and reconciliation without duplicate fulfillment",async()=>{
 const body=await fixture(),payload=JSON.stringify(body),sig=createHmac("sha512",secret).update(canonicalJson(body)).digest("hex");
 vi.spyOn(provider,"getPaymentStatus").mockResolvedValue(await provider.verifyWebhook(payload,sig));
 vi.spyOn(console,"info").mockImplementation(()=>{});
 const [one,two]=await Promise.all([deliver(body),deliver(body),reconcilePurchase(body.order_id)]);
 expect(one.status).toBe(200);expect(two.status).toBe(200);
 expect(await db.enrollment.count({where:{purchaseId:body.order_id}})).toBe(1);
 expect(await db.paymentTransaction.count({where:{purchaseId:body.order_id}})).toBe(1);
});
it("retries a serializable conflict and returns 503 for a transient database failure",async()=>{
 const body=await fixture();
 db.$transaction=vi.fn(originalTransaction).mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("synthetic conflict",{code:"P2034",clientVersion:"test"})) as unknown as typeof db.$transaction;
 expect((await deliver(body)).status).toBe(200);
 await db.enrollment.deleteMany({where:{userId:owner}});
 const second=await fixture();
 db.$transaction=vi.fn(originalTransaction).mockRejectedValueOnce(new Error("synthetic database failure")) as unknown as typeof db.$transaction;
 expect((await deliver(second)).status).toBe(503);
 expect(await db.enrollment.count({where:{purchaseId:second.order_id}})).toBe(0);
 expect((await deliver(second)).status).toBe(200);
});
it("revokes access on refund with no duplicate refund transition",async()=>{
 const body=await fixture();await deliver(body);
 const enrollment=await db.enrollment.findFirstOrThrow({where:{purchaseId:body.order_id}});
 await db.courseAccessGrant.create({data:{userId:owner,courseId:course,purchaseId:body.order_id,enrollmentId:enrollment.id,status:"ACTIVE",expiresAt:new Date(Date.now()+60000)}});
 const refund={...body,payment_status:"refunded"};
 expect((await deliver(refund)).status).toBe(200);
 expect(await (await deliver(refund)).json()).toMatchObject({duplicate:true});
 expect(await db.enrollment.count({where:{purchaseId:body.order_id}})).toBe(0);
 expect((await db.courseAccessGrant.findFirstOrThrow({where:{purchaseId:body.order_id}})).status).toBe("REVOKED");
 expect(await db.paymentTransaction.count({where:{purchaseId:body.order_id,toStatus:"REFUNDED"}})).toBe(1);
});
it("uses signed database sessions to allow the owner and deny another user",async()=>{
 const body=await fixture(),params={params:Promise.resolve({id:body.order_id})};
 await login(owner);expect((await GET(new Request("http://localhost"),params)).status).toBe(200);
 await login(other);expect((await GET(new Request("http://localhost"),params)).status).toBe(404);
 context.token="";expect((await GET(new Request("http://localhost"),params)).status).toBe(401);
});
it("blocks an authenticated admin from reconciliation when disabled",async()=>{
 const body=await fixture();await login(owner);context.enabled=false;
 const response=await manual(new Request("http://localhost:3000/api/admin/purchases/"+body.order_id+"/reconcile",{method:"POST",headers:{origin:"http://localhost:3000"}}),{params:Promise.resolve({id:body.order_id})});
 expect(response.status).toBe(503);
 expect((await db.purchase.findUniqueOrThrow({where:{id:body.order_id}})).status).toBe("PENDING");
});
