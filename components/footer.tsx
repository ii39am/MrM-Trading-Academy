import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { DecorativeChart } from "@/components/trading-visuals";
import type { Locale } from "@/lib/types";

export function Footer({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  return (
    <footer className="relative isolate overflow-hidden border-t border-violet-200/[.08] bg-[#06040D]">
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(circle_at_20%_0%,rgba(124,58,237,.12),transparent_42%)]" aria-hidden="true" />
      <DecorativeChart className="absolute inset-x-0 bottom-10 -z-10 h-32 w-full opacity-35" />
      <div className="container-pad grid gap-10 py-14 sm:py-16 lg:grid-cols-[1.5fr_.7fr_.7fr_.8fr]">
        <div>
          <BrandLogo className="w-fit" placement="footer" />
          <p className="mt-5 max-w-sm text-sm leading-7 text-violet-100/42">{ar ? "تعليم تداول منظم يساعدك على فهم السوق بوضوح، مع تجربة شراء آمنة ووصول محمي إلى مجتمع التعلم الخاص." : "Structured trading education for clearer market understanding, backed by secure checkout and protected access to the private learning community."}</p>
          <p className="mt-5 max-w-sm text-xs leading-6 text-violet-100/28">{ar ? "المحتوى تعليمي ولا يمثل نصيحة أو ضماناً لنتائج مالية." : "Content is educational and does not constitute financial advice or guarantee results."}</p>
        </div>
        <Group title={ar ? "استكشف" : "Explore"} links={ar ? [["الدورات", "/courses"], ["العروض", "/pricing"], ["المدونة", "/blog"]] : [["Courses", "/courses"], ["Offers", "/pricing"], ["Blog", "/blog"]]} />
        <Group title={ar ? "الأكاديمية" : "Academy"} links={ar ? [["من نحن", "/about"], ["تواصل معنا", "/contact"], ["حسابي", "/dashboard"]] : [["About", "/about"], ["Contact", "/contact"], ["My account", "/dashboard"]]} />
        <Group title={ar ? "الدعم والقانون" : "Support & legal"} links={ar ? [["الخصوصية", "/privacy"], ["الشروط", "/terms"], ["إخلاء مسؤولية المخاطر", "/risk"]] : [["Privacy", "/privacy"], ["Terms", "/terms"], ["Risk disclosure", "/risk"]]} />
      </div>
      <div className="container-pad flex flex-col gap-3 border-t border-violet-200/[.07] py-6 text-xs leading-5 text-violet-100/28 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} <span dir="ltr">Mr.ME Trading Academy</span>.</p>
        <p>{ar ? "التداول ينطوي على مخاطر. تعلّم بمسؤولية واتخذ قراراتك باستقلالية." : "Trading involves risk. Learn responsibly and make independent decisions."}</p>
      </div>
    </footer>
  );
}

function Group({ title, links }: { title: string; links: string[][] }) {
  return <div><h2 className="text-sm font-semibold text-violet-50">{title}</h2><div className="mt-5 space-y-3.5">{links.map(([label, href]) => <Link key={href} href={href} className="block w-fit text-sm text-violet-100/38 transition hover:translate-x-0.5 hover:text-violet-200 rtl:hover:-translate-x-0.5">{label}</Link>)}</div></div>;
}
