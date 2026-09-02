import { Prisma,type Coupon } from "@prisma/client";
import { db } from "@/lib/db";

export function normalizeCouponCode(value:string){return value.trim().toUpperCase()}

export function calculateDiscount(coupon:Pick<Coupon,"discountType"|"discountValue"|"currency"|"minimumOrderAmount"|"maximumDiscountAmount">,subtotal:number,currency:string){
 if(subtotal<coupon.minimumOrderAmount)throw new Error("MINIMUM_ORDER_NOT_MET");
 if(coupon.discountType==="FIXED_AMOUNT"&&coupon.currency!==currency)throw new Error("COUPON_CURRENCY_MISMATCH");
 let discount=coupon.discountType==="PERCENTAGE"?Math.floor(subtotal*coupon.discountValue/100):coupon.discountValue;
 if(coupon.maximumDiscountAmount!==null)discount=Math.min(discount,coupon.maximumDiscountAmount);
 return Math.max(0,Math.min(subtotal,discount));
}

export async function createReservedPurchase(input:{userId:string;courseIds:string[];couponCode?:string;provider:string}){
 return db.$transaction(async tx=>{
  const now=new Date();
  await tx.couponRedemption.updateMany({where:{status:"RESERVED",expiresAt:{lte:now}},data:{status:"RELEASED",releasedAt:now}});
  const courses=await tx.course.findMany({where:{id:{in:input.courseIds},status:"PUBLISHED",publishedAt:{lte:now},telegramAccessEnabled:true,telegramChatId:{not:null}},select:{id:true,priceCents:true,currency:true}});
  if(courses.length!==input.courseIds.length)throw new Error("INVALID_COURSE");
  const currencies=[...new Set(courses.map(course=>course.currency))];if(currencies.length!==1)throw new Error("INVALID_CURRENCY");
  if(await tx.enrollment.count({where:{userId:input.userId,courseId:{in:input.courseIds}}}))throw new Error("ALREADY_OWNED");
  const originalAmountCents=courses.reduce((sum,course)=>sum+course.priceCents,0),currency=currencies[0];
  let coupon:Prisma.CouponGetPayload<{include:{products:{select:{courseId:true}}}}>|null=null,discountAmountCents=0;
  if(input.couponCode){
   coupon=await tx.coupon.findUnique({where:{normalizedCode:normalizeCouponCode(input.couponCode)},include:{products:{select:{courseId:true}}}});
   if(!coupon||!coupon.active||(coupon.startsAt&&coupon.startsAt>now)||(coupon.expiresAt&&coupon.expiresAt<=now))throw new Error("INVALID_COUPON");
   if(coupon.products.length&&!input.courseIds.every(id=>coupon!.products.some(product=>product.courseId===id)))throw new Error("COUPON_NOT_ELIGIBLE");
   const [totalUsed,userUsed]=await Promise.all([
    tx.couponRedemption.count({where:{couponId:coupon.id,OR:[{status:"REDEEMED"},{status:"RESERVED",expiresAt:{gt:now}}]}}),
    tx.couponRedemption.count({where:{couponId:coupon.id,userId:input.userId,OR:[{status:"REDEEMED"},{status:"RESERVED",expiresAt:{gt:now}}]}})
   ]);
   if(coupon.totalUsageLimit!==null&&totalUsed>=coupon.totalUsageLimit)throw new Error("COUPON_USAGE_LIMIT");
   if(coupon.perUserUsageLimit!==null&&userUsed>=coupon.perUserUsageLimit)throw new Error("COUPON_USER_LIMIT");
   discountAmountCents=calculateDiscount(coupon,originalAmountCents,currency);
  }
  const amountCents=originalAmountCents-discountAmountCents;
  if(amountCents<=0)throw new Error("ZERO_VALUE_CHECKOUT_UNSUPPORTED");
  const purchase=await tx.purchase.create({data:{userId:input.userId,provider:input.provider,providerSessionId:`pending:${crypto.randomUUID()}`,status:"PENDING",originalAmountCents,discountAmountCents,amountCents,currency,couponId:coupon?.id,payCurrency:"usdttrc20",network:"TRC20",items:{create:courses.map(course=>({courseId:course.id,priceCents:course.priceCents}))}}});
  if(coupon)await tx.couponRedemption.create({data:{couponId:coupon.id,userId:input.userId,purchaseId:purchase.id,discountAmount:discountAmountCents,expiresAt:new Date(Date.now()+30*60_000)}});
  return purchase;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
