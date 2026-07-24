import { z } from "zod";
import { db } from "@/lib/db";
import { issueEmailChallenge,normalizeEmail } from "@/lib/email-challenges";
import { clientKey,enforceRateLimit,errorResponse,rateLimited,verifySameOrigin } from "@/lib/security";
const schema=z.object({email:z.string().trim().email().max(254)}).strict();
const generic="If the email address is eligible, password-reset instructions have been sent.";

export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const ipRate=await enforceRateLimit(clientKey(request,"password-reset-ip"),3,60*60_000);if(!ipRate.allowed)return rateLimited(ipRate.retryAfter);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({ok:true,message:generic});
 const email=normalizeEmail(parsed.data.email);
 const emailRate=await enforceRateLimit(`password-reset-email:${email}`,3,60*60_000);if(!emailRate.allowed)return rateLimited(emailRate.retryAfter);
 try{
  const user=await db.user.findUnique({where:{normalizedEmail:email},select:{id:true,emailVerifiedAt:true,status:true}});
  if(user?.emailVerifiedAt&&user.status==="ACTIVE")await issueEmailChallenge(user.id,email,"PASSWORD_RESET");
 }catch{}
 return Response.json({ok:true,message:generic});
}
