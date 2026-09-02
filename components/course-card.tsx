import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpenCheck, ShieldCheck } from "lucide-react";
import type { Course, Locale } from "@/lib/types";
import { localized } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";

export function CourseCard({ course, locale }: { course: Course; locale: Locale }) {
  const copy = localized(course, locale);
  const ar = locale === "ar";
  return (
    <article className="group relative overflow-hidden rounded-[1.65rem] border border-violet-200/[.09] bg-[#0D0918] shadow-[0_24px_75px_rgba(2,1,8,.2)] transition duration-300 hover:-translate-y-1 hover:border-violet-300/25 hover:shadow-[0_28px_85px_rgba(50,20,92,.3)]">
      <Link href={`/courses/${course.slug}`} className="relative block aspect-[16/10] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300">
        <Image src={course.image} alt={copy.title} fill className="object-cover transition duration-700 group-hover:scale-[1.035]" sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 33vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0918] via-[#0D0918]/15 to-transparent" />
        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-[#08060F]/78 px-3 py-1.5 text-[11px] text-violet-100/75 backdrop-blur-md"><BookOpenCheck className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />{ar ? "تعليم منظم" : "Structured learning"}</span>
          <MiniChart />
        </div>
      </Link>
      <div className="p-5 sm:p-6">
        <p className="text-[11px] font-medium uppercase tracking-[.16em] text-violet-300/65">{course.instructor}</p>
        <h3 className="mt-3 text-xl font-semibold leading-snug tracking-[-.02em]">{copy.title}</h3>
        <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-violet-100/45">{copy.shortDescription}</p>
        <div className="mt-5 flex items-center gap-2 text-xs text-emerald-300/80"><ShieldCheck className="h-4 w-4" aria-hidden="true" />{ar ? "وصول خاص بعد تأكيد الدفع" : "Private access after payment confirmation"}</div>
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/[.07] pt-5">
          <div><span className="text-[11px] text-white/30">{ar ? "دفعة واحدة" : "One-time payment"}</span><p className="mt-0.5 text-xl font-semibold">{formatPrice(course.price, course.currency)}</p></div>
          <Link href={`/courses/${course.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:border-violet-300/30 hover:bg-violet-500/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">{ar ? "عرض الدورة" : "View course"}<ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" /></Link>
        </div>
      </div>
    </article>
  );
}

function MiniChart() {
  return <svg viewBox="0 0 82 30" className="h-8 w-20 rounded-lg border border-white/[.07] bg-[#08060F]/78 p-1.5 backdrop-blur-md" aria-hidden="true" focusable="false"><path d="M1 24 C12 21 16 8 26 14 S39 23 48 10 S61 15 80 2" fill="none" stroke="#C084FC" strokeWidth="1.6" strokeLinecap="round"/><g strokeWidth="1">{[[10,12,6,20],[33,16,10,23],[57,9,3,17],[70,7,2,13]].map(([x,o,c,l],index)=><g key={x} stroke={index===1?"#FB7185":"#34D399"}><line x1={x} x2={x} y1={c} y2={l}/><rect x={x-2} y={Math.min(o,c)} width="4" height={Math.max(3,Math.abs(o-c))} fill={index===1?"#FB7185":"#34D399"} stroke="none"/></g>)}</g></svg>;
}
