import { BookOpenText } from "lucide-react";
import { getLocale } from "@/lib/i18n";
import { Button, SectionHeading } from "@/components/ui";

export const metadata = { title: "Academy journal", description: "Mr.ME Trading Academy educational journal." };

export default async function BlogPage() {
  const ar = (await getLocale()) === "ar";
  return <div className="page-shell"><SectionHeading eyebrow={ar ? "مدونة الأكاديمية" : "Academy journal"} title={ar ? "محتوى تعليمي قيد الإعداد." : "Educational insights are being prepared."} copy={ar ? "ستُنشر هنا مقالات مسؤولة حول قراءة السوق، إدارة المخاطر، وبناء عملية تداول واضحة. لن ننشر وعود أرباح أو نتائج غير موثقة." : "This space will hold responsible articles on market reading, risk management, and building a clear trading process—without profit promises or unsupported results."} /><div className="mt-12 rounded-3xl border border-violet-300/10 bg-[#0D0918] px-6 py-14 text-center"><BookOpenText className="mx-auto h-8 w-8 text-violet-300" aria-hidden="true" /><h2 className="mt-5 text-xl font-semibold">{ar ? "لا توجد مقالات منشورة حالياً" : "No articles are published yet"}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-violet-100/42">{ar ? "يمكنك استعراض الدورات المتاحة الآن والعودة لاحقاً للمحتوى الجديد." : "Explore the currently available courses and check back later for new educational content."}</p><Button href="/courses" variant="secondary" className="mt-7">{ar ? "استعرض الدورات" : "Explore courses"}</Button></div></div>;
}
