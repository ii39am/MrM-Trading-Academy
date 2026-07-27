import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { errorResponse,verifySameOrigin } from "@/lib/security";
import { productSchema } from "@/lib/product-validation";
export async function POST(request:Request){if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);const user=await getSessionUser();if(!isAdmin(user))return errorResponse("FORBIDDEN","Insufficient permission",403);const parsed=productSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("INVALID_INPUT","Invalid product data",400);const {published,...data}=parsed.data;const product=await db.$transaction(async tx=>{const created=await tx.course.create({data:{...data,telegramButtonLabelEn:data.telegramButtonLabelEn||null,telegramButtonLabelAr:data.telegramButtonLabelAr||null,status:published?"PUBLISHED":"DRAFT",publishedAt:published?new Date():null}});await tx.securityAuditLog.create({data:{actorId:user.id,action:"PRODUCT_CREATED",metadata:{courseId:created.id}}});return created});return Response.json({product:{id:product.id}},{status:201})}
