import { z } from "zod";
import { getSessionUser,hasRecentAuthentication } from "@/lib/auth";
import { userRepository } from "@/lib/user-repository";
import { issueEmailChallenge,normalizeEmail } from "@/lib/email-challenges";
import { db } from "@/lib/db";
import { clientKey,enforceRateLimit,errorResponse,rateLimited,verifySameOrigin } from "@/lib/security";
const schema=z.object({email:z.string().trim().email().max(254),password:z.string().min(8).max(128)}).strict();
export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const user=await getSessionUser();if(!user||!await hasRecentAuthentication())return errorResponse("RECENT_AUTH_REQUIRED","Recent authentication required",401);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success||!await userRepository.verifyPassword(user.id,parsed.data.password))return errorResponse("INVALID_CREDENTIALS","Unable to change email",401);
 const rate=await enforceRateLimit(clientKey(request,`email-change:${user.id}`),3,60*60_000);if(!rate.allowed)return rateLimited(rate.retryAfter);
 const email=normalizeEmail(parsed.data.email);if(await db.user.findUnique({where:{normalizedEmail:email},select:{id:true}}))return errorResponse("EMAIL_UNAVAILABLE","Unable to use that email address",409);
 await db.user.update({where:{id:user.id},data:{pendingEmail:email}});
 try{await issueEmailChallenge(user.id,email,"EMAIL_CHANGE")}catch{return errorResponse("SERVICE_UNAVAILABLE","Verification email could not be sent",503)}
 return Response.json({ok:true});
}
