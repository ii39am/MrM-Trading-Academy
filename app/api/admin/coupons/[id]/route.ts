import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { normalizeCouponCode } from "@/lib/coupons";
import { couponSchema } from "@/lib/coupon-validation";
import { errorResponse,verifySameOrigin } from "@/lib/security";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);const actor=await getSessionUser();if(!isAdmin(actor))return errorResponse("FORBIDDEN","Insufficient permission",403);
 const parsed=couponSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("INVALID_INPUT","Invalid coupon data",400);const id=(await params).id,{productIds,...value}=parsed.data;
 try{await db.$transaction(async tx=>{await tx.coupon.update({where:{id},data:{...value,code:value.code.trim(),normalizedCode:normalizeCouponCode(value.code),startsAt:value.startsAt?new Date(value.startsAt):null,expiresAt:value.expiresAt?new Date(value.expiresAt):null,products:{deleteMany:{},create:productIds.map(courseId=>({courseId}))}}});await writeAudit({action:"COUPON_EDITED",actorId:actor.id,actorRole:actor.role,entityType:"Coupon",entityId:id,category:"COMMERCE",metadata:{couponId:id},request},tx)});return Response.json({ok:true})}catch{return errorResponse("COUPON_CONFLICT","Coupon could not be updated",409)}
}
