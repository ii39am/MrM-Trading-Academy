"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import type { Locale } from "@/lib/types";

type Session={publicId:string;createdAt:string;lastSeenAt:string;expiresAt:string;userAgentSummary:string|null;deviceType:string|null;browser:string|null;operatingSystem:string|null;maskedIp:string|null;isCurrentSession:boolean};

export function SecuritySessions({initialSessions,locale}:{initialSessions:Session[];locale:Locale}){
 const router=useRouter(),ar=locale==="ar",[sessions,setSessions]=useState(initialSessions),[busy,setBusy]=useState("");
 async function action(path:string,method:"POST"|"DELETE"){
  if(busy)return;setBusy(path);const response=await fetch(path,{method,headers:{"Content-Type":"application/json"}});
  if(response.ok){if(path.endsWith("revoke-all"))router.replace("/login");else router.refresh();setSessions(current=>path.includes("revoke-others")?current.filter(x=>x.isCurrentSession):current)}
  setBusy("");
 }
 return <div className="space-y-4">{sessions.map(session=><article key={session.publicId} className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-medium">{session.userAgentSummary??(ar?"جهاز غير معروف":"Unknown device")}{session.isCurrentSession&&<span className="ms-2 rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">{ar?"الجلسة الحالية":"Current session"}</span>}</p><p className="mt-2 text-xs text-white/45">{ar?"آخر نشاط":"Last active"}: {new Intl.DateTimeFormat(ar?"ar-IQ":"en-US",{dateStyle:"medium",timeStyle:"short"}).format(new Date(session.lastSeenAt))}{session.maskedIp?` · ${session.maskedIp}`:""}</p></div><button disabled={Boolean(busy)} onClick={()=>action(`/api/account/sessions/${session.publicId}`,"DELETE")} className="text-sm text-red-300 hover:text-red-200">{ar?(session.isCurrentSession?"تسجيل الخروج من هذا الجهاز":"إلغاء هذه الجلسة"):(session.isCurrentSession?"Log out from this device":"Revoke session")}</button></div></article>)}{!sessions.length&&<p className="rounded-2xl border border-white/10 p-8 text-center text-white/45">{ar?"لا توجد جلسات نشطة.":"No active sessions."}</p>}<div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={()=>action("/api/account/sessions/revoke-others","POST")}>{ar?"تسجيل الخروج من الأجهزة الأخرى":"Log out from other devices"}</Button><Button type="button" disabled={Boolean(busy)} onClick={()=>action("/api/account/sessions/revoke-all","POST")}>{ar?"تسجيل الخروج من جميع الأجهزة":"Log out from all devices"}</Button></div></div>;
}
