import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientKey,enforceRateLimit,errorResponse,rateLimited,verifySameOrigin } from "@/lib/security";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const actor=await getSessionUser();if(!isAdmin(actor))return errorResponse("FORBIDDEN","Insufficient permission",403);
 const rate=await enforceRateLimit(clientKey(request,`admin-access-grant-revoke:${actor.id}`),10,15*60_000);if(!rate.allowed)return rateLimited(rate.retryAfter);
 const id=(await params).id;if(!id||id.length>100)return errorResponse("INVALID_INPUT","Invalid access grant",400);const now=new Date();
 const changed=await db.$transaction(async tx=>{const grant=await tx.courseAccessGrant.findUnique({where:{id},select:{id:true,userId:true,courseId:true,purchaseId:true,status:true}});if(!grant)return null;if(!["ACTIVE","PENDING"].includes(grant.status))return false;await tx.courseAccessGrant.update({where:{id},data:{status:"REVOKED",revokedAt:now,lastErrorCode:"ADMIN_METADATA_REVOCATION"}});await writeAudit({action:"ADMIN_ACCESS_GRANT_REVOKED",actorId:actor.id,actorRole:actor.role,targetUserId:grant.userId,entityType:"CourseAccessGrant",entityId:grant.id,category:"ACCESS",metadata:{grantId:grant.id,courseId:grant.courseId,purchaseId:grant.purchaseId,status:"REVOKED",reason:"ADMIN_METADATA_REVOCATION"},request},tx);return true});
 if(changed===null)return errorResponse("NOT_FOUND","Access grant not found",404);
 if(!changed)return errorResponse("GRANT_NOT_ACTIVE","Access grant is not active",409);
 return Response.json({ok:true,status:"REVOKED",telegramLinkRevoked:false});
}
