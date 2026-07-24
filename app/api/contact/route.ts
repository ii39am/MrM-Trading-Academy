import { z } from "zod";
import { db } from "@/lib/db";
import { clientKey,enforceRateLimit,errorResponse,rateLimited,verifySameOrigin } from "@/lib/security";
const schema=z.object({name:z.string().trim().min(2).max(80),email:z.string().trim().email().max(254),topic:z.enum(["Course question","Account support","Team access","Other"]),message:z.string().trim().min(10).max(3000)}).strict();
export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const rate=await enforceRateLimit(clientKey(request,"contact"),5,60*60_000);if(!rate.allowed)return rateLimited(rate.retryAfter);
 const result=schema.safeParse(await request.json().catch(()=>null));if(!result.success)return errorResponse("INVALID_INPUT","Please complete all fields",400);
 await db.contactSubmission.create({data:result.data});return Response.json({ok:true},{status:201});
}
