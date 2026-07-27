import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata={title:"Coupons",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function Coupons(){
 const actor=await getSessionUser();if(!actor)redirect("/login?next=/admin/coupons");if(!isAdmin(actor))redirect("/unauthorized");
 const coupons=await db.coupon.findMany({select:{id:true,code:true,descriptionEn:true,descriptionAr:true,discountType:true,discountValue:true,currency:true,active:true,startsAt:true,expiresAt:true,totalUsageLimit:true,perUserUsageLimit:true,_count:{select:{redemptions:true,products:true}}},orderBy:{createdAt:"desc"},take:100});
 return <section className="container-pad pt-28 pb-24"><p className="eyebrow">Coupons</p><h1 className="mt-3 text-3xl font-semibold">Discount controls</h1><p className="mt-2 text-sm text-white/45">Coupon prices and limits are enforced transactionally on the server. Use the protected coupon API to create or edit offers.</p><div className="mt-8 grid gap-4">{coupons.map(coupon=><article key={coupon.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-mono text-blue-300">{coupon.code}</p><p className="mt-2">{coupon.descriptionEn}</p><p dir="rtl" className="mt-1 text-sm text-white/45">{coupon.descriptionAr}</p></div><span className={coupon.active?"text-emerald-300":"text-white/35"}>{coupon.active?"Active":"Disabled"}</span></div><p className="mt-4 text-sm text-white/50">{coupon.discountType==="PERCENTAGE"?`${coupon.discountValue}%`:`${(coupon.discountValue/100).toFixed(2)} ${coupon.currency}`} · {coupon._count.products||"All"} products · {coupon._count.redemptions} reservations/redemptions</p></article>)}{!coupons.length&&<p className="rounded-2xl border border-white/10 p-10 text-center text-white/45">No coupons created.</p>}</div></section>;
}
