import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  CircleGauge,
  Compass,
  LockKeyhole,
  Route,
  ShieldCheck,
  Target,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { courseRepository } from "@/lib/course-repository";
import { getLocale } from "@/lib/i18n";
import { Button, EmptyState, FAQ, Reveal, SectionHeading } from "@/components/ui";
import { CourseCard } from "@/components/course-card";
import { CourseMarketPanel, DecorativeChart, EducationChart, HeroBackdropChart, InstrumentCards, SecurityVisual } from "@/components/trading-visuals";

export const dynamic = "force-dynamic";

export default async function Home() {
  const courses = await courseRepository.list();
  const locale = await getLocale();
  const ar = locale === "ar";

  const features = ar
    ? [[BarChart3, "محتوى عملي", "مفاهيم قابلة للتطبيق والمراجعة"], [Route, "مسار واضح", "تعلّم منظم بعيداً عن التشتيت"], [ShieldCheck, "وصول آمن", "حسابك هو بوابة دوراتك"], [UsersRound, "مجتمع خاص", "مساحة تعلم مخصصة للمشتركين"]]
    : [[BarChart3, "Practical content", "Concepts built for application and review"], [Route, "Clear learning path", "Structured progress without the noise"], [ShieldCheck, "Secure access", "Your account remains the gateway to courses"], [UsersRound, "Private community", "A focused space for enrolled learners"]];

  const steps = ar
    ? [[BookOpenCheck, "اختر العرض المناسب", "راجع محتوى الدورة وسعرها بوضوح، ثم اختر ما يلائم مرحلتك التعليمية."], [WalletCards, "ادفع وانتظر التأكيد", "أكمل الدفع عبر المسار الآمن وانتظر حتى تؤكد المنصة استلامه."], [UsersRound, "ادخل مجتمعك الخاص", "بعد التأكيد، افتح دورتك من حسابك واطلب رابط الدخول الآمن عند الحاجة."]]
    : [[BookOpenCheck, "Choose the right offer", "Review the course content and price, then select what fits your learning stage."], [WalletCards, "Pay and await confirmation", "Complete the secure checkout and wait for the platform to confirm receipt."], [UsersRound, "Enter your private community", "Once confirmed, open your course from your account and request secure access when needed."]];

  const values = ar
    ? [[Route, "تعلم منظم", "مسار واضح يحول الموضوعات المعقدة إلى خطوات يمكن متابعتها."], [Compass, "فهم قبل التنفيذ", "نركز على قراءة السياق وبناء القرار، لا ملاحقة حركة السوق."], [Target, "مفاهيم عملية", "تعلم يربط الفكرة بالملاحظة والمراجعة المنضبطة."], [CircleGauge, "وعي بالمخاطر", "نضع إدارة المخاطر والمسؤولية في صميم التجربة التعليمية."], [LockKeyhole, "وصول محمي", "الدورات والمجتمع الخاص متاحان فقط عبر الحساب المستحق."], [UsersRound, "تطور مستمر", "بيئة تعليمية خاصة تدعم بناء المعرفة مع مرور الوقت."]]
    : [[Route, "Structured learning", "A clear path that turns complex topics into steps you can follow."], [Compass, "Understand before acting", "We focus on reading context and building decisions—not chasing movement."], [Target, "Practical concepts", "Learning that connects ideas with observation and disciplined review."], [CircleGauge, "Risk awareness", "Responsible risk management sits at the center of the experience."], [LockKeyhole, "Protected access", "Courses and private community access remain tied to valid accounts."], [UsersRound, "Continuous development", "A private educational environment built for knowledge that compounds over time."]];

  const faq = ar
    ? [
      { q: "كيف أحصل على الوصول إلى الدورة؟", a: "بعد إتمام الدفع وتأكيده، تظهر الدورة في حسابك. من صفحة مشترياتك يمكنك طلب رابط دخول آمن ومؤقت إلى مجتمع الدورة الخاص." },
      { q: "كم يستغرق تأكيد الدفع؟", a: "يعتمد الوقت على تأكيدات الشبكة وحالة مزود الدفع. ستبقى صفحة الدفع محدثة، ولن تظهر حالة النجاح قبل وصول التأكيد الفعلي." },
      { q: "هل يمكنني مشاركة رابط مجتمع الدورة؟", a: "لا. روابط الدخول قصيرة الصلاحية ومحدودة الاستخدام، والوصول مخصص للحساب المسجل في الدورة." },
      { q: "ماذا أفعل إذا فقدت الوصول إلى حسابي؟", a: "استخدم استعادة كلمة المرور أو تواصل مع الدعم باستخدام البريد المرتبط بحسابك ومعرّف عملية الشراء." },
    ]
    : [
      { q: "How do I access my course?", a: "After payment is confirmed, the course appears in your account. From your purchase page, you can request a secure, short-lived invite to its private community." },
      { q: "How long does payment confirmation take?", a: "Timing depends on network confirmations and the payment provider. The payment page stays updated and will not show success before confirmation is actually received." },
      { q: "Can I share the course community invite?", a: "No. Invites are short-lived and limited-use, while access remains reserved for the account enrolled in the course." },
      { q: "What if I lose access to my account?", a: "Use password recovery or contact support with the email linked to your account and your Purchase ID." },
    ];

  return (
    <div className="overflow-hidden pt-20">
      <section className="home-hero noise relative isolate border-b border-violet-200/[.07]">
        <div className="absolute inset-0 -z-30 bg-[#070511]" />
        <div className="absolute inset-0 -z-20 bg-premium-grid opacity-65 [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
        <div className="absolute -start-40 top-8 -z-10 h-[32rem] w-[32rem] rounded-full bg-violet-700/15 blur-[120px]" />
        <div className="absolute -end-32 top-20 -z-10 h-[30rem] w-[30rem] rounded-full bg-fuchsia-700/10 blur-[130px]" />
        <HeroBackdropChart />
        <div className="container-pad grid min-h-[720px] items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.02fr_.98fr] lg:gap-10 xl:min-h-[780px] xl:gap-16">
          <Reveal>
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-500/[.07] px-4 py-2 text-xs font-medium text-violet-100/75 shadow-[inset_0_1px_rgba(255,255,255,.04)]"><span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_12px_#A855F7]" />{ar ? "تعليم تداول منظم ومسؤول" : "Structured, responsible trading education"}</div>
              <h1 className="mt-7 text-balance text-[2.85rem] font-semibold leading-[.98] tracking-[-.055em] text-white sm:text-6xl xl:text-[4.9rem]">
                {ar ? <>تداول <span className="text-gradient-purple">بوضوح.</span><br />وتقدّم بثقة.</> : <>Trade with <span className="text-gradient-purple">clarity.</span><br />Advance with confidence.</>}
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-violet-100/52 sm:text-lg">{ar ? "تقدم لك أكاديمية Mr.ME تعليماً منظماً لفهم حركة السوق، ودورات واضحة، ووصولاً آمناً إلى مجتمع التعلم الخاص — دون وعود مبالغ فيها أو ضوضاء." : "Mr.ME delivers structured education for understanding market movement, clear courses, and secure access to a private learning community—without inflated promises or noise."}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button href="/courses" className="min-h-12 px-7">{ar ? "استعرض الدورات" : "Explore courses"}<ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></Button>
                <Button href="/about" variant="secondary" className="min-h-12 px-7">{ar ? "تعرف على الأكاديمية" : "Discover the academy"}</Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-violet-100/40 sm:text-sm">
                {(ar ? ["مسار تعليمي واضح", "محتوى مسؤول", "وصول مرتبط بحسابك"] : ["Clear learning path", "Responsible content", "Account-bound access"]).map((item) => <span key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-violet-400" aria-hidden="true" />{item}</span>)}
              </div>
            </div>
          </Reveal>
          <Reveal delay={.08}>
            <aside className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-[1.75rem] border border-violet-300/16 bg-[#0B0717]/90 p-3 shadow-[0_30px_90px_rgba(26,8,59,.48)] backdrop-blur-xl">
              <div className="rounded-[1.35rem] border border-white/[.06] bg-[#0D0918]/92 p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4"><p className="eyebrow">{ar?"مسار Mr.ME":"The Mr.ME path"}</p><span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_16px_#A855F7]"/></div>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-.025em] sm:text-3xl">{ar?"تعلّم بلا ضوضاء.":"Learn without the noise."}</h2>
                <p className="mt-4 text-sm leading-7 text-violet-100/48">{ar?"دورات عملية بخطوات واضحة تساعدك على بناء فهم منظم للسوق واتخاذ قرارات أكثر وعياً.":"Practical courses with clear steps to help you build structured market understanding and make more informed decisions."}</p>
                <div className="mt-6 grid gap-2.5">
                  {steps.map(([Icon,title],index)=><div key={String(title)} className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.025] px-4 py-3 transition hover:border-violet-300/14 hover:bg-violet-500/[.045]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300"><Icon className="h-4 w-4" aria-hidden="true"/></span><span className="flex-1 text-sm font-medium text-violet-50/80">{String(title)}</span><span className="font-mono text-[10px] text-violet-100/20">0{index+1}</span></div>)}
                </div>
                <Button href="/courses" className="mt-6 w-full">{ar?"استعرض الدورات":"Explore courses"}<ArrowRight className="h-4 w-4 rtl:-scale-x-100"/></Button>
              </div>
            </aside>
          </Reveal>
        </div>
        <div className="container-pad relative z-10 -mb-12">
          <div className="grid overflow-hidden rounded-2xl border border-violet-200/[.09] bg-[#0B0716]/92 shadow-[0_25px_70px_rgba(2,1,7,.4)] backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">
            {features.map(([Icon, title, copy], index) => <div key={String(title)} className="flex gap-4 border-violet-200/[.07] p-5 sm:p-6 [&:not(:last-child)]:border-b sm:[&:nth-child(odd)]:border-e sm:[&:nth-child(-n+2)]:border-b lg:[&:not(:last-child)]:border-e lg:[&:not(:last-child)]:border-b-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><Icon className="h-4.5 w-4.5" aria-hidden="true" /></span><div><h2 className="text-sm font-semibold">{String(title)}</h2><p className="mt-1 text-xs leading-5 text-violet-100/35">{String(copy)}</p></div><span className="sr-only">{index + 1}</span></div>)}
          </div>
        </div>
      </section>

      <section className="container-pad pt-28 sm:pt-32"><InstrumentCards locale={locale} /></section>

      <section className="container-pad py-20 sm:py-24">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading eyebrow={ar ? "الدورات المتاحة" : "Featured courses"} title={ar ? "اختر ما يناسب مرحلتك في التداول." : "Choose what fits your trading journey."} copy={ar ? "دورات منشورة من الأكاديمية ببياناتها وأسعارها الفعلية، مع شرح واضح لما ستتعلمه وكيف ستصل إلى محتواك." : "Published academy courses with their actual content and prices, clearly explaining what you will learn and how access works."} />
          <Button href="/courses" variant="outline" className="w-fit shrink-0">{ar ? "عرض كل الدورات" : "View all courses"}<ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></Button>
        </div>
        <div className="mt-11 grid items-stretch gap-5 lg:grid-cols-[1.08fr_.92fr]">
          <CourseMarketPanel locale={locale}/>
          {courses[0]?<Reveal><CourseCard course={courses[0]} locale={locale}/></Reveal>:<EmptyState title={ar ? "لا توجد دورات منشورة حالياً" : "No courses are published right now"} copy={ar ? "تجهّز الأكاديمية عروضها القادمة. يمكنك التعرف على منهجنا والعودة قريباً للمحتوى الجديد." : "The academy is preparing its next offers. Explore our approach and check back soon for new material."} href="/about" action={ar ? "تعرف على الأكاديمية" : "Discover the academy"}/>} 
        </div>
        {courses.length>1&&<div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{courses.slice(1,4).map(course=><Reveal key={course.id}><CourseCard course={course} locale={locale}/></Reveal>)}</div>}
      </section>

      <section className="relative isolate border-y border-violet-200/[.07] bg-[#0A0614] py-20 sm:py-28">
        <div className="absolute inset-0 -z-10 bg-premium-grid opacity-35 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
        <div className="container-pad">
          <SectionHeading eyebrow={ar ? "كيف تبدأ" : "How it works"} title={ar ? "ثلاث خطوات واضحة من الاختيار إلى الوصول." : "Three clear steps from selection to access."} copy={ar ? "تجربة بسيطة تحافظ على وضوح السعر، أمان الدفع، وخصوصية الوصول إلى مجتمع الدورة." : "A straightforward experience that protects pricing clarity, payment safety, and private course access."} align="center" />
          <div className="relative mt-14 grid gap-5 md:grid-cols-3">
            <div className="absolute inset-x-[16%] top-8 hidden h-px bg-gradient-to-r from-transparent via-violet-400/35 to-transparent md:block" aria-hidden="true" />
            {steps.map(([Icon, title, copy], index) => <Reveal key={String(title)} delay={index * .06}><article className="relative h-full rounded-3xl border border-white/[.07] bg-[#0D0918]/95 p-6 sm:p-7"><div className="flex items-center justify-between"><span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-300/15 bg-[#130B28] text-violet-300 shadow-[0_12px_35px_rgba(76,29,149,.2)]"><Icon className="h-6 w-6" aria-hidden="true" /></span><span className="font-mono text-sm text-violet-100/18">0{index + 1}</span></div><h3 className="mt-7 text-lg font-semibold">{String(title)}</h3><p className="mt-3 text-sm leading-7 text-violet-100/43">{String(copy)}</p></article></Reveal>)}
          </div>
        </div>
      </section>

      <section className="container-pad py-20 sm:py-28">
        <SectionHeading eyebrow={ar ? "تعليم قراءة السوق" : "Learn to read the market"} title={ar ? "افهم حركة السوق، لا تلاحقها." : "Understand market movement. Don’t chase it."} copy={ar ? "نستخدم النماذج البصرية لفهم بنية الحركة، مناطق الاهتمام، وعملية اتخاذ القرار. كل الرسوم هنا توضيحية وليست بيانات سوق مباشرة." : "Visual models help explain structure, areas of interest, and the decision process. Every chart shown here is illustrative—not live market data."} />
        <div className="mt-12"><EducationChart locale={locale} /></div>
      </section>

      <section className="border-y border-violet-200/[.07] bg-[#0B0715]/72 py-20 sm:py-28">
        <div className="container-pad">
          <SectionHeading eyebrow={ar ? "لماذا Mr.ME" : "Why Mr.ME"} title={ar ? "تجربة تعليمية تحترم وضوحك ووقتك." : "An academy experience that respects your clarity and time."} copy={ar ? "لا وعود بأرباح ولا مقاييس مصطنعة. نركز على التعليم المنظم، المسؤولية، والوصول الآمن." : "No profit promises or manufactured metrics. The focus stays on structured education, responsibility, and secure access."} align="center" />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{values.map(([Icon, title, copy], index) => <Reveal key={String(title)} delay={(index % 3) * .04}><article className="group h-full rounded-2xl border border-white/[.07] bg-[#0D0918] p-6 transition duration-300 hover:border-violet-300/18 hover:bg-[#100A20]"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/10 bg-violet-500/[.08] text-violet-300 transition group-hover:bg-violet-500/12"><Icon className="h-4.5 w-4.5" aria-hidden="true" /></span><h3 className="mt-5 font-semibold">{String(title)}</h3><p className="mt-2 text-sm leading-7 text-violet-100/42">{String(copy)}</p></article></Reveal>)}</div>
        </div>
      </section>

      <section className="container-pad grid gap-10 py-20 sm:py-24 lg:grid-cols-[.85fr_1fr] lg:items-center lg:gap-14">
        <div><LockKeyhole className="h-7 w-7 text-violet-300" aria-hidden="true" /><SectionHeading eyebrow={ar ? "أسئلة شائعة" : "FAQ"} title={ar ? "وصول واضح ومحمي." : "Clear, protected access."} copy={ar ? "تعرف على تجربة الوصول والدفع والحساب دون تفاصيل تقنية معقدة." : "Understand course access, payment confirmation, and account recovery without unnecessary technical detail."} /><div className="mt-8"><SecurityVisual locale={locale}/></div></div>
        <FAQ items={faq} />
      </section>

      <section className="container-pad pb-20 sm:pb-28">
        <div className="relative isolate overflow-hidden rounded-[2rem] border border-violet-300/16 bg-[linear-gradient(135deg,#140B2A_0%,#211044_56%,#10081F_100%)] px-6 py-14 text-center shadow-[0_30px_100px_rgba(45,18,86,.34)] sm:p-16">
          <div className="absolute inset-0 -z-10 bg-premium-grid opacity-25" aria-hidden="true" />
          <div className="absolute -start-20 -top-28 -z-10 h-72 w-72 rounded-full bg-violet-500/18 blur-[80px]" aria-hidden="true" />
          <DecorativeChart className="absolute inset-x-0 bottom-0 -z-10 h-28 w-full opacity-55" />
          <p className="eyebrow">{ar ? "خطوتك التالية" : "Your next step"}</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-[-.035em] sm:text-5xl">{ar ? "ابدأ خطوتك التالية مع Mr.ME." : "Take your next step with Mr.ME."}</h2>
          <p className="mx-auto mt-5 max-w-xl leading-7 text-violet-100/52">{ar ? "استعرض الدورات المنشورة واختر المسار الذي يناسب مرحلتك عندما تكون مستعداً." : "Explore the published courses and choose the path that fits your current stage when you are ready."}</p>
          <Button href="/courses" className="mt-8 min-h-12 px-7">{ar ? "استعرض الدورات" : "Explore courses"}<ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></Button>
        </div>
      </section>
    </div>
  );
}
