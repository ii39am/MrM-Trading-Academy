import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/security";

const querySchema=z.object({page:z.coerce.number().int().min(1).max(100000).default(1),search:z.string().trim().max(100).default(""),status:z.enum(["PENDING_VERIFICATION","ACTIVE","DISABLED","MIGRATION_REQUIRED"]).optional()});

export async function GET(request:Request){
 const actor=await getSessionUser();if(!isAdmin(actor))return errorResponse("FORBIDDEN","Insufficient permission",403);
 const parsed=querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));if(!parsed.success)return errorResponse("INVALID_INPUT","Invalid user query",400);
 const {page,search,status}=parsed.data,take=25,where={...(status?{status}:{}),...(search?{OR:[{name:{contains:search,mode:"insensitive" as const}},{normalizedEmail:{contains:search,mode:"insensitive" as const}}]}:{})};
 const [users,total]=await db.$transaction([
  db.user.findMany({where,select:{id:true,name:true,email:true,emailVerifiedAt:true,role:true,status:true,preferredLanguage:true,createdAt:true,lastLoginAt:true,_count:{select:{purchases:true,sessions:true}}},orderBy:{createdAt:"desc"},skip:(page-1)*take,take}),
  db.user.count({where})
 ]);
 return Response.json({users,total,page,pageSize:take});
}
