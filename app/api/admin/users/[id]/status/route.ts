import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { errorResponse,verifySameOrigin } from "@/lib/security";
import { writeAudit } from "@/lib/audit";

const schema=z.object({action:z.enum(["SUSPEND","REACTIVATE","REVOKE_SESSIONS","SOFT_DELETE","RESTORE"])}).strict();

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const actor=await getSessionUser();if(!isAdmin(actor))return errorResponse("FORBIDDEN","Insufficient permission",403);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("INVALID_INPUT","Invalid account action",400);
 const targetId=(await params).id;if(targetId===actor.id&&["SUSPEND","SOFT_DELETE"].includes(parsed.data.action))return errorResponse("SELF_ACTION_REJECTED","You cannot perform this action on your current account",409);
 try{
  await db.$transaction(async tx=>{
   const target=await tx.user.findUnique({where:{id:targetId},select:{id:true,role:true,status:true,emailVerifiedAt:true}});if(!target)throw new Error("NOT_FOUND");
   if(["SUSPEND","SOFT_DELETE"].includes(parsed.data.action)&&target.role==="ADMIN"&&target.status==="ACTIVE"){
    const activeAdmins=await tx.user.count({where:{role:"ADMIN",status:"ACTIVE"}});if(activeAdmins<=1)throw new Error("FINAL_ADMIN");
   }
   if(parsed.data.action==="SUSPEND")await tx.user.update({where:{id:target.id},data:{status:"SUSPENDED",sessionVersion:{increment:1}}});
   if(parsed.data.action==="REACTIVATE")await tx.user.update({where:{id:target.id},data:{status:target.emailVerifiedAt?"ACTIVE":"PENDING_VERIFICATION",sessionVersion:{increment:1}}});
   if(parsed.data.action==="REVOKE_SESSIONS")await tx.user.update({where:{id:target.id},data:{sessionVersion:{increment:1}}});
   if(parsed.data.action==="SOFT_DELETE")await tx.user.update({where:{id:target.id},data:{status:"DELETION_PENDING",deletionRequestedAt:new Date(),deletedByUserId:actor.id,sessionVersion:{increment:1}}});
   if(parsed.data.action==="RESTORE")await tx.user.update({where:{id:target.id},data:{status:target.emailVerifiedAt?"ACTIVE":"PENDING_VERIFICATION",deletionRequestedAt:null,deletedAt:null,deletedByUserId:null,deletionReason:null,sessionVersion:{increment:1}}});
   await tx.session.updateMany({where:{userId:target.id,revokedAt:null},data:{revokedAt:new Date(),revocationReason:`ADMIN_${parsed.data.action}`}});
   if(parsed.data.action==="SUSPEND")await tx.loginEvent.create({data:{userId:target.id,eventType:"ACCOUNT_SUSPENDED",success:true}});
   if(parsed.data.action==="REACTIVATE")await tx.loginEvent.create({data:{userId:target.id,eventType:"ACCOUNT_REACTIVATED",success:true}});
   await writeAudit({action:`ADMIN_${parsed.data.action}`,actorId:actor.id,actorRole:actor.role,targetUserId:target.id,entityType:"User",entityId:target.id,category:"ADMIN",request},tx);
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }catch(error){
  if(error instanceof Error&&error.message==="NOT_FOUND")return errorResponse("NOT_FOUND","User not found",404);
  if(error instanceof Error&&error.message==="FINAL_ADMIN")return errorResponse("FINAL_ADMIN","The final active administrator cannot be suspended",409);
  return errorResponse("ACTION_FAILED","Account action could not be completed",409);
 }
 return Response.json({ok:true});
}
