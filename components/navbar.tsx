"use client";
import Link from "next/link";
import { usePathname,useRouter } from "next/navigation";
import { LogOut,Menu,Shield,TrendingUp,X } from "lucide-react";
import { useEffect,useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import type { Locale,User } from "@/lib/types";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Logo(){return <Link href="/" className="group flex items-center gap-2.5 rounded-xl focus-visible:outline-none" aria-label="Mr.ME Trading Academy home"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-600 shadow-[0_8px_25px_rgba(124,58,237,.28)] transition group-hover:bg-violet-500"><TrendingUp className="h-4 w-4"/></span><span dir="ltr" className="whitespace-nowrap font-semibold tracking-tight">Mr.ME <span className="font-medium text-violet-100/40">Academy</span></span></Link>}
export function Navbar({locale}:{locale:Locale}){
 const pathname=usePathname(),router=useRouter(),[open,setOpen]=useState(false),[user,setUser]=useState<User|null>(null),ar=locale==="ar";
 const links=ar?[["الدورات","/courses"],["العروض","/pricing"],["عن الأكاديمية","/about"],["تواصل معنا","/contact"]]:[["Courses","/courses"],["Offers","/pricing"],["About","/about"],["Contact","/contact"]];
 useEffect(()=>{setOpen(false)},[pathname]);
 useEffect(()=>{let active=true;api.me().then(result=>active&&setUser(result.user)).catch(()=>active&&setUser(null));return()=>{active=false}},[pathname]);
 async function logout(){await api.logout();setUser(null);router.push("/");router.refresh()}
 const actionLinks=user?<><Button href="/dashboard" variant="ghost">{ar?"مشترياتي":"My purchases"}</Button><Button href="/account/security" variant="ghost"><Shield className="h-4 w-4"/>{ar?"الأمان":"Security"}</Button>{user.role==="ADMIN"&&<Button href="/admin" variant="outline">{ar?"الإدارة":"Admin"}</Button>}<button onClick={logout} aria-label={ar?"تسجيل الخروج":"Sign out"} className="flex h-11 w-11 items-center justify-center rounded-xl text-violet-100/50 transition hover:bg-violet-100/[.06] hover:text-white"><LogOut className="h-4 w-4"/></button></>:<><Button href="/login" variant="ghost">{ar?"تسجيل الدخول":"Sign in"}</Button><Button href="/register">{ar?"إنشاء حساب":"Create account"}</Button></>;
 return <header className="fixed inset-x-0 top-0 z-50 border-b border-violet-200/[.09] bg-[#09070f]/88 backdrop-blur-xl"><nav className="container-pad flex h-[4.5rem] items-center justify-between" aria-label={ar?"التنقل الرئيسي":"Main navigation"}><Logo/><div className="hidden items-center gap-1 lg:flex">{links.map(([label,href])=><Link key={href} href={href} aria-current={pathname===href?"page":undefined} className={cn("rounded-lg px-3.5 py-2 text-sm transition",pathname===href?"bg-violet-500/10 text-violet-200":"text-violet-100/50 hover:bg-white/[.04] hover:text-white")}>{label}</Link>)}</div><div className="hidden items-center gap-1 lg:flex"><LanguageSwitcher locale={locale}/>{actionLinks}</div><button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-200/10 text-violet-100/70 lg:hidden" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open?(ar?"إغلاق القائمة":"Close menu"):(ar?"فتح القائمة":"Open menu")}>{open?<X className="h-5 w-5"/>:<Menu className="h-5 w-5"/>}</button></nav>{open&&<div id="mobile-navigation" className="border-t border-violet-200/10 bg-[#0d0915] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 lg:hidden"><div className="mx-auto max-w-7xl"><div className="mb-3"><LanguageSwitcher locale={locale}/></div>{links.map(([label,href])=><Link key={href} href={href} className={cn("block rounded-xl px-4 py-3.5 text-base",pathname===href?"bg-violet-500/10 text-violet-200":"text-violet-100/65")}>{label}</Link>)}<div className="mt-4 grid gap-2 border-t border-violet-200/10 pt-4">{actionLinks}</div></div></div>}</header>;
}
