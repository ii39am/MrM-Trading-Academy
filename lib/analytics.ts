import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const analyticsDefinitions={
 customer:"A non-deleted User record.",
 verifiedCustomer:"A customer with emailVerifiedAt set.",
 newCustomer:"A customer created inside the selected date range.",
 successfulPurchase:"A Purchase whose status is PAID.",
 pendingPayment:"A Purchase whose status is PENDING.",
 failedPayment:"A Purchase whose status is FAILED.",
 expiredPayment:"A Purchase whose status is EXPIRED.",
 refundedPayment:"A Purchase whose status is REFUNDED.",
 grossRevenue:"The sum of amountCents for PAID purchases, grouped by currency.",
 averageOrderValue:"Gross successful revenue divided by PAID purchase count for the same currency.",
 conversionRate:"PAID purchases divided by all unique Purchase checkout attempts.",
 topSellingProduct:"The product with the largest count of purchase items belonging to PAID purchases.",
 activeSession:"A Session with no revokedAt value and expiresAt later than now."
} as const;

export function analyticsRange(days:number){
 const to=new Date(),from=new Date(to);from.setUTCDate(from.getUTCDate()-Math.min(Math.max(days,1),366));return {from,to};
}

export async function getAdminAnalytics(from:Date,to:Date){
 const now=new Date(),today=new Date();today.setUTCHours(0,0,0,0);const month=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
 const [totalCustomers,newToday,newMonth,verified,suspended,statuses,revenue,coupons,activeSessions,activeProducts,topProducts,revenueByDay]=await Promise.all([
  db.user.count({where:{status:{not:"DELETED"}}}),db.user.count({where:{createdAt:{gte:today}}}),db.user.count({where:{createdAt:{gte:month}}}),
  db.user.count({where:{emailVerifiedAt:{not:null},status:{not:"DELETED"}}}),db.user.count({where:{status:{in:["DISABLED","SUSPENDED"]}}}),
  db.purchase.groupBy({by:["status"],where:{createdAt:{gte:from,lte:to}},_count:{_all:true}}),
  db.purchase.groupBy({by:["currency"],where:{status:"PAID",paidAt:{gte:from,lte:to}},_sum:{amountCents:true,refundedAmountCents:true},_count:{_all:true}}),
  db.couponRedemption.count({where:{status:"REDEEMED",redeemedAt:{gte:from,lte:to}}}),
  db.session.count({where:{revokedAt:null,expiresAt:{gt:now}}}),db.course.count({where:{status:"PUBLISHED",publishedAt:{lte:now}}}),
  db.purchaseItem.groupBy({by:["courseId"],where:{purchase:{status:"PAID",paidAt:{gte:from,lte:to}}},_count:{_all:true},orderBy:{_count:{courseId:"desc"}},take:5}),
  db.$queryRaw<Array<{day:Date;currency:string;amount:bigint;orders:bigint}>>(Prisma.sql`SELECT date_trunc('day', "paidAt") AS day, currency, SUM("amountCents")::bigint AS amount, COUNT(*)::bigint AS orders FROM "Purchase" WHERE status = 'PAID' AND "paidAt" >= ${from} AND "paidAt" <= ${to} GROUP BY 1, currency ORDER BY 1`)
 ]);
 const productNames=await db.course.findMany({where:{id:{in:topProducts.map(x=>x.courseId)}},select:{id:true,titleEn:true,titleAr:true}});
 return {totalCustomers,newToday,newMonth,verified,suspended,statuses,revenue:revenue.map(x=>({...x,total:x._sum.amountCents??0,refunded:x._sum.refundedAmountCents??0,count:x._count._all})),coupons,activeSessions,activeProducts,topProducts:topProducts.map(x=>({courseId:x.courseId,count:x._count._all,...productNames.find(p=>p.id===x.courseId)})),revenueByDay:revenueByDay.map(x=>({day:x.day.toISOString(),currency:x.currency,amount:Number(x.amount),orders:Number(x.orders)}))};
}
