import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { errorResponse,verifySameOrigin } from "@/lib/security";

export async function POST(request:Request) {
  if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
  await clearSession();
  return NextResponse.json({ ok: true });
}
