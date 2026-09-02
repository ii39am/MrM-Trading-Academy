import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { errorResponse,verifySameOrigin } from "@/lib/security";
const schema=z.object({published:z.boolean()}).strict();
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const user=await getSessionUser();if(!isAdmin(user))return errorResponse("FORBIDDEN","Insufficient permission",403);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("INVALID_INPUT","Invalid publication request",400);
 const {id}=await params,course=await db.course.findUnique({where:{id},select:{id:true,telegramChatId:true,telegramAccessEnabled:true}});if(!course)return errorResponse("NOT_FOUND","Course not found",404);
 if(parsed.data.published&&(!course.telegramAccessEnabled||!course.telegramChatId))return errorResponse("ACCESS_REQUIRED","Secure Telegram access must be configured before publication",409);
 const status=parsed.data.published?"PUBLISHED":"DRAFT",publishedAt=parsed.data.published?new Date():null;
 await db.$transaction([db.course.update({where:{id},data:{status,publishedAt}}),db.securityAuditLog.create({data:{actorId:user.id,action:parsed.data.published?"COURSE_PUBLISHED":"COURSE_UNPUBLISHED",metadata:{courseId:id}}})]);
 return Response.json({ok:true,status});
}
