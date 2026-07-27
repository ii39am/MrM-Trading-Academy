import { createHash } from "node:crypto";
import { PaymentStatus,Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getEmailProvider,paymentConfirmedEmail } from "@/lib/email";
import { writeAudit } from "@/lib/audit";
export interface CheckoutInput {purchaseId:string;userId:string;courseIds:string[];amountCents:number}
export interface CheckoutSession {id:string;purchaseId:string;payAddress:string;payAmount:string;payCurrency:"usdttrc20";network:"TRC20";expiresAt:string}
export interface VerifiedPaymentEvent {eventId:string;purchaseId:string;providerPaymentId:string;status:PaymentStatus;providerStatus:string;receivedAmount:string;payCurrency:string;network:string;transactionHash?:string;raw:unknown}
export interface PaymentProvider {readonly name:string;createCheckout(input:CheckoutInput):Promise<CheckoutSession>;verifyWebhook(payload:string,signature:string):Promise<VerifiedPaymentEvent>}
const paymentRegistry=globalThis as typeof globalThis&{__academyPaymentProvider?:PaymentProvider};
export function registerPaymentProvider(value:PaymentProvider){paymentRegistry.__academyPaymentProvider=value}
export function getPaymentProvider(){if(!paymentRegistry.__academyPaymentProvider)throw new Error("Payment provider is not configured");return paymentRegistry.__academyPaymentProvider}
const transitions:Record<PaymentStatus,PaymentStatus[]>={PENDING:["PAID","FAILED","EXPIRED","CANCELLED"],PAID:["REFUNDED"],FAILED:[],EXPIRED:["PAID"],REFUNDED:[],CANCELLED:["PAID"]};
export function canTransition(from:PaymentStatus,to:PaymentStatus){return from===to||transitions[from].includes(to)}
export async function processPaymentEvent(providerName:string,event:VerifiedPaymentEvent,payload:string){
 const hash=createHash("sha256").update(payload).digest("hex");
 const result=await db.$transaction(async tx=>{
  const existing=await tx.webhookEvent.findUnique({where:{id:event.eventId}});
  if(existing){if(existing.payloadHash!==hash)throw new Error("Webhook replay payload mismatch");return {duplicate:true,status:null}};
  const purchase=await tx.purchase.findUnique({where:{id:event.purchaseId},include:{user:{select:{email:true}},items:{include:{course:{select:{titleEn:true}}}}}});
  if(!purchase||purchase.providerPaymentId!==event.providerPaymentId)throw new Error("Purchase binding mismatch");
  if(event.payCurrency.toLowerCase()!=="usdttrc20"||event.network.toUpperCase()!=="TRC20")throw new Error("Invalid settlement asset");
  const received=new Prisma.Decimal(event.receivedAmount);let target=event.status;
  if(target==="PAID"&&(!purchase.expectedAmount||received.lt(purchase.expectedAmount)))target="PENDING";
  if(!canTransition(purchase.status,target))throw new Error("Invalid payment transition");
  await tx.webhookEvent.create({data:{id:event.eventId,provider:providerName,payloadHash:hash}});
  await tx.purchase.update({where:{id:purchase.id},data:{status:target,receivedAmount:received,providerStatus:event.providerStatus,transactionHash:event.transactionHash,rawWebhookHash:hash,paidAt:target==="PAID"?new Date():purchase.paidAt}});
  if(target!==purchase.status)await tx.paymentTransaction.create({data:{purchaseId:purchase.id,eventId:event.eventId,fromStatus:purchase.status,toStatus:target,payloadHash:hash}});
  if(target==="PAID")for(const item of purchase.items)await tx.enrollment.upsert({where:{userId_courseId:{userId:purchase.userId,courseId:item.courseId}},create:{userId:purchase.userId,courseId:item.courseId,purchaseId:purchase.id},update:{purchaseId:purchase.id}});
  if(target==="REFUNDED")await tx.enrollment.deleteMany({where:{purchaseId:purchase.id}});
  if(target==="PAID")await tx.couponRedemption.updateMany({where:{purchaseId:purchase.id,status:"RESERVED"},data:{status:"REDEEMED",redeemedAt:new Date()}});
  if(["FAILED","EXPIRED","CANCELLED"].includes(target))await tx.couponRedemption.updateMany({where:{purchaseId:purchase.id,status:"RESERVED"},data:{status:"RELEASED",releasedAt:new Date()}});
  if(target==="REFUNDED")await tx.purchase.update({where:{id:purchase.id},data:{refundedAt:new Date()}});
  await writeAudit({action:"PAYMENT_STATUS_CHANGED",targetUserId:purchase.userId,entityType:"Purchase",entityId:purchase.id,category:"PAYMENT",metadata:{purchaseId:purchase.id,fromStatus:purchase.status,toStatus:target}},tx);
  if(target==="PAID")await writeAudit({action:"PURCHASE_GRANTED",targetUserId:purchase.userId,entityType:"Purchase",entityId:purchase.id,category:"ACCESS",metadata:{purchaseId:purchase.id}},tx);
  if(target==="REFUNDED")await writeAudit({action:"PURCHASE_REVOKED",targetUserId:purchase.userId,entityType:"Purchase",entityId:purchase.id,category:"ACCESS",metadata:{purchaseId:purchase.id}},tx);
  await tx.webhookEvent.update({where:{id:event.eventId},data:{processedAt:new Date()}});
  return {duplicate:false,status:target,email:purchase.user.email,products:purchase.items.map(item=>item.course.titleEn)};
 });
 if(!result.duplicate&&result.status==="PAID"&&env.EMAIL_ENABLED)try{await getEmailProvider().send({to:result.email,...paymentConfirmedEmail(result.products)})}catch{}
 return {duplicate:result.duplicate,status:result.status};
}
