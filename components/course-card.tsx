import Image from "next/image";
import Link from "next/link";
import { Clock3, Layers3, Star, ArrowUpRight } from "lucide-react";
import type { Course } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export function CourseCard({ course }: { course: Course }) {
  return <article className="group overflow-hidden rounded-3xl border border-white/[.09] bg-white/[.035] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-black/30">
    <Link href={`/courses/${course.slug}`} className="relative block aspect-[16/10] overflow-hidden">
      <Image src={course.image} alt="" fill className="object-cover transition duration-700 group-hover:scale-105" sizes="(max-width:768px) 100vw, 33vw"/>
      <div className="absolute inset-0 bg-gradient-to-t from-[#101116] via-transparent to-transparent"/>
      <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-xs font-medium backdrop-blur-md">{course.difficulty}</span>
    </Link>
    <div className="p-6">
      <div className="flex items-center justify-between text-xs text-white/45"><span>{course.eyebrow}</span><span className="flex items-center gap-1 text-amber-300"><Star className="h-3.5 w-3.5 fill-current"/>{course.rating} <span className="text-white/30">({course.reviews})</span></span></div>
      <h3 className="mt-3 text-xl font-semibold tracking-tight">{course.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-white/45">{course.description}</p>
      <div className="mt-5 flex gap-4 border-y border-white/[.07] py-4 text-xs text-white/45"><span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5"/>{course.duration}</span><span className="flex items-center gap-1.5"><Layers3 className="h-3.5 w-3.5"/>{course.lessons} lessons</span></div>
      <div className="mt-5 flex items-center justify-between"><div><span className="text-xs text-white/35">One-time</span><p className="text-xl font-semibold">{formatPrice(course.price)}</p></div><Link href={`/courses/${course.slug}`} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[.07] transition group-hover:bg-blue-600"><ArrowUpRight className="h-4 w-4"/></Link></div>
    </div>
  </article>;
}
