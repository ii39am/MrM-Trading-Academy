import bcrypt from "bcryptjs";
import { z } from "zod";
import { normalizeEmail,registerWithEmailChallenge } from "@/lib/email-challenges";
import { clientKey,enforceRateLimit,errorResponse,identifierKey,rateLimited,verifySameOrigin } from "@/lib/security";
import { getLocale } from "@/lib/i18n";
import { writeAudit } from "@/lib/audit";

const schema=z.object({
 name:z.string().trim().min(2).max(60).regex(/^[\p{L}\p{M}' -]+$/u),
 email:z.string().trim().email().max(254),
 password:z.string().min(10).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
 passwordConfirmation:z.string(),
 termsAccepted:z.literal(true)
}).strict().refine(value=>value.password===value.passwordConfirmation,{path:["passwordConfirmation"]});
const generic="If the email address is eligible, verification instructions have been sent.";

export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const ipRate=await enforceRateLimit(clientKey(request,"register-ip"),5,60*60_000);if(!ipRate.allowed)return rateLimited(ipRate.retryAfter);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("INVALID_INPUT","Please check the registration fields.",400);
 const email=normalizeEmail(parsed.data.email);
 const emailRate=await enforceRateLimit(identifierKey("register-email",email),3,60*60_000);if(!emailRate.allowed)return rateLimited(emailRate.retryAfter);
 try{
  const userId=await registerWithEmailChallenge(parsed.data.name,email,await bcrypt.hash(parsed.data.password,12),await getLocale());
  if(userId)await writeAudit({action:"USER_REGISTERED",targetUserId:userId,entityType:"User",entityId:userId,category:"ACCOUNT",request});
 }catch(error){
  if(error instanceof Error&&error.message==="RESEND_COOLDOWN")return Response.json({ok:true,message:generic},{status:202});
  return errorResponse("SERVICE_UNAVAILABLE","Verification email could not be sent. Try again later.",503);
 }
 return Response.json({ok:true,message:generic},{status:202});
}
