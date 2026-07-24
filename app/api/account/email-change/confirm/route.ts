import { z } from "zod";
import { clearSession,getSessionUser } from "@/lib/auth";
import { changeEmailWithChallenge } from "@/lib/email-challenges";
import { db } from "@/lib/db";
import { errorResponse,verifySameOrigin } from "@/lib/security";
const schema=z.object({code:z.string().regex(/^\d{6}$/)}).strict();
export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const user=await getSessionUser();if(!user)return errorResponse("UNAUTHORIZED","Authentication required",401);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("VERIFICATION_FAILED","Invalid or expired code",400);
 const record=await db.user.findUnique({where:{id:user.id},select:{pendingEmail:true}});if(!record?.pendingEmail)return errorResponse("VERIFICATION_FAILED","Invalid or expired code",400);
 const changed=await changeEmailWithChallenge(user.id,record.pendingEmail,parsed.data.code);if(!changed)return errorResponse("VERIFICATION_FAILED","Invalid or expired code",400);
 await clearSession();return Response.json({ok:true,reauthenticate:true});
}
