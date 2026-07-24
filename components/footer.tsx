"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/navbar";
import { Instagram, Youtube, Send } from "lucide-react";

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/learn/")) return null;
  return <footer className="border-t border-white/[.08] bg-[#09090c]">
    <div className="container-pad grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
      <div><Logo/><p className="mt-5 max-w-xs text-sm leading-6 text-white/40">Professional trading education built for clarity, discipline, and lasting skill.</p><div className="mt-6 flex gap-3">{[Youtube,Instagram,Send].map((Icon,i)=><a key={i} href="#" aria-label="Social channel" className="rounded-lg border border-white/10 p-2 text-white/45 transition hover:text-white"><Icon className="h-4 w-4"/></a>)}</div></div>
      <FooterGroup title="Academy" links={[["Courses","/courses"],["Pricing","/pricing"],["About","/about"]]}/>
      <FooterGroup title="Support" links={[["Contact","/contact"],["FAQ","/contact#faq"],["Sign in","/login"]]}/>
      <FooterGroup title="Legal" links={[["Privacy","/privacy"],["Terms","/terms"],["Risk disclosure","/risk"]]}/>
    </div>
    <div className="container-pad flex flex-col gap-2 border-t border-white/[.06] py-6 text-xs text-white/30 sm:flex-row sm:justify-between"><p>© {new Date().getFullYear()} Mr.M Trading Academy.</p><p>Trading involves risk. Education is not financial advice.</p></div>
  </footer>;
}
function FooterGroup({title,links}:{title:string;links:string[][]}) { return <div><h3 className="text-sm font-medium">{title}</h3><div className="mt-4 space-y-3">{links.map(([label,href])=><Link key={href} href={href} className="block text-sm text-white/40 transition hover:text-white">{label}</Link>)}</div></div>}
