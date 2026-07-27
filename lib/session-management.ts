import { db } from "@/lib/db";

export async function listActiveSessions(userId:string,currentSessionId:string){
 const sessions=await db.session.findMany({where:{userId,revokedAt:null,expiresAt:{gt:new Date()}},select:{publicId:true,createdAt:true,lastSeenAt:true,expiresAt:true,userAgentSummary:true,deviceType:true,browser:true,operatingSystem:true,maskedIp:true,id:true},orderBy:{lastSeenAt:"desc"}});
 return sessions.map(({id,...session})=>({...session,isCurrentSession:id===currentSessionId}));
}

export async function revokeOwnedSession(userId:string,publicId:string,reason="USER_REVOKED"){
 const target=await db.session.findFirst({where:{publicId,userId,revokedAt:null},select:{id:true}});if(!target)return null;
 await db.session.update({where:{id:target.id},data:{revokedAt:new Date(),revocationReason:reason}});return target.id;
}

export async function revokeOtherSessions(userId:string,currentSessionId:string){
 return db.session.updateMany({where:{userId,id:{not:currentSessionId},revokedAt:null},data:{revokedAt:new Date(),revocationReason:"USER_REVOKED_OTHERS"}});
}
