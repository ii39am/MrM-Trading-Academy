import { createHmac,randomInt,timingSafeEqual,randomUUID } from "node:crypto";
import type { EmailChallengePurpose } from "@prisma/client";
import { db } from "@/lib/db";
import { getEmailProvider,verificationEmail } from "@/lib/email";
import { Prisma } from "@prisma/client";

const lifetimeMs=10*60_000;
export function normalizeEmail(value:string){
  const normalized=value.trim().toLowerCase();
  if(normalized.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))throw new Error("Invalid email");
  return normalized;
}
function hash(id:string,code:string){
  const secret=process.env.JWT_SECRET;
  if(!secret||secret.length<32)throw new Error("Invalid server configuration");
  return createHmac("sha256",secret).update(`${id}:${code}`).digest("hex");
}
function matches(expected:string,actual:string){
  const left=Buffer.from(expected,"hex"),right=Buffer.from(actual,"hex");
  return left.length===right.length&&timingSafeEqual(left,right);
}
function generateCode(){
  if(process.env.NODE_ENV!=="production"&&process.env.E2E_EMAIL_CODE)return process.env.E2E_EMAIL_CODE;
  return randomInt(0,1_000_000).toString().padStart(6,"0");
}

export async function issueEmailChallenge(userId:string,email:string,purpose:EmailChallengePurpose){
  const id=randomUUID(),code=generateCode(),expiresAt=new Date(Date.now()+lifetimeMs);
  await db.$transaction(async tx=>{
    const latest=await tx.emailVerificationChallenge.findFirst({where:{userId,purpose},orderBy:{createdAt:"desc"},select:{createdAt:true}});
    if(latest&&Date.now()-latest.createdAt.getTime()<60_000)throw new Error("RESEND_COOLDOWN");
    await tx.emailVerificationChallenge.updateMany({where:{userId,purpose,consumedAt:null,invalidatedAt:null},data:{invalidatedAt:new Date()}});
    await tx.emailVerificationChallenge.create({data:{id,userId,email,purpose,codeHash:hash(id,code),expiresAt}});
  });
  try{
    const template=verificationEmail(code,purpose);
    await getEmailProvider().send({to:email,...template});
  }catch(error){
    await db.emailVerificationChallenge.update({where:{id},data:{invalidatedAt:new Date()}});
    throw error;
  }
}

