import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { requireLessonEnrollment } from "@/lib/authorization";
import { db } from "@/lib/db";
import { getVideoProvider,hashRequestValue,maskEmail } from "@/lib/video";
import { errorResponse } from "@/lib/security";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const id=z.string().min(1).max(100).safeParse((await params).id);if(!id.success)return errorResponse("NOT_FOUND","Lesson not found",404);
 const user=await getSessionUser();if(!user?.emailVerified)return errorResponse("UNAUTHORIZED","Verified email required",401);
 if(!await requireLessonEnrollment(user.id,id.data))return errorResponse("NOT_FOUND","Lesson not found",404);
 const lesson=await db.lesson.findUnique({where:{id:id.data},include:{video:true}});if(!lesson?.video?.cloudflareUid||lesson.video.state!=="READY")return errorResponse("VIDEO_UNAVAILABLE","Video is unavailable",503);
 const now=new Date(),limit=Math.max(1,Number(process.env.PLAYBACK_SESSION_LIMIT??2));
 const active=await db.playbackSession.count({where:{userId:user.id,expiresAt:{gt:now},revokedAt:null}}),suspicious=active>=limit;
 if(suspicious){await db.securityAuditLog.create({data:{userId:user.id,action:"PLAYBACK_CONCURRENCY_LIMIT",ipHash:hashRequestValue(request.headers.get("x-forwarded-for")??undefined),metadata:{active,limit}}});return errorResponse("PLAYBACK_LIMIT","Too many active playback sessions",429)}
 const playback=await getVideoProvider().createSignedPlayback(lesson.video.cloudflareUid,user.id,300),tokenId=crypto.randomUUID();
 await db.playbackSession.create({data:{userId:user.id,lessonId:lesson.id,tokenId,expiresAt:playback.expiresAt,ipHash:hashRequestValue(request.headers.get("x-forwarded-for")??undefined),userAgentHash:hashRequestValue(request.headers.get("user-agent")??undefined),suspicious}});
 return Response.json({playback:{...playback,watermark:`${maskEmail(user.email)} · ${user.id.slice(-8)} · ${new Date().toISOString()}`,notice:"Signed streaming reduces casual sharing but cannot completely prevent recording or theft."}});
}
