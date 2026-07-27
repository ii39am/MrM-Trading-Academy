import bcrypt from "bcryptjs";
import { z } from "zod";
import { normalizeEmail,resetPasswordWithChallenge } from "@/lib/email-challenges";
import { getEmailProvider,passwordChangedEmail } from "@/lib/email";
import { clientKey,enforceRateLimit,errorResponse,identifierKey,rateLimited,verifySameOrigin } from "@/lib/security";
import { recordLoginEvent } from "@/lib/login-events";
const schema=z.object({
 email:z.string().trim().email().max(254),
 code:z.string().regex(/^\d{6}$/),
 newPassword:z.string().min(10).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
 passwordConfirmation:z.string()
}).strict().refine(value=>value.newPassword===value.passwordConfirmation,{path:["passwordConfirmation"]});

export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const ipRate=await enforceRateLimit(clientKey(request,"password-reset-confirm-ip"),8,60*60_000);if(!ipRate.allowed)return rateLimited(ipRate.retryAfter);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("RESET_FAILED","Reset details are invalid or expired.",400);
 const email=normalizeEmail(parsed.data.email);
 const emailRate=await enforceRateLimit(identifierKey("password-reset-confirm",email),6,60*60_000);if(!emailRate.allowed)return rateLimited(emailRate.retryAfter);
 const reset=await resetPasswordWithChallenge(email,parsed.data.code,await bcrypt.hash(parsed.data.newPassword,12));if(!reset)return errorResponse("RESET_FAILED","Reset details are invalid or expired.",400);
 await recordLoginEvent(request,{userId:reset,eventType:"PASSWORD_RESET",success:true});
 try{await getEmailProvider().send({to:email,...passwordChangedEmail()})}catch{}
 return Response.json({ok:true,reauthenticate:true});
}
