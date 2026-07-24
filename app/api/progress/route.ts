import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { requireLessonEnrollment } from "@/lib/authorization";
import { db } from "@/lib/db";
import { errorResponse,verifySameOrigin } from "@/lib/security";
const schema=z.object({lessonId:z.string().min(1).max(100),positionSec:z.number().int().min(0).max(86400),completed:z.boolean()}).strict();
export async function PUT(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const user=await getSessionUser();if(!user)return errorResponse("UNAUTHORIZED","Authentication required",401);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("INVALID_INPUT","Invalid progress",400);
 if(!await requireLessonEnrollment(user.id,parsed.data.lessonId))return errorResponse("NOT_FOUND","Lesson not found",404);
 const value=await db.lessonProgress.upsert({where:{userId_lessonId:{userId:user.id,lessonId:parsed.data.lessonId}},create:{userId:user.id,lessonId:parsed.data.lessonId,positionSec:parsed.data.positionSec,completedAt:parsed.data.completed?new Date():null},update:{positionSec:parsed.data.positionSec,completedAt:parsed.data.completed?new Date():null}});
 return Response.json({progress:{lessonId:value.lessonId,positionSec:value.positionSec,completed:Boolean(value.completedAt)}});
}
