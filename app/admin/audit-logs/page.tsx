import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata={title:"Audit logs",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function AuditLogs({searchParams}:{searchParams:Promise<{action?:string;entityType?:string;page?:string}>}){
 const actor=await getSessionUser();if(!actor)redirect("/login?next=/admin/audit-logs");if(!isAdmin(actor))redirect("/unauthorized");const query=await searchParams,page=Math.max(1,Number(query.page??1)||1),take=50;
 const where={...(query.action?{action:{contains:query.action,mode:"insensitive" as const}}:{}),...(query.entityType?{entityType:query.entityType}:{})};
 const [logs,total]=await db.$transaction([db.securityAuditLog.findMany({where,select:{id:true,action:true,category:true,entityType:true,entityId:true,targetUserId:true,createdAt:true,actor:{select:{email:true,role:true}}},orderBy:{createdAt:"desc"},skip:(page-1)*take,take}),db.securityAuditLog.count({where})]);
 return <section className="container-pad pt-28 pb-24"><p className="eyebrow">Audit logs</p><h1 className="mt-3 text-3xl font-semibold">Sensitive activity trail</h1><form className="mt-6 flex flex-wrap gap-3"><input name="action" defaultValue={query.action} placeholder="Action" className="input max-w-xs"/><input name="entityType" defaultValue={query.entityType} placeholder="Entity type" className="input max-w-xs"/><button className="rounded-xl bg-violet-600 px-5 py-3">Filter</button></form><p className="mt-4 text-sm text-white/40">{total} immutable-style application events</p><div className="mt-6 overflow-x-auto rounded-2xl border border-white/10"><table className="min-w-full text-sm"><thead><tr>{["Date","Action","Category","Actor","Role","Entity","Target"].map(x=><th key={x} className="px-4 py-3 text-start text-white/45">{x}</th>)}</tr></thead><tbody>{logs.map(log=><tr key={log.id} className="border-t border-white/10"><td className="px-4 py-3">{log.createdAt.toLocaleString()}</td><td className="px-4 py-3">{log.action}</td><td className="px-4 py-3">{log.category??"—"}</td><td className="px-4 py-3">{log.actor?.email??"System"}</td><td className="px-4 py-3">{log.actor?.role??"—"}</td><td className="px-4 py-3">{log.entityType??"—"} {log.entityId?"· "+log.entityId:""}</td><td className="px-4 py-3">{log.targetUserId??"—"}</td></tr>)}</tbody></table></div></section>;
}
