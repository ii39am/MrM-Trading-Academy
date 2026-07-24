import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if(!process.env.DATABASE_URL){
 const envFile=existsSync(".env.local")?".env.local":existsSync(".env")?".env":null;
 if(envFile)loadEnvFile(envFile);
}

const db=new PrismaClient();
const [action,...args]=process.argv.slice(2);
const value=name=>{const index=args.indexOf(name);return index>=0?args[index+1]:undefined};
const has=name=>args.includes(name);
const email=value("--email")?.trim().toLowerCase();

async function main(){
 if(!["promote","demote"].includes(action)||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("Usage: npm run admin:promote -- --email user@example.com --confirm");
 if(process.env.NODE_ENV==="production"&&!has("--confirm"))throw new Error("Production role changes require --confirm.");
 const user=await db.user.findUnique({where:{normalizedEmail:email},select:{id:true,emailVerifiedAt:true,status:true,role:true}});
 if(!user||!user.emailVerifiedAt||user.status!=="ACTIVE")throw new Error("A verified active account with that email was not found.");
 if(action==="promote"){
  await db.$transaction([
   db.user.update({where:{id:user.id},data:{role:"ADMIN",sessionVersion:{increment:1}}}),
   db.securityAuditLog.create({data:{userId:user.id,actorId:user.id,action:"ADMIN_PROMOTED",metadata:{source:"cli"}}})
  ]);
  console.log("The verified account was promoted to ADMIN. Sign out and sign in again.");
  return;
 }
 const activeAdmins=await db.user.count({where:{role:"ADMIN",status:"ACTIVE"}});
 if(user.role==="ADMIN"&&activeAdmins<=1&&!has("--emergency-override"))throw new Error("Refusing to remove the final active ADMIN. Use --emergency-override only for documented recovery.");
 await db.$transaction([
  db.user.update({where:{id:user.id},data:{role:"STUDENT",sessionVersion:{increment:1}}}),
  db.securityAuditLog.create({data:{userId:user.id,actorId:user.id,action:"ADMIN_DEMOTED",metadata:{source:"cli",emergencyOverride:has("--emergency-override")}}})
 ]);
 console.log("The account was demoted to STUDENT. Existing sessions were revoked.");
}

main().catch(error=>{console.error(error instanceof Error?error.message:"Role change failed.");process.exitCode=1}).finally(()=>db.$disconnect());
