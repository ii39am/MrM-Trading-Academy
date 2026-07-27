import { z } from "zod";
import { createSession } from "@/lib/auth";
import { publicUser } from "@/lib/user-repository";
import { activateEmailWithChallenge,normalizeEmail } from "@/lib/email-challenges";
import { clientKey,enforceRateLimit,errorResponse,identifierKey,rateLimited,verifySameOrigin } from "@/lib/security";
const schema=z.object({email:z.string().trim().email().max(254),code:z.string().regex(/^\d{6}$/)}).strict();

export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const ipRate=await enforceRateLimit(clientKey(request,"verify-email-ip"),10,15*60_000);if(!ipRate.allowed)return rateLimited(ipRate.retryAfter);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("VERIFICATION_FAILED","Invalid or expired verification code.",400);
 const email=normalizeEmail(parsed.data.email);
 const emailRate=await enforceRateLimit(identifierKey("verify-email",email),6,15*60_000);if(!emailRate.allowed)return rateLimited(emailRate.retryAfter);
 const record=await activateEmailWithChallenge(email,parsed.data.code);if(!record)return errorResponse("VERIFICATION_FAILED","Invalid or expired verification code.",400);
 const user=publicUser(record);await createSession(user,request);return Response.json({user});
}
