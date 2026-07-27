import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLocale } from "@/lib/i18n";
import { SecuritySessions } from "@/components/security-sessions";

export const metadata={title:"Account security",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";

export default async function AccountSecurity(){
 const context=await getSessionContext();if(!context)redirect("/login?next=/account/security");
 const locale=await getLocale(),ar=locale==="ar";
 const [sessions,events]=await Promise.all([
  db.session.findMany({where:{userId:context.user.id,revokedAt:null,expiresAt:{gt:new Date()}},select:{id:true,publicId:true,createdAt:true,lastSeenAt:true,expiresAt:true,userAgentSummary:true,deviceType:true,browser:true,operatingSystem:true,maskedIp:true},orderBy:{lastSeenAt:"desc"}}),
  db.loginEvent.findMany({where:{userId:context.user.id},select:{id:true,eventType:true,success:true,createdAt:true,userAgentSummary:true,ipDisplayMasked:true,failureReasonCode:true},orderBy:{createdAt:"desc"},take:30})
 ]);
 return <section className="container-pad pt-28 pb-24"><p className="eyebrow">{ar?"أمان الحساب":"Account security"}</p><h1 className="mt-3 text-3xl font-semibold">{ar?"الأجهزة ونشاط تسجيل الدخول":"Devices and sign-in activity"}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">{ar?"راجع الجلسات الحديثة. إذا لم تتعرف على جهاز، ألغِ الجلسة وغيّر كلمة المرور. معلومات الجهاز تقريبية ولا تُستخدم لإثبات الهوية.":"Review recent sessions. If you do not recognize a device, revoke it and change your password. Device information is approximate and is never used as proof of identity."}</p><div className="mt-10 grid gap-10 lg:grid-cols-2"><div><h2 className="mb-4 text-xl font-semibold">{ar?"الجلسات النشطة":"Active sessions"}</h2><SecuritySessions locale={locale} initialSessions={sessions.map(({id,...session})=>({...session,createdAt:session.createdAt.toISOString(),lastSeenAt:session.lastSeenAt.toISOString(),expiresAt:session.expiresAt.toISOString(),isCurrentSession:id===context.sessionId}))}/></div><div><h2 className="mb-4 text-xl font-semibold">{ar?"سجل تسجيل الدخول":"Login history"}</h2><div className="space-y-3">{events.map(event=><article key={event.id} className="rounded-2xl border border-white/10 p-4"><div className="flex justify-between gap-3"><p className={event.success?"text-emerald-300":"text-amber-300"}>{event.success?(ar?"نشاط ناجح":"Successful activity"):(ar?"محاولة غير ناجحة":"Unsuccessful attempt")}</p><time className="text-xs text-white/35">{new Intl.DateTimeFormat(ar?"ar-IQ":"en-US",{dateStyle:"medium",timeStyle:"short"}).format(event.createdAt)}</time></div><p className="mt-2 text-sm text-white/55">{event.userAgentSummary??(ar?"جهاز غير معروف":"Unknown device")}{event.ipDisplayMasked?` · ${event.ipDisplayMasked}`:""}</p></article>)}{!events.length&&<p className="rounded-2xl border border-white/10 p-8 text-center text-white/45">{ar?"لا يوجد نشاط مسجل بعد.":"No recorded activity yet."}</p>}</div></div></div></section>;
}
