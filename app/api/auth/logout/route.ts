import { NextResponse } from "next/server";
import { clearSession,getSessionContext } from "@/lib/auth";
import { errorResponse,verifySameOrigin } from "@/lib/security";
import { recordLoginEvent } from "@/lib/login-events";

export async function POST(request:Request) {
  if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
  const context=await getSessionContext();await clearSession("LOGOUT");
  if(context)await recordLoginEvent(request,{userId:context.user.id,eventType:"LOGOUT",success:true});
  return NextResponse.json({ ok: true });
}
