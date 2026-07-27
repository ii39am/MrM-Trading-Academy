import type { Prisma,UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { requestDeviceContext } from "@/lib/request-security";

const allowedMetadata=new Set(["courseId","purchaseId","couponId","status","fromStatus","toStatus","source","reason","count","currency","amountCents","discountAmountCents","emergencyOverride"]);

export function sanitizeAuditMetadata(input:Record<string,unknown>|undefined):Prisma.InputJsonValue|undefined{
 if(!input)return undefined;
 return Object.fromEntries(Object.entries(input).filter(([key,value])=>allowedMetadata.has(key)&&(["string","number","boolean"].includes(typeof value)||value===null))) as Prisma.InputJsonValue;
}

export async function writeAudit(input:{
 action:string;actorId?:string|null;actorRole?:UserRole|null;targetUserId?:string|null;
 entityType?:string;entityId?:string;category?:string;metadata?:Record<string,unknown>;request?:Request;
},client:Prisma.TransactionClient|typeof db=db){
 const device=input.request?requestDeviceContext(input.request):null;
 return client.securityAuditLog.create({data:{
  userId:input.targetUserId??null,actorId:input.actorId??null,actorRole:input.actorRole??null,
  action:input.action,category:input.category,entityType:input.entityType,entityId:input.entityId,
  targetUserId:input.targetUserId??null,ipHash:device?.ipHash,userAgentSummary:device?.userAgentSummary,
  metadata:sanitizeAuditMetadata(input.metadata)
 }});
}
