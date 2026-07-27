import { getSessionContext } from "@/lib/auth";
import { errorResponse } from "@/lib/security";
import { listActiveSessions } from "@/lib/session-management";

export async function GET(){
 const context=await getSessionContext();if(!context)return errorResponse("UNAUTHORIZED","Authentication required",401);
 return Response.json({sessions:await listActiveSessions(context.user.id,context.sessionId)});
}
