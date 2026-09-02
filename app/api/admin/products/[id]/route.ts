import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { errorResponse,verifySameOrigin } from "@/lib/security";
import { productSchema } from "@/lib/product-validation";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);const user=await getSessionUser();if(!isAdmin(user))return errorResponse("FORBIDDEN","Insufficient permission",403);const parsed=productSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("INVALID_INPUT","Invalid product data",400);const {published,...data}=parsed.data,id=(await params).id;await db.$transaction([db.course.update({where:{id},data:{...data,telegramChatId:data.telegramChatId||null,telegramButtonLabelEn:data.telegramButtonLabelEn||null,telegramButtonLabelAr:data.telegramButtonLabelAr||null,status:published?"PUBLISHED":"DRAFT",publishedAt:published?new Date():null}}),db.securityAuditLog.create({data:{actorId:user.id,action:"PRODUCT_UPDATED",metadata:{courseId:id}}})]);return Response.json({ok:true})}
