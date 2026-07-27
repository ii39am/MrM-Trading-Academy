import { cookies } from "next/headers";
import { getSessionContext,SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { clientKey,enforceRateLimit,errorResponse,rateLimited,verifySameOrigin } from "@/lib/security";

export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const context=await getSessionContext();if(!context)return errorResponse("UNAUTHORIZED","Authentication required",401);
 const rate=await enforceRateLimit(clientKey(request,`sessions-all:${context.user.id}`),3,60*60_000);if(!rate.allowed)return rateLimited(rate.retryAfter);
 const count=await db.$transaction(async tx=>{const result=await tx.session.updateMany({where:{userId:context.user.id,revokedAt:null},data:{revokedAt:new Date(),revocationReason:"USER_REVOKED_ALL"}});await tx.user.update({where:{id:context.user.id},data:{sessionVersion:{increment:1}}});await writeAudit({action:"SESSIONS_REVOKED_ALL",actorId:context.user.id,actorRole:context.user.role,targetUserId:context.user.id,category:"SECURITY",metadata:{count:result.count},request},tx);return result.count});
 (await cookies()).delete(SESSION_COOKIE);return Response.json({ok:true,count});
}
