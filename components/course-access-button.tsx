"use client";

import { useState } from "react";
import { ExternalLink, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/types";
import { Button } from "@/components/ui";

const messages = {
  en: {access:"Access Course",preparing:"Preparing secure access...",ready:"Your secure Telegram invite is ready.",expires:"This invite expires shortly.",open:"Open Telegram",unavailable:"Course access is temporarily unavailable. Please try again shortly.",limited:"Too many access requests. Please try again later."},
  ar: {access:"دخول الدورة",preparing:"جارٍ تجهيز رابط الدخول الآمن...",ready:"رابط الدخول الآمن إلى Telegram جاهز.",expires:"تنتهي صلاحية هذا الرابط قريباً.",open:"فتح Telegram",unavailable:"الوصول إلى الدورة غير متاح مؤقتاً. يرجى المحاولة لاحقاً.",limited:"تم طلب روابط دخول عدة مرات. يرجى المحاولة لاحقاً."},
} as const;

function safeInvite(value:unknown){if(typeof value!=="string")return null;try{const url=new URL(value);return url.protocol==="https:"&&url.hostname==="t.me"?url.toString():null}catch{return null}}

export function CourseAccessButton({courseSlug,locale}:{courseSlug:string;locale:Locale}){
 const copy=messages[locale],[loading,setLoading]=useState(false),[inviteUrl,setInviteUrl]=useState<string|null>(null),[message,setMessage]=useState<string|null>(null);
 async function requestAccess(){if(loading)return;setLoading(true);setInviteUrl(null);setMessage(copy.preparing);try{const response=await fetch(`/api/courses/${encodeURIComponent(courseSlug)}/access`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}),body=await response.json().catch(()=>null);if(!response.ok){setMessage(body?.error?.code==="ACCESS_RATE_LIMITED"?copy.limited:copy.unavailable);return}const safe=safeInvite(body?.grant?.inviteUrl);if(!safe){setMessage(copy.unavailable);return}setInviteUrl(safe);setMessage(copy.ready)}catch{setMessage(copy.unavailable)}finally{setLoading(false)}}
 return <div className="flex flex-col items-start gap-2">{inviteUrl?<a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"><ExternalLink className="h-4 w-4" aria-hidden="true"/>{copy.open}</a>:<Button onClick={requestAccess} disabled={loading}><ShieldCheck className="h-4 w-4" aria-hidden="true"/>{loading?copy.preparing:copy.access}</Button>}<div aria-live="polite" className="max-w-sm text-xs leading-5 text-white/50">{message}{inviteUrl&&<span className="block text-amber-200/80">{copy.expires}</span>}</div></div>;
}
