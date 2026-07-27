import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { normalizeCouponCode } from "@/lib/coupons";
import { couponSchema } from "@/lib/coupon-validation";
import { errorResponse,verifySameOrigin } from "@/lib/security";

export async function GET(request:Request){
 const actor=await getSessionUser();if(!isAdmin(actor))return errorResponse("FORBIDDEN","Insufficient permission",403);
 const page=Math.max(1,Number(new URL(request.url).searchParams.get("page")??1)||1),take=25;
 const [coupons,total]=await db.$transaction([db.coupon.findMany({select:{id:true,code:true,descriptionEn:true,descriptionAr:true,discountType:true,discountValue:true,currency:true,active:true,startsAt:true,expiresAt:true,totalUsageLimit:true,perUserUsageLimit:true,minimumOrderAmount:true,maximumDiscountAmount:true,_count:{select:{redemptions:true,products:true}}},orderBy:{createdAt:"desc"},skip:(page-1)*take,take}),db.coupon.count()]);
 return Response.json({coupons,total,page,pageSize:take});
}

export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);const actor=await getSessionUser();if(!isAdmin(actor))return errorResponse("FORBIDDEN","Insufficient permission",403);
 const parsed=couponSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("INVALID_INPUT","Invalid coupon data",400);const {productIds,...value}=parsed.data;
 try{const coupon=await db.$transaction(async tx=>{const created=await tx.coupon.create({data:{...value,code:value.code.trim(),normalizedCode:normalizeCouponCode(value.code),startsAt:value.startsAt?new Date(value.startsAt):null,expiresAt:value.expiresAt?new Date(value.expiresAt):null,createdByUserId:actor.id,products:{create:productIds.map(courseId=>({courseId}))}}});await writeAudit({action:"COUPON_CREATED",actorId:actor.id,actorRole:actor.role,entityType:"Coupon",entityId:created.id,category:"COMMERCE",metadata:{couponId:created.id},request},tx);return created});return Response.json({coupon:{id:coupon.id}},{status:201})}catch{return errorResponse("COUPON_CONFLICT","Coupon could not be created",409)}
}
