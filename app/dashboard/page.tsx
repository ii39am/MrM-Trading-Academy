import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard-client";
import { db } from "@/lib/db";
import { getLocale } from "@/lib/i18n";
export const metadata={title:"My purchases",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function Dashboard(){const user=await getSessionUser();if(!user)redirect("/login?next=/dashboard");const purchases=await db.purchase.findMany({where:{userId:user.id},select:{id:true,status:true,amountCents:true,currency:true,createdAt:true,items:{select:{course:{select:{titleEn:true,titleAr:true,slug:true}}}}},orderBy:{createdAt:"desc"}});return <DashboardClient user={user} locale={await getLocale()} purchases={purchases.map(item=>({...item,createdAt:item.createdAt.toISOString()}))}/>}
