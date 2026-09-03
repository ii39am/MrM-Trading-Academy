"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import type { Locale, User } from "@/lib/types";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar({ locale, initialUser }: { locale: Locale; initialUser: User | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(initialUser);
  const ar = locale === "ar";
  const links = ar
    ? [["الدورات", "/courses"], ["الأكاديمية", "/about"], ["المدونة", "/blog"], ["تواصل معنا", "/contact"]]
    : [["Courses", "/courses"], ["Academy", "/about"], ["Blog", "/blog"], ["Contact", "/contact"]];

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => setUser(initialUser), [initialUser]);

  async function logout() {
    await api.logout();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const actionLinks = user ? (
    <>
      <Button href="/dashboard" variant="ghost">{ar ? "دوراتي" : "My courses"}</Button>
      <Button href="/account/security" variant="ghost"><Shield className="h-4 w-4" />{ar ? "الأمان" : "Security"}</Button>
      {user.role === "ADMIN" && <Button href="/admin" variant="outline">{ar ? "الإدارة" : "Admin"}</Button>}
      <button onClick={logout} aria-label={ar ? "تسجيل الخروج" : "Sign out"} className="flex h-11 w-11 items-center justify-center rounded-xl text-violet-100/50 transition hover:bg-violet-100/[.06] hover:text-white"><LogOut className="h-4 w-4" /></button>
    </>
  ) : (
    <>
      <Button href="/login" variant="ghost">{ar ? "تسجيل الدخول" : "Login"}</Button>
      <Button href="/register" className="shadow-[0_10px_32px_rgba(124,58,237,.3)]">{ar ? "إنشاء حساب" : "Create account"}</Button>
    </>
  );

  return (
    <header className="site-navbar fixed inset-x-0 top-0 z-50 border-b border-violet-200/[.08] bg-[#070511]/80 shadow-[0_10px_45px_rgba(3,2,8,.2)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#070511]/68">
      <nav className="container-pad flex h-20 items-center justify-between gap-5" aria-label={ar ? "التنقل الرئيسي" : "Main navigation"}>
        <BrandLogo />
        <div className="hidden items-center gap-1 lg:flex">
          {links.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={cn("relative rounded-lg px-3.5 py-2 text-sm transition duration-200 after:absolute after:inset-x-3 after:-bottom-[1.1rem] after:h-px after:origin-center after:scale-x-0 after:bg-violet-400 after:transition-transform", pathname === href ? "text-violet-100 after:scale-x-100" : "text-violet-100/52 hover:bg-white/[.035] hover:text-white")}>{label}</Link>)}
        </div>
        <div className="hidden items-center gap-1 lg:flex"><ThemeToggle locale={locale}/><LanguageSwitcher locale={locale} />{actionLinks}</div>
        <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-200/10 bg-white/[.025] text-violet-100/75 transition hover:border-violet-300/20 hover:text-white lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? (ar ? "إغلاق القائمة" : "Close menu") : (ar ? "فتح القائمة" : "Open menu")}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </nav>
      {open && <div id="mobile-navigation" className="site-mobile-menu border-t border-violet-200/[.08] bg-[#090615]/98 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl lg:hidden"><div className="mx-auto max-w-7xl"><div className="mb-4 flex items-center gap-2"><ThemeToggle locale={locale}/><LanguageSwitcher locale={locale} /></div>{links.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={cn("block rounded-xl px-4 py-3.5 text-base transition", pathname === href ? "bg-violet-500/12 text-violet-100" : "text-violet-100/62 hover:bg-white/[.04] hover:text-white")}>{label}</Link>)}<div className="mt-4 grid gap-2 border-t border-violet-200/[.08] pt-4">{actionLinks}</div></div></div>}
    </header>
  );
}
