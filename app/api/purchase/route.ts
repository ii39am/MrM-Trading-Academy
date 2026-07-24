import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payment";
import { db } from "@/lib/db";
import { errorResponse,verifySameOrigin } from "@/lib/security";
const schema=z.object({courseIds:z.array(z.string().min(1).max(100)).min(1).max(10)}).strict();
export async function POST(request:Request){
 if(!verifySameOrigin(request))return errorResponse("CSRF_REJECTED","Request origin rejected",403);
 const user=await getSessionUser();if(!user?.emailVerified)return errorResponse("UNAUTHORIZED","Verified email required",401);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return errorResponse("INVALID_INPUT","Invalid checkout request",400);
 const ids=[...new Set(parsed.data.courseIds)],courses=await db.course.findMany({where:{id:{in:ids},status:"PUBLISHED",publishedAt:{lte:new Date()}}});
 if(courses.length!==ids.length)return errorResponse("INVALID_COURSE","Course is unavailable",400);
 if(await db.enrollment.count({where:{userId:user.id,courseId:{in:ids}}}))return errorResponse("ALREADY_OWNED","One or more courses are already owned",409);
 const provider=getPaymentProvider(),amountCents=courses.reduce((sum,course)=>sum+course.priceCents,0);
 const purchase=await db.purchase.create({data:{userId:user.id,provider:provider.name,providerSessionId:`pending:${crypto.randomUUID()}`,status:"PENDING",amountCents,currency:"USD",payCurrency:"usdttrc20",network:"TRC20",items:{create:courses.map(course=>({courseId:course.id,priceCents:course.priceCents}))}}});
 try{const checkout=await provider.createCheckout({purchaseId:purchase.id,userId:user.id,courseIds:ids,amountCents});await db.purchase.update({where:{id:purchase.id},data:{providerSessionId:checkout.id,providerPaymentId:checkout.id,expectedAmount:checkout.payAmount,paymentAddress:checkout.payAddress,expiresAt:new Date(checkout.expiresAt),providerStatus:"waiting"}});return Response.json(checkout,{status:201})}
 catch{await db.purchase.update({where:{id:purchase.id},data:{status:"FAILED",providerStatus:"invoice_error"}});return errorResponse("PAYMENT_UNAVAILABLE","Payments are unavailable",503)}
}
