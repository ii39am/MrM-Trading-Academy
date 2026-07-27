import type { Metadata } from "next";
import { CourseCard } from "@/components/course-card";
import { SectionHeading } from "@/components/ui";
import { courseRepository } from "@/lib/course-repository";
import { getLocale } from "@/lib/i18n";
export const metadata:Metadata={title:"Courses | الدورات",description:"Mr.ME Trading Academy private-access products."};
export const dynamic="force-dynamic";
export default async function CoursesPage(){const courses=await courseRepository.list(),locale=await getLocale(),ar=locale==="ar";return <div className="pt-16"><section className="border-b border-white/[.06] bg-grid bg-[size:56px_56px] py-20 sm:py-28"><div className="container-pad"><SectionHeading eyebrow={ar?"عروض الأكاديمية":"Academy offers"} title={ar?"اختر المنتج المناسب لرحلتك.":"Choose the right product for your journey."} copy={ar?"منتجات تعليمية احترافية مع وصول خاص عبر تيليجرام بعد تأكيد الدفع.":"Premium educational products with private Telegram access after verified payment."}/></div></section><section className="container-pad py-16 sm:py-24">{courses.length?<div className="grid gap-6 lg:grid-cols-3">{courses.map(course=><CourseCard key={course.id} course={course} locale={locale}/>)}</div>:<div className="glass rounded-3xl p-14 text-center"><h2 className="text-xl font-semibold">{ar?"لا توجد عروض منشورة حالياً":"No offers are published yet"}</h2><p className="mt-2 text-sm text-white/45">{ar?"يرجى العودة قريباً.":"Please check back soon."}</p></div>}</section></div>}
