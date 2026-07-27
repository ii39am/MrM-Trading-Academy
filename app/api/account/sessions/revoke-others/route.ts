import { getSessionContext } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { clientKey,enforceRateLimit,errorResponse,rateLimited,verifySameOrigin } from "@/lib/security";
import { revokeOtherSessions } from "@/lib/session-management";

export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const context=await getSessionContext();if(!context)return errorResponse("UNAUTHORIZED","Authentication required",401);
 const rate=await enforceRateLimit(clientKey(request,`sessions-others:${context.user.id}`),5,60*60_000);if(!rate.allowed)return rateLimited(rate.retryAfter);
 const result=await revokeOtherSessions(context.user.id,context.sessionId),count=result.count;await writeAudit({action:"SESSIONS_REVOKED_OTHERS",actorId:context.user.id,actorRole:context.user.role,targetUserId:context.user.id,category:"SECURITY",metadata:{count},request});
 return Response.json({ok:true,count});
}
