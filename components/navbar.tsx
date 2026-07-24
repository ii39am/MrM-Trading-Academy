"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, TrendingUp } from "lucide-react";
import { useEffect,useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

const links = [["Courses","/courses"],["Pricing","/pricing"],["About","/about"],["Contact","/contact"]];

export function Logo() {
  return <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/30"><TrendingUp className="h-4 w-4"/></span><span>Mr.M <span className="text-white/45">Academy</span></span></Link>;
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user,setUser]=useState<User|null>(null);
  useEffect(()=>{let active=true;api.me().then(result=>{if(active)setUser(result.user)}).catch(()=>{if(active)setUser(null)});return()=>{active=false}},[pathname]);
  if (pathname.startsWith("/learn/")) return null;
  return <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[.07] bg-[#0b0b0f]/80 backdrop-blur-xl">
    <nav className="container-pad flex h-16 items-center justify-between">
      <Logo/>
      <div className="hidden items-center gap-7 md:flex">{links.map(([label,href]) => <Link key={href} href={href} className={cn("text-sm transition hover:text-white", pathname === href ? "text-white" : "text-white/50")}>{label}</Link>)}</div>
      <div className="hidden items-center gap-2 md:flex">{user?<Button href="/dashboard" variant="ghost">My profile</Button>:<Button href="/login" variant="ghost">Sign in</Button>}<Button href={user?"/dashboard":"/courses"}>{user?"Dashboard":"Start learning"}</Button></div>
      <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button>
    </nav>
    {open && <div className="border-t border-white/10 bg-ink p-5 md:hidden">{links.map(([label,href]) => <Link onClick={()=>setOpen(false)} key={href} href={href} className="block border-b border-white/[.06] py-4 text-sm">{label}</Link>)}<div className="mt-5 grid grid-cols-2 gap-3">{user?<><Button href="/dashboard" variant="secondary">My profile</Button><Button href="/dashboard">Dashboard</Button></>:<><Button href="/login" variant="secondary">Sign in</Button><Button href="/register">Join now</Button></>}</div></div>}
  </header>;
}