export async function registerWithEmailChallenge(name:string,email:string,passwordHash:string){
  const id=randomUUID(),code=generateCode(),expiresAt=new Date(Date.now()+lifetimeMs);
  let userId:string|null=null;
  for(let attempt=0;attempt<2;attempt++){
    try{
      userId=await db.$transaction(async tx=>{
        const existing=await tx.user.findUnique({where:{normalizedEmail:email}});
        if(existing?.emailVerifiedAt||existing?.status==="ACTIVE"||existing?.status==="DISABLED"||existing?.status==="MIGRATION_REQUIRED")return null;
        const user=existing
          ?await tx.user.update({where:{id:existing.id},data:{name,passwordHash,email,failedLoginAttempts:0,lockedUntil:null}})
          :await tx.user.create({data:{name,email,normalizedEmail:email,passwordHash,status:"PENDING_VERIFICATION"}});
        const latest=await tx.emailVerificationChallenge.findFirst({where:{userId:user.id,purpose:"EMAIL_VERIFICATION"},orderBy:{createdAt:"desc"},select:{createdAt:true}});
        if(latest&&Date.now()-latest.createdAt.getTime()<60_000)throw new Error("RESEND_COOLDOWN");
        await tx.emailVerificationChallenge.updateMany({where:{userId:user.id,purpose:"EMAIL_VERIFICATION",consumedAt:null,invalidatedAt:null},data:{invalidatedAt:new Date()}});
        await tx.emailVerificationChallenge.create({data:{id,userId:user.id,email,purpose:"EMAIL_VERIFICATION",codeHash:hash(id,code),expiresAt}});
        return user.id;
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
      break;
    }catch(error){
      if(attempt===0&&error instanceof Prisma.PrismaClientKnownRequestError&&["P2002","P2034"].includes(error.code))continue;
      throw error;
    }
  }
  if(!userId)return;
  try{
    const template=verificationEmail(code,"EMAIL_VERIFICATION");
    await getEmailProvider().send({to:email,...template});
  }catch(error){
    await db.emailVerificationChallenge.updateMany({where:{id},data:{invalidatedAt:new Date()}});
    throw error;
  }
}

export async function consumeEmailChallenge(email:string,purpose:EmailChallengePurpose,code:string){
 return db.$transaction(tx=>consumeWithTransaction(tx,email,purpose,code));
}

type Transaction=Prisma.TransactionClient;
async function consumeWithTransaction(tx:Transaction,email:string,purpose:EmailChallengePurpose,code:string){
  const challenge=await tx.emailVerificationChallenge.findFirst({
    where:{email,purpose,consumedAt:null,invalidatedAt:null},
    orderBy:{createdAt:"desc"}
  });
  if(!challenge||challenge.expiresAt<=new Date()||challenge.attempts>=challenge.maxAttempts)return null;
  if(!matches(challenge.codeHash,hash(challenge.id,code))){
    await tx.emailVerificationChallenge.updateMany({where:{id:challenge.id,consumedAt:null,invalidatedAt:null,attempts:{lt:challenge.maxAttempts}},data:{attempts:{increment:1}}});
    return null;
  }
  const consumed=await tx.emailVerificationChallenge.updateMany({where:{id:challenge.id,consumedAt:null,invalidatedAt:null,attempts:{lt:challenge.maxAttempts},expiresAt:{gt:new Date()}},data:{consumedAt:new Date(),attempts:{increment:1}}});
  return consumed.count===1?challenge:null;
}

export async function activateEmailWithChallenge(email:string,code:string){
 return db.$transaction(async tx=>{
  const challenge=await consumeWithTransaction(tx,email,"EMAIL_VERIFICATION",code);if(!challenge)return null;
  const user=await tx.user.update({where:{id:challenge.userId},data:{emailVerifiedAt:new Date(),status:"ACTIVE",failedLoginAttempts:0,lockedUntil:null}});
  await tx.securityAuditLog.create({data:{userId:user.id,action:"EMAIL_VERIFIED"}});
  return user;
 });
}

export async function resetPasswordWithChallenge(email:string,code:string,passwordHash:string){
 return db.$transaction(async tx=>{
  const challenge=await consumeWithTransaction(tx,email,"PASSWORD_RESET",code);if(!challenge)return null;
  await tx.user.update({where:{id:challenge.userId},data:{passwordHash,passwordChangedAt:new Date(),sessionVersion:{increment:1},failedLoginAttempts:0,lockedUntil:null}});
  await tx.session.updateMany({where:{userId:challenge.userId,revokedAt:null},data:{revokedAt:new Date()}});
  await tx.securityAuditLog.create({data:{userId:challenge.userId,action:"PASSWORD_RESET"}});
  return challenge.userId;
 });
}

export async function changeEmailWithChallenge(userId:string,email:string,code:string){
 return db.$transaction(async tx=>{
  const challenge=await consumeWithTransaction(tx,email,"EMAIL_CHANGE",code);if(!challenge||challenge.userId!==userId)return false;
  await tx.user.update({where:{id:userId},data:{email,normalizedEmail:email,pendingEmail:null,emailVerifiedAt:new Date(),sessionVersion:{increment:1}}});
  await tx.session.updateMany({where:{userId,revokedAt:null},data:{revokedAt:new Date()}});
  await tx.securityAuditLog.create({data:{userId,actorId:userId,action:"EMAIL_CHANGED"}});
  return true;
 });
}
