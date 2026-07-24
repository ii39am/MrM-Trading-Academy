import Image from "next/image";
import { ArrowRight, BadgeCheck, BarChart3, Check, Play, ShieldCheck, Sparkles, Target, TrendingUp, Users } from "lucide-react";
import { courseRepository } from "@/lib/course-repository";
import { Button, FAQ, Reveal, SectionHeading } from "@/components/ui";
import { CourseCard } from "@/components/course-card";

export const dynamic = "force-dynamic";

const faqs = [
  { q: "Is this suitable for a complete beginner?", a: "Yes. Start with Risk & Trading Psychology, then move into Institutional Price Action. Every course uses a structured progression and practical exercises." },
  { q: "How long do I keep access?", a: "Every individual course and bundle purchase includes lifetime access, including future updates to that program." },
  { q: "Are the strategies tied to one market?", a: "No. The frameworks focus on price, liquidity, and risk, making them applicable across forex, indices, commodities, and liquid crypto markets." },
  { q: "Does a course guarantee profitability?", a: "No legitimate education can guarantee returns. We teach a professional process, but trading always involves risk and results depend on each trader's execution." },
];

export default async function Home() {
  const courses = await courseRepository.list();
  return <div className="overflow-hidden pt-16">
    <section className="noise relative min-h-[760px] border-b border-white/[.06]">
      <div className="absolute inset-0 bg-grid bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]"/>
      <div className="absolute left-1/2 top-10 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-blue-600/[.12] blur-[130px]"/>
      <div className="container-pad relative grid items-center gap-12 py-24 lg:grid-cols-[1.08fr_.92fr] lg:py-32">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300"><Sparkles className="h-3.5 w-3.5"/>Built for serious traders</div>
          <h1 className="mt-7 max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-.055em] sm:text-7xl">Stop chasing trades.<br/><span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">Build an edge.</span></h1>
          <p className="mt-6 max-w-xl text-balance text-lg leading-8 text-white/55">Learn to read markets, control risk, and execute with conviction through a professional trading system built for the real world.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button href="/register" className="h-13 px-7">Start learning <ArrowRight className="h-4 w-4"/></Button><Button href="/courses" variant="secondary" className="h-13 px-7"><Play className="h-4 w-4"/>Explore courses</Button></div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/40">{["Lifetime access","Actionable lessons","Community support"].map(x=><span key={x} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-400"/>{x}</span>)}</div>
        </Reveal>
        <Reveal delay={.15} className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute -inset-8 rounded-full bg-blue-500/10 blur-3xl"/>
          <div className="glass relative overflow-hidden rounded-[28px] p-3 shadow-2xl shadow-black/50">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[20px]">
              <Image src={courses[0].image} alt="Trading charts on a professional workstation" fill priority className="object-cover"/>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0f] via-transparent"/>
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between"><div><p className="text-xs text-blue-300">Now playing</p><p className="mt-1 font-medium">Understanding market structure</p></div><span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 shadow-xl"><Play className="ml-0.5 h-4 w-4 fill-current"/></span></div>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3 pt-5">{[["84%","Completion"],["4.9","Rating"],["42","Lessons"]].map(([a,b])=><div key={b} className="rounded-xl bg-white/[.04] py-3 text-center"><p className="font-semibold">{a}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-white/30">{b}</p></div>)}</div>
          </div>
        </Reveal>
      </div>
    </section>
    <section className="border-b border-white/[.06]"><div className="container-pad grid grid-cols-2 divide-x divide-white/[.06] py-10 sm:grid-cols-4">{[["2,400+","Active students"],["38","Countries"],["4.9/5","Student rating"],["91%","Course completion"]].map(([a,b])=><div key={b} className="px-4 text-center"><p className="text-2xl font-semibold tracking-tight sm:text-3xl">{a}</p><p className="mt-1 text-xs text-white/35">{b}</p></div>)}</div></section>
    <section className="container-pad py-24 sm:py-32"><SectionHeading eyebrow="Premium courses" title="Build skill in the right order." copy="Focused programs that turn complex market concepts into a clear, repeatable process."/><div className="mt-12 grid gap-6 lg:grid-cols-3">{courses.map(c=><CourseCard key={c.id} course={c}/>)}</div><div className="mt-10 text-center"><Button href="/courses" variant="secondary">View all courses <ArrowRight className="h-4 w-4"/></Button></div></section>
    <section className="border-y border-white/[.06] bg-white/[.018] py-24 sm:py-32"><div className="container-pad"><SectionHeading eyebrow="Why Mr.M" title="Education built like a trading desk." copy="No signal rooms. No shortcuts. Just the frameworks, feedback, and discipline required to become self-sufficient."/><div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{[[Target,"Practical frameworks","Every concept ends in a decision you can execute."],[BarChart3,"Market-first training","Learn on real charts, not idealized hindsight."],[ShieldCheck,"Risk before returns","Protecting capital is embedded in every lesson."],[Users,"Built-in support","Get answers and stay accountable to the process."]].map(([Icon,t,c])=><Reveal key={String(t)} className="glass rounded-2xl p-6"><Icon className="h-5 w-5 text-blue-400"/><h3 className="mt-5 font-semibold">{String(t)}</h3><p className="mt-2 text-sm leading-6 text-white/45">{String(c)}</p></Reveal>)}</div></div></section>
    <section className="container-pad py-24 sm:py-32"><div className="grid gap-14 lg:grid-cols-2 lg:items-center"><div><SectionHeading eyebrow="Student outcomes" title="From uncertainty to a repeatable process."/><div className="mt-8 space-y-4">{["A clear pre-market preparation routine","Objective entries, exits, and invalidation","Risk rules that survive losing streaks","A review loop that compounds learning"].map(x=><div key={x} className="flex gap-3 text-sm text-white/65"><BadgeCheck className="h-5 w-5 shrink-0 text-blue-400"/>{x}</div>)}</div></div><div className="grid gap-4 sm:grid-cols-2">{[["“The first course that made me slow down and see the story behind price.”","Omar K.","Index trader"],["“My biggest change wasn't entries. It was finally respecting risk consistently.”","Leila R.","Forex trader"],["“Clear, detailed, and refreshingly free of hype. The process works for me.”","Daniel S.","Futures trader"],["“I now know exactly what makes a setup valid—and when to stay out.”","Hassan A.","Crypto trader"]].map(([q,n,r],i)=><Reveal key={n} delay={i*.06} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-6"><p className="text-sm leading-6 text-white/70">{q}</p><div className="mt-5"><p className="text-sm font-medium">{n}</p><p className="text-xs text-white/35">{r}</p></div></Reveal>)}</div></div></section>
    <section className="border-y border-white/[.06] bg-white/[.018] py-24"><div className="container-pad grid gap-12 lg:grid-cols-[.7fr_1fr]"><SectionHeading eyebrow="FAQ" title="Everything you need to know."/><FAQ items={faqs}/></div></section>
    <section className="container-pad py-24"><div className="relative overflow-hidden rounded-[32px] border border-blue-400/20 bg-blue-600 p-8 text-center shadow-glow sm:p-16"><TrendingUp className="mx-auto h-8 w-8"/><h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Your next trade starts with better preparation.</h2><p className="mx-auto mt-4 max-w-xl text-blue-100/70">Join traders building durable skill—not chasing the next shortcut.</p><Button href="/register" className="mt-8 bg-white text-blue-700 hover:bg-blue-50">Start learning today <ArrowRight className="h-4 w-4"/></Button></div></section>
  </div>;
}
