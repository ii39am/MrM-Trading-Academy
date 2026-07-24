import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { canAccessVideoAdministration,canManageLesson } from "@/lib/admin";
import { db } from "@/lib/db";
import { getVideoProvider } from "@/lib/video";
import { errorResponse,verifySameOrigin } from "@/lib/security";
const schema=z.object({maxDurationSeconds:z.number().int().min(60).max(21600).default(7200)}).strict();
type Context={params:Promise<{id:string}>};
async function authorized(id:string){const user=await getSessionUser();return user&&canAccessVideoAdministration(user)&&await canManageLesson(user,id)?user:null}
export async function POST(request:Request,{params}:Context){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);const {id}=await params,user=await authorized(id);if(!user)return errorResponse("FORBIDDEN","Insufficient permission",403);
 const parsed=schema.safeParse(await request.json().catch(()=>({})));if(!parsed.success)return errorResponse("INVALID_INPUT","Invalid upload request",400);
 const lesson=await db.lesson.findUnique({where:{id},include:{video:true}});if(!lesson)return errorResponse("NOT_FOUND","Lesson not found",404);
 const upload=await getVideoProvider().createDirectUpload(lesson.id,parsed.data.maxDurationSeconds);
 await db.$transaction([db.videoAsset.upsert({where:{lessonId:lesson.id},create:{lessonId:lesson.id,cloudflareUid:upload.uid,uploadId:upload.uid,state:"UPLOADING"},update:{replacedUid:lesson.video?.cloudflareUid,cloudflareUid:upload.uid,uploadId:upload.uid,state:"UPLOADING",errorMessage:null}}),db.securityAuditLog.create({data:{actorId:user.id,action:"VIDEO_UPLOAD_CREATED",metadata:{lessonId:id}}})]);
 return Response.json({upload:{uid:upload.uid,url:upload.uploadUrl,expiresAt:upload.expiresAt,tus:true}},{status:201});
}
export async function GET(_:Request,{params}:Context){const {id}=await params,user=await authorized(id);if(!user)return errorResponse("FORBIDDEN","Insufficient permission",403);const video=await db.videoAsset.findUnique({where:{lessonId:id},select:{state:true,durationSeconds:true,thumbnailUrl:true,errorMessage:true,updatedAt:true}});return Response.json({video})}
export async function DELETE(request:Request,{params}:Context){if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);const {id}=await params,user=await authorized(id);if(!user)return errorResponse("FORBIDDEN","Insufficient permission",403);const video=await db.videoAsset.findUnique({where:{lessonId:id}});if(!video)return Response.json({ok:true});if(video.cloudflareUid)await getVideoProvider().deleteAsset(video.cloudflareUid);await db.$transaction([db.videoAsset.update({where:{id:video.id},data:{state:"CANCELLED",cloudflareUid:null}}),db.securityAuditLog.create({data:{actorId:user.id,action:"VIDEO_DELETED",metadata:{lessonId:id}}})]);return Response.json({ok:true})}
