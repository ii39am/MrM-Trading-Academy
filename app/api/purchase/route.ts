import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payment";
import { db } from "@/lib/db";
import { errorResponse,verifySameOrigin } from "@/lib/security";
import { env } from "@/lib/env";
import { createReservedPurchase } from "@/lib/coupons";
import { writeAudit } from "@/lib/audit";
const schema=z.object({courseIds:z.array(z.string().min(1).max(100)).min(1).max(10),couponCode:z.string().trim().min(1).max(40).optional()}).strict();
export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const user=await getSessionUser();if(!user)return errorResponse("UNAUTHORIZED","Authentication required",401);
 if(!user.emailVerified)return errorResponse("EMAIL_VERIFICATION_REQUIRED","Please verify your email address before completing your purchase.",403);
 if(!env.PAYMENTS_ENABLED)return errorResponse("PAYMENT_UNAVAILABLE","Payments are temporarily unavailable.",503);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("INVALID_INPUT","Invalid checkout request",400);
 const ids=[...new Set(parsed.data.courseIds)],provider=getPaymentProvider();let purchase;
 try{purchase=await createReservedPurchase({userId:user.id,courseIds:ids,couponCode:parsed.data.couponCode,provider:provider.name})}
 catch(error){const code=error instanceof Error?error.message:"CHECKOUT_FAILED";const clientCodes=new Set(["INVALID_COURSE","INVALID_CURRENCY","ALREADY_OWNED","INVALID_COUPON","COUPON_NOT_ELIGIBLE","COUPON_USAGE_LIMIT","COUPON_USER_LIMIT","MINIMUM_ORDER_NOT_MET","COUPON_CURRENCY_MISMATCH","ZERO_VALUE_CHECKOUT_UNSUPPORTED"]);return errorResponse(clientCodes.has(code)?code:"CHECKOUT_CONFLICT","Checkout could not be created",clientCodes.has(code)?409:503)}
 await writeAudit({action:"PAYMENT_CREATED",actorId:user.id,actorRole:user.role,targetUserId:user.id,entityType:"Purchase",entityId:purchase.id,category:"PAYMENT",metadata:{purchaseId:purchase.id,amountCents:purchase.amountCents,discountAmountCents:purchase.discountAmountCents,currency:purchase.currency},request});
 try{const checkout=await provider.createCheckout({purchaseId:purchase.id,userId:user.id,courseIds:ids,amountCents:purchase.amountCents});await db.purchase.update({where:{id:purchase.id},data:{providerSessionId:checkout.id,providerPaymentId:checkout.id,expectedAmount:checkout.payAmount,paymentAddress:checkout.payAddress,expiresAt:new Date(checkout.expiresAt),providerStatus:"waiting"}});return Response.json({...checkout,originalAmountCents:purchase.originalAmountCents,discountAmountCents:purchase.discountAmountCents,finalAmountCents:purchase.amountCents},{status:201})}
 catch{await db.$transaction([db.purchase.update({where:{id:purchase.id},data:{status:"FAILED",providerStatus:"invoice_error"}}),db.couponRedemption.updateMany({where:{purchaseId:purchase.id,status:"RESERVED"},data:{status:"RELEASED",releasedAt:new Date()}})]);return errorResponse("PAYMENT_UNAVAILABLE","Payments are unavailable",503)}
}
