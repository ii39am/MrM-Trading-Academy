import { courseRepository } from "@/lib/course-repository";
import { getLocale } from "@/lib/i18n";
import { CourseCard } from "@/components/course-card";
import { SectionHeading } from "@/components/ui";
export const dynamic="force-dynamic";
export default async function Pricing(){const courses=await courseRepository.list(),locale=await getLocale(),ar=locale==="ar";return <div className="pt-16"><section className="container-pad py-24"><SectionHeading eyebrow={ar?"الأسعار والعروض":"Pricing and offers"} title={ar?"أسعار واضحة، دون ادعاءات أو رسوم مخفية.":"Clear pricing. No hidden claims or fees."} copy={ar?"يتم تحميل كل سعر من قاعدة البيانات ويُستخدم كما هو عند إنشاء عملية الدفع.":"Every price is loaded from the database and used directly when the server creates payment."}/><div className="mt-12 grid gap-6 lg:grid-cols-3">{courses.map(course=><CourseCard key={course.id} course={course} locale={locale}/>)}</div></section></div>}
