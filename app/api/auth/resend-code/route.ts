import { z } from "zod";
import { db } from "@/lib/db";
import { issueEmailChallenge,normalizeEmail } from "@/lib/email-challenges";
import { clientKey,enforceRateLimit,rateLimited,verifySameOrigin,errorResponse } from "@/lib/security";
const schema=z.object({email:z.string().trim().email().max(254)}).strict();
const generic="If the email address is eligible, verification instructions have been sent.";

export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const rate=await enforceRateLimit(clientKey(request,"resend-email-ip"),5,60*60_000);if(!rate.allowed)return rateLimited(rate.retryAfter);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({ok:true,message:generic});
 const email=normalizeEmail(parsed.data.email);
 const emailRate=await enforceRateLimit(`resend-email:${email}`,3,60*60_000);if(!emailRate.allowed)return rateLimited(emailRate.retryAfter);
 try{
  const user=await db.user.findUnique({where:{normalizedEmail:email},select:{id:true,emailVerifiedAt:true,status:true}});
  if(user&&!user.emailVerifiedAt&&user.status==="PENDING_VERIFICATION")await issueEmailChallenge(user.id,email,"EMAIL_VERIFICATION");
 }catch{}
 return Response.json({ok:true,message:generic});
}
