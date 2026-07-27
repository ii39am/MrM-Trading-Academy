import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/security";

const querySchema=z.object({page:z.coerce.number().int().min(1).max(100000).default(1),search:z.string().trim().max(100).default(""),status:z.enum(["PENDING_VERIFICATION","ACTIVE","DISABLED","SUSPENDED","DELETION_PENDING","DELETED","MIGRATION_REQUIRED"]).optional(),verified:z.enum(["true","false"]).optional(),language:z.enum(["en","ar"]).optional(),registeredFrom:z.coerce.date().optional(),registeredTo:z.coerce.date().optional(),lastLoginFrom:z.coerce.date().optional(),lastLoginTo:z.coerce.date().optional(),sort:z.enum(["createdAt","lastLoginAt","name"]).default("createdAt"),direction:z.enum(["asc","desc"]).default("desc")});

export async function GET(request:Request){
 const actor=await getSessionUser();if(!isAdmin(actor))return errorResponse("FORBIDDEN","Insufficient permission",403);
 const parsed=querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));if(!parsed.success)return errorResponse("INVALID_INPUT","Invalid user query",400);
 const {page,search,status,verified,language,registeredFrom,registeredTo,lastLoginFrom,lastLoginTo,sort,direction}=parsed.data,take=25,where={...(status?{status}:{}),...(verified?{emailVerifiedAt:verified==="true"?{not:null}:null}:{}),...(language?{preferredLanguage:language}:{}),...(registeredFrom||registeredTo?{createdAt:{gte:registeredFrom,lte:registeredTo}}:{}),...(lastLoginFrom||lastLoginTo?{lastLoginAt:{gte:lastLoginFrom,lte:lastLoginTo}}:{}),...(search?{OR:[{name:{contains:search,mode:"insensitive" as const}},{normalizedEmail:{contains:search,mode:"insensitive" as const}}]}:{})};
 const [users,total]=await db.$transaction([
  db.user.findMany({where,select:{id:true,name:true,email:true,emailVerifiedAt:true,role:true,status:true,preferredLanguage:true,createdAt:true,lastLoginAt:true,_count:{select:{purchases:true}}},orderBy:{[sort]:direction},skip:(page-1)*take,take}),
  db.user.count({where})
 ]);
 const ids=users.map(user=>user.id),[spend,sessions]=await Promise.all([db.purchase.groupBy({by:["userId","currency"],where:{userId:{in:ids},status:"PAID"},_sum:{amountCents:true}}),db.session.groupBy({by:["userId"],where:{userId:{in:ids},revokedAt:null,expiresAt:{gt:new Date()}},_count:{_all:true}})]);
 return Response.json({users:users.map(user=>({...user,totalPaid:spend.filter(x=>x.userId===user.id).map(x=>({currency:x.currency,amountCents:x._sum.amountCents??0})),activeSessions:sessions.find(x=>x.userId===user.id)?._count._all??0})),total,page,pageSize:take});
}
