import type { Metadata } from "next";
import { CourseCard } from "@/components/course-card";
import { SectionHeading } from "@/components/ui";
import { courseRepository } from "@/lib/course-repository";

export const metadata: Metadata = { title: "Courses", description: "Explore premium trading courses in price action, risk, psychology, and macro analysis." };
export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const courses = await courseRepository.list();
  return <div className="pt-16"><section className="border-b border-white/[.06] bg-grid bg-[size:56px_56px] py-20 sm:py-28"><div className="container-pad"><SectionHeading eyebrow="Course library" title="Build your complete trading skill set." copy="Structured learning paths for every stage—from risk foundations to advanced market context."/></div></section><section className="container-pad py-16 sm:py-24"><div className="mb-8 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-white/45">{courses.length} professional programs</p><div className="flex gap-2">{["All courses","Beginner","Intermediate","Advanced"].map((x,i)=><span key={x} className={`rounded-full border px-3 py-1.5 text-xs ${i===0?"border-blue-400/30 bg-blue-500/10 text-blue-300":"border-white/10 text-white/40"}`}>{x}</span>)}</div></div><div className="grid gap-6 lg:grid-cols-3">{courses.map(course=><CourseCard key={course.id} course={course}/>)}</div></section></div>;
}
