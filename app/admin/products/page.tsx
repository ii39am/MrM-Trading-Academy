import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { AdminProductForm } from "@/components/admin-product-form";
export const metadata={title:"Products administration",robots:{index:false,follow:false}};
export default async function Products(){const user=await getSessionUser();if(!user)redirect("/login?next=/admin/products");if(!isAdmin(user))redirect("/unauthorized");const products=await db.course.findMany({select:{id:true,slug:true,titleEn:true,titleAr:true,shortDescriptionEn:true,shortDescriptionAr:true,fullDescriptionEn:true,fullDescriptionAr:true,instructor:true,priceCents:true,currency:true,image:true,accent:true,status:true,publishedAt:true,telegramChatId:true,telegramAccessEnabled:true,telegramButtonLabelEn:true,telegramButtonLabelAr:true},orderBy:{updatedAt:"desc"}});return <section className="container-pad pt-28 pb-24"><p className="eyebrow">Product access</p><h1 className="mt-3 text-3xl font-semibold">Secure Telegram fulfillment</h1><p className="mt-2 text-sm text-white/40">Configure only the server-side chat identifier. Customers receive short-lived invites after an entitlement check.</p><div className="mt-10"><AdminProductForm products={products.map(item=>({...item,publishedAt:item.publishedAt?.toISOString()??null}))}/></div></section>}
