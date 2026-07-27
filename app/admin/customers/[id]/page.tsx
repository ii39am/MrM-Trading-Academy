import { notFound,redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata={title:"Customer details",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function Customer({params}:{params:Promise<{id:string}>}){
 const actor=await getSessionUser();if(!actor)redirect("/login?next=/admin/customers");if(!isAdmin(actor))redirect("/unauthorized");const id=(await params).id;
 const user=await db.user.findUnique({where:{id},select:{id:true,name:true,email:true,emailVerifiedAt:true,role:true,status:true,preferredLanguage:true,createdAt:true,lastLoginAt:true,deletionRequestedAt:true,purchases:{select:{id:true,status:true,amountCents:true,currency:true,createdAt:true,paidAt:true},orderBy:{createdAt:"desc"},take:50},sessions:{where:{revokedAt:null,expiresAt:{gt:new Date()}},select:{publicId:true,userAgentSummary:true,maskedIp:true,lastSeenAt:true},orderBy:{lastSeenAt:"desc"}},loginEvents:{select:{id:true,eventType:true,success:true,userAgentSummary:true,ipDisplayMasked:true,createdAt:true},orderBy:{createdAt:"desc"},take:30},auditLogs:{select:{id:true,action:true,category:true,createdAt:true},orderBy:{createdAt:"desc"},take:30}}});if(!user)notFound();
 return <section className="container-pad pt-28 pb-24"><p className="eyebrow">Customer</p><h1 className="mt-3 text-3xl font-semibold">{user.name}</h1><p className="mt-2 text-white/45">{user.email} · {user.status} · {user.role}</p><div className="mt-8 grid gap-6 lg:grid-cols-2"><Panel title="Purchases">{user.purchases.map(x=><Row key={x.id} left={`${x.id} · ${x.status}`} right={`${(x.amountCents/100).toFixed(2)} ${x.currency}`}/>)}</Panel><Panel title="Active sessions">{user.sessions.map(x=><Row key={x.publicId} left={x.userAgentSummary??"Unknown device"} right={`${x.maskedIp??""} · ${x.lastSeenAt.toLocaleString()}`}/>)}</Panel><Panel title="Recent login activity">{user.loginEvents.map(x=><Row key={x.id} left={`${x.eventType} · ${x.userAgentSummary??"Unknown"}`} right={x.createdAt.toLocaleString()}/>)}</Panel><Panel title="Security audit events">{user.auditLogs.map(x=><Row key={x.id} left={`${x.action} · ${x.category??""}`} right={x.createdAt.toLocaleString()}/>)}</Panel></div></section>;
}
function Panel({title,children}:{title:string;children:React.ReactNode}){return <div className="rounded-2xl border border-white/10 p-6"><h2 className="font-semibold">{title}</h2><div className="mt-4 space-y-3">{children}</div></div>}
function Row({left,right}:{left:string;right:string}){return <div className="flex justify-between gap-4 border-b border-white/[.07] pb-2 text-sm"><span>{left}</span><span className="text-white/45">{right}</span></div>}
