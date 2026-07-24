import { randomUUID } from "node:crypto";
import { SignJWT,jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { User } from "@/lib/types";
import { userRepository } from "@/lib/user-repository";
import { db } from "@/lib/db";

export const SESSION_COOKIE="mr_m_session";
const issuer="mr-m-academy",audience="mr-m-web",maxAge=604800;
function secret(){const value=process.env.JWT_SECRET;if(!value||value.length<32)throw new Error("JWT_SECRET must contain at least 32 characters");return new TextEncoder().encode(value)}

async function readPayload(){
 const token=(await cookies()).get(SESSION_COOKIE)?.value;
 if(!token)return null;
 try{return (await jwtVerify(token,secret(),{algorithms:["HS256"],issuer,audience})).payload}catch{return null}
}

export async function createSession(user:User){
 await revokeCurrentSession();
 const id=randomUUID(),expiresAt=new Date(Date.now()+maxAge*1000);
 await db.session.create({data:{id,userId:user.id,expiresAt}});
 const token=await new SignJWT({sv:user.sessionVersion,auth_time:Math.floor(Date.now()/1000)})
  .setProtectedHeader({alg:"HS256"}).setJti(id).setSubject(user.id).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime("7d").sign(secret());
 (await cookies()).set(SESSION_COOKIE,token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge});
}

export async function verifySessionToken(token:string){
 const {payload}=await jwtVerify(token,secret(),{algorithms:["HS256"],issuer,audience});
 return payload.sub??null;
}

export async function getSessionUser():Promise<User|null>{
 const payload=await readPayload();
 if(!payload?.sub||!payload.jti)return null;
 const [user,session]=await Promise.all([
  userRepository.findById(payload.sub),
  db.session.findUnique({where:{id:payload.jti}})
 ]);
 if(!user||user.sessionVersion!==payload.sv||user.status!=="ACTIVE"||!user.emailVerified)return null;
 if(!session||session.userId!==user.id||session.revokedAt||session.expiresAt<=new Date())return null;
 return user;
}

export async function revokeCurrentSession(){
 const payload=await readPayload();
 if(payload?.jti)await db.session.updateMany({where:{id:payload.jti,revokedAt:null},data:{revokedAt:new Date()}});
}

export async function clearSession(){await revokeCurrentSession();(await cookies()).delete(SESSION_COOKIE)}
export async function revokeAllSessions(userId:string){await db.$transaction([db.session.updateMany({where:{userId,revokedAt:null},data:{revokedAt:new Date()}}),db.user.update({where:{id:userId},data:{sessionVersion:{increment:1}}})])}
export async function hasRecentAuthentication(maxAgeSeconds=600){const payload=await readPayload();return typeof payload?.auth_time==="number"&&Date.now()/1000-payload.auth_time<=maxAgeSeconds}
