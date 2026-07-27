import { z } from "zod";
import { createSession } from "@/lib/auth";
import { userRepository } from "@/lib/user-repository";
import { normalizeEmail } from "@/lib/email-challenges";
import { clientKey,enforceRateLimit,errorResponse,identifierKey,rateLimited,verifySameOrigin } from "@/lib/security";
import { recordLoginEvent } from "@/lib/login-events";
const schema=z.object({email:z.string().trim().email().max(254),password:z.string().min(8).max(128)}).strict();

export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const ipRate=await enforceRateLimit(clientKey(request,"login-ip"),10,15*60_000);if(!ipRate.allowed)return rateLimited(ipRate.retryAfter);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("INVALID_CREDENTIALS","Invalid email or password.",401);
 const email=normalizeEmail(parsed.data.email);
 const accountRate=await enforceRateLimit(identifierKey("login-email",email),8,15*60_000);if(!accountRate.allowed)return rateLimited(accountRate.retryAfter);
 const result=await userRepository.authenticate(email,parsed.data.password);
 if(result.reason!=="OK")await recordLoginEvent(request,{userId:"userId" in result?result.userId:null,eventType:"LOGIN_FAILURE",success:false,failureReasonCode:result.reason});
 if(result.reason==="LOCKED")return errorResponse("ACCOUNT_LOCKED","Account temporarily locked. Try again later.",423);
 if(result.reason==="UNVERIFIED")return errorResponse("EMAIL_UNVERIFIED","Verify your email before signing in.",403);
 if(result.reason!=="OK")return errorResponse("INVALID_CREDENTIALS","Invalid email or password.",401);
 await createSession(result.user,request);await recordLoginEvent(request,{userId:result.user.id,eventType:"LOGIN_SUCCESS",success:true});return Response.json({user:result.user});
}
