import { cookies } from "next/headers";
import { z } from "zod";
import { getSessionContext,hasRecentAuthentication,SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { errorResponse,verifySameOrigin } from "@/lib/security";

const schema=z.object({confirmation:z.literal("DELETE MY ACCOUNT"),reason:z.string().trim().max(240).optional()}).strict();

export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const context=await getSessionContext();if(!context)return errorResponse("UNAUTHORIZED","Authentication required",401);
 if(!await hasRecentAuthentication())return errorResponse("RECENT_AUTH_REQUIRED","Sign in again before deleting your account",401);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("CONFIRMATION_REQUIRED","Explicit confirmation is required",400);
 try{
  await db.$transaction(async tx=>{
   if(context.user.role==="ADMIN"){const admins=await tx.user.count({where:{role:"ADMIN",status:"ACTIVE"}});if(admins<=1)throw new Error("FINAL_ADMIN")}
   await tx.user.update({where:{id:context.user.id},data:{status:"DELETION_PENDING",deletionRequestedAt:new Date(),deletionReason:parsed.data.reason,sessionVersion:{increment:1}}});
   await tx.session.updateMany({where:{userId:context.user.id,revokedAt:null},data:{revokedAt:new Date(),revocationReason:"ACCOUNT_DELETION_REQUESTED"}});
   await writeAudit({action:"ACCOUNT_DELETION_REQUESTED",actorId:context.user.id,actorRole:context.user.role,targetUserId:context.user.id,entityType:"User",entityId:context.user.id,category:"ACCOUNT",request},tx);
  },{isolationLevel:"Serializable"});
 }catch(error){
  if(error instanceof Error&&error.message==="FINAL_ADMIN")return errorResponse("FINAL_ADMIN_PROTECTED","The final active administrator cannot request deletion",409);
  throw error;
 }
 (await cookies()).delete(SESSION_COOKIE);return Response.json({ok:true,recoveryWindowDays:30});
}
