import type { LoginEventType } from "@prisma/client";
import { db } from "@/lib/db";
import { requestDeviceContext } from "@/lib/request-security";

export async function recordLoginEvent(request:Request,input:{userId?:string|null;eventType:LoginEventType;success:boolean;failureReasonCode?:string}){
 const device=requestDeviceContext(request);
 await db.loginEvent.create({data:{
  userId:input.userId??null,eventType:input.eventType,success:input.success,
  ipHash:device.ipHash,ipDisplayMasked:device.maskedIp,userAgentSummary:device.userAgentSummary,
  deviceType:device.deviceType,browser:device.browser,operatingSystem:device.operatingSystem,
  failureReasonCode:input.failureReasonCode
 }});
}
