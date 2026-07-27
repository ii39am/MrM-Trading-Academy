"use client";
import { Languages } from "lucide-react";
import type { Locale } from "@/lib/types";

export function LanguageSwitcher({locale}:{locale:Locale}){
 function change(){
  const next=locale==="en"?"ar":"en";
  document.cookie=`mrm_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  location.reload();
 }
 return <button type="button" onClick={change} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-white/70 hover:border-blue-400/40 hover:text-white" aria-label={locale==="en"?"Switch to Arabic":"التبديل إلى الإنجليزية"}><Languages className="h-4 w-4"/>{locale==="en"?"العربية":"English"}</button>;
}
