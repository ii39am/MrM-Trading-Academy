import { cookies } from "next/headers";
import { getSessionContext,SESSION_COOKIE } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { clientKey,enforceRateLimit,errorResponse,rateLimited,verifySameOrigin } from "@/lib/security";
import { revokeOwnedSession } from "@/lib/session-management";

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const context=await getSessionContext();if(!context)return errorResponse("UNAUTHORIZED","Authentication required",401);
 const rate=await enforceRateLimit(clientKey(request,`session-revoke:${context.user.id}`),12,15*60_000);if(!rate.allowed)return rateLimited(rate.retryAfter);
 const publicId=(await params).id,targetId=await revokeOwnedSession(context.user.id,publicId);if(!targetId)return errorResponse("NOT_FOUND","Session not found",404);
 await writeAudit({action:"SESSION_REVOKED",actorId:context.user.id,actorRole:context.user.role,targetUserId:context.user.id,entityType:"Session",entityId:publicId,category:"SECURITY",request});
 const current=targetId===context.sessionId;if(current)(await cookies()).delete(SESSION_COOKIE);
 return Response.json({ok:true,current});
}
