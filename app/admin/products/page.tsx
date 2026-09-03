import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { AdminProductForm } from "@/components/admin-product-form";
import { getLocale } from "@/lib/i18n";
export const metadata={title:"Products administration",robots:{index:false,follow:false}};
export default async function Products(){const user=await getSessionUser();if(!user)redirect("/login?next=/admin/products");if(!isAdmin(user))redirect("/unauthorized");const [products,locale]=await Promise.all([db.course.findMany({select:{id:true,slug:true,titleEn:true,titleAr:true,shortDescriptionEn:true,shortDescriptionAr:true,fullDescriptionEn:true,fullDescriptionAr:true,instructor:true,priceCents:true,currency:true,image:true,accent:true,status:true,publishedAt:true,telegramChatId:true,telegramAccessEnabled:true,telegramButtonLabelEn:true,telegramButtonLabelAr:true},orderBy:{updatedAt:"desc"}}),getLocale()]);return <section className="container-pad pb-24"><AdminProductForm locale={locale} products={products.map(item=>({...item,publishedAt:item.publishedAt?.toISOString()??null}))}/></section>}
