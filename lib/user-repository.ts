import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { User } from "@/lib/types";

type RecordShape={id:string;name:string;email:string;normalizedEmail:string;emailVerifiedAt:Date|null;role:"STUDENT"|"INSTRUCTOR"|"ADMIN";status:"PENDING_VERIFICATION"|"ACTIVE"|"DISABLED"|"MIGRATION_REQUIRED";sessionVersion:number;preferredLanguage:string};
export const publicUser=(record:RecordShape):User=>({id:record.id,name:record.name,email:record.email,emailVerified:Boolean(record.emailVerifiedAt),role:record.role,status:record.status,sessionVersion:record.sessionVersion,preferredLanguage:record.preferredLanguage==="ar"?"ar":"en"});
const dummyHash="$2a$12$7EoVZpKybCNkU9v9q8i4Qe5IAvSQPOyjZdDJRjhxyyl6YbCXlp.V.";

export const userRepository={
 async findByEmail(normalizedEmail:string){return db.user.findUnique({where:{normalizedEmail}})},
 async authenticate(normalizedEmail:string,password:string){
  const record=await db.user.findUnique({where:{normalizedEmail}});
  const valid=await bcrypt.compare(password,record?.passwordHash??dummyHash);
  if(!record||!valid){
   if(record){
    const updated=await db.user.update({where:{id:record.id},data:{failedLoginAttempts:{increment:1}},select:{failedLoginAttempts:true}});
    if(updated.failedLoginAttempts>=5)await db.user.update({where:{id:record.id},data:{lockedUntil:new Date(Date.now()+15*60_000)}});
    await db.securityAuditLog.create({data:{userId:record.id,action:"LOGIN_FAILED"}});
   }
   return {reason:"INVALID" as const};
  }
  if(record.lockedUntil&&record.lockedUntil>new Date())return {reason:"LOCKED" as const};
  if(record.status==="DISABLED"||record.status==="MIGRATION_REQUIRED")return {reason:"INVALID" as const};
  if(!record.emailVerifiedAt||record.status!=="ACTIVE")return {reason:"UNVERIFIED" as const,userId:record.id};
  await db.$transaction([
   db.user.update({where:{id:record.id},data:{failedLoginAttempts:0,lockedUntil:null,lastLoginAt:new Date()}}),
   db.securityAuditLog.create({data:{userId:record.id,action:"LOGIN_SUCCEEDED"}})
  ]);
  return {reason:"OK" as const,user:publicUser(record)};
 },
 async findById(id:string):Promise<User|null>{
  const record=await db.user.findUnique({where:{id}});
  return record?publicUser(record):null;
 },
 async verifyPassword(id:string,password:string){
  const record=await db.user.findUnique({where:{id},select:{passwordHash:true}});
  return bcrypt.compare(password,record?.passwordHash??dummyHash);
 }
};
