import { createHash,randomUUID } from "node:crypto";
import { SignJWT,jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { User } from "@/lib/types";
import { userRepository } from "@/lib/user-repository";
import { db } from "@/lib/db";
import { requestDeviceContext } from "@/lib/request-security";

export const SESSION_COOKIE="mr_m_session";
const issuer="mr-m-academy",audience="mr-m-web",maxAge=604800;
function secret(){const value=process.env.JWT_SECRET;if(!value||value.length<32)throw new Error("JWT_SECRET must contain at least 32 characters");return new TextEncoder().encode(value)}
export function hashSessionId(id:string){return createHash("sha256").update(id).digest("hex")}

async function readPayload(){
 const token=(await cookies()).get(SESSION_COOKIE)?.value;
 if(!token)return null;
 try{return (await jwtVerify(token,secret(),{algorithms:["HS256"],issuer,audience})).payload}catch{return null}
}

export async function createSession(user:User,request?:Request){
 await revokeCurrentSession();
 const id=randomUUID(),expiresAt=new Date(Date.now()+maxAge*1000);
 const device=request?requestDeviceContext(request):null;
 await db.session.create({data:{id:hashSessionId(id),userId:user.id,expiresAt,lastSeenAt:new Date(),userAgentSummary:device?.userAgentSummary,deviceType:device?.deviceType,browser:device?.browser,operatingSystem:device?.operatingSystem,ipHash:device?.ipHash,maskedIp:device?.maskedIp}});
 const token=await new SignJWT({sv:user.sessionVersion,auth_time:Math.floor(Date.now()/1000)})
  .setProtectedHeader({alg:"HS256"}).setJti(id).setSubject(user.id).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime("7d").sign(secret());
 (await cookies()).set(SESSION_COOKIE,token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge});
}

export async function verifySessionToken(token:string){
 const {payload}=await jwtVerify(token,secret(),{algorithms:["HS256"],issuer,audience});
 return payload.sub??null;
}

export async function getSessionContext(){
 const payload=await readPayload();
 if(!payload?.sub||!payload.jti)return null;
 const sessionId=hashSessionId(payload.jti);
 const [user,session]=await Promise.all([
  userRepository.findById(payload.sub),
  db.session.findUnique({where:{id:sessionId}})
 ]);
 if(!user||user.sessionVersion!==payload.sv||user.status!=="ACTIVE"||!user.emailVerified)return null;
 if(!session||session.userId!==user.id||session.revokedAt||session.expiresAt<=new Date())return null;
 if(Date.now()-session.lastSeenAt.getTime()>5*60_000)void db.session.updateMany({where:{id:sessionId,lastSeenAt:{lt:new Date(Date.now()-5*60_000)}},data:{lastSeenAt:new Date()}}).catch(()=>undefined);
 return {user,sessionId,session};
}
export async function getSessionUser():Promise<User|null>{return (await getSessionContext())?.user??null}

export async function revokeCurrentSession(reason="LOGOUT"){
 const payload=await readPayload();
 if(payload?.jti)await db.session.updateMany({where:{id:hashSessionId(payload.jti),revokedAt:null},data:{revokedAt:new Date(),revocationReason:reason}});
}

export async function clearSession(reason="LOGOUT"){await revokeCurrentSession(reason);(await cookies()).delete(SESSION_COOKIE)}
export async function revokeAllSessions(userId:string,reason="SECURITY_ACTION"){await db.$transaction([db.session.updateMany({where:{userId,revokedAt:null},data:{revokedAt:new Date(),revocationReason:reason}}),db.user.update({where:{id:userId},data:{sessionVersion:{increment:1}}})])}
export async function hasRecentAuthentication(maxAgeSeconds=600){const payload=await readPayload();return typeof payload?.auth_time==="number"&&Date.now()/1000-payload.auth_time<=maxAgeSeconds}
