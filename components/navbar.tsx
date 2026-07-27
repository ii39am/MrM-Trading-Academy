"use client";
import Link from "next/link";
import { usePathname,useRouter } from "next/navigation";
import { Menu,X,TrendingUp,LogOut } from "lucide-react";
import { useEffect,useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import type { Locale,User } from "@/lib/types";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Logo(){return <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-600/25"><TrendingUp className="h-4 w-4"/></span><span>Mr.ME <span className="text-white/45">Academy</span></span></Link>}
export function Navbar({locale}:{locale:Locale}){
 const pathname=usePathname(),router=useRouter(),[open,setOpen]=useState(false),[user,setUser]=useState<User|null>(null),ar=locale==="ar";
 const links=ar?[["الدورات","/courses"],["العروض","/pricing"],["عن الأكاديمية","/about"],["تواصل معنا","/contact"]]:[["Courses","/courses"],["Offers","/pricing"],["About","/about"],["Contact","/contact"]];
 useEffect(()=>{let active=true;api.me().then(result=>active&&setUser(result.user)).catch(()=>active&&setUser(null));return()=>{active=false}},[pathname]);
 async function logout(){await api.logout();setUser(null);router.push("/");router.refresh()}
 return <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[.07] bg-[#080a10]/85 backdrop-blur-2xl"><nav className="container-pad flex h-16 items-center justify-between"><Logo/><div className="hidden items-center gap-7 md:flex">{links.map(([label,href])=><Link key={href} href={href} className={cn("text-sm transition hover:text-white",pathname===href?"text-white":"text-white/55")}>{label}</Link>)}</div><div className="hidden items-center gap-2 md:flex"><LanguageSwitcher locale={locale}/>{user?<><Button href="/dashboard" variant="ghost">{ar?"مشترياتي":"My purchases"}</Button><button onClick={logout} aria-label={ar?"تسجيل الخروج":"Sign out"} className="rounded-xl p-3 text-white/50 hover:text-white"><LogOut className="h-4 w-4"/></button></>:<><Button href="/login" variant="ghost">{ar?"تسجيل الدخول":"Sign in"}</Button><Button href="/courses">{ar?"استعرض العروض":"View offers"}</Button></>}</div><button className="md:hidden" onClick={()=>setOpen(!open)} aria-label={ar?"فتح القائمة":"Toggle menu"}>{open?<X/>:<Menu/>}</button></nav>{open&&<div className="border-t border-white/10 bg-[#080a10] p-5 md:hidden"><LanguageSwitcher locale={locale}/>{links.map(([label,href])=><Link onClick={()=>setOpen(false)} key={href} href={href} className="block border-b border-white/[.06] py-4 text-sm">{label}</Link>)}<div className="mt-5">{user?<Button href="/dashboard" className="w-full">{ar?"مشترياتي":"My purchases"}</Button>:<Button href="/login" className="w-full">{ar?"تسجيل الدخول":"Sign in"}</Button>}</div></div>}</header>;
}
