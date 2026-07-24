import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata={title:"Academy administration",robots:{index:false,follow:false}};
const pageSize=20;
export default async function AdminDashboard({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}){
 const user=await getSessionUser();if(!user)redirect("/login?next=/admin");if(!isAdmin(user))redirect("/unauthorized");
 const params=await searchParams,q=(params.q??"").trim().slice(0,100),page=Math.max(1,Number.parseInt(params.page??"1",10)||1),skip=(page-1)*pageSize;
 const userWhere=q?{OR:[{name:{contains:q,mode:"insensitive" as const}},{email:{contains:q,mode:"insensitive" as const}}]}:{};
 const [users,userCount,courses,purchases,enrollments,contacts,audits,counts]=await Promise.all([
  db.user.findMany({where:userWhere,select:{id:true,name:true,email:true,role:true,status:true,emailVerifiedAt:true,createdAt:true},orderBy:{createdAt:"desc"},skip,take:pageSize}),
  db.user.count({where:userWhere}),
  db.course.findMany({select:{id:true,title:true,status:true,instructor:true,instructorUser:{select:{email:true}},_count:{select:{modules:true,enrollments:true}}},orderBy:{updatedAt:"desc"},take:pageSize}),
  db.purchase.findMany({select:{id:true,status:true,amountCents:true,currency:true,provider:true,createdAt:true,user:{select:{email:true}},_count:{select:{items:true}}},orderBy:{createdAt:"desc"},take:pageSize}),
  db.enrollment.findMany({select:{id:true,createdAt:true,user:{select:{email:true}},course:{select:{title:true}}},orderBy:{createdAt:"desc"},take:pageSize}),
  db.contactSubmission.findMany({select:{id:true,name:true,email:true,topic:true,createdAt:true},orderBy:{createdAt:"desc"},take:pageSize}),
  db.securityAuditLog.findMany({select:{id:true,action:true,createdAt:true,actor:{select:{email:true}},user:{select:{email:true}}},orderBy:{createdAt:"desc"},take:pageSize}),
  Promise.all([db.user.count(),db.course.count(),db.purchase.count(),db.enrollment.count(),db.contactSubmission.count()])
 ]);
 const cards=[["Users",counts[0]],["Courses",counts[1]],["Purchases",counts[2]],["Enrollments",counts[3]],["Contacts",counts[4]]];
 return <section className="container-pad pt-28 pb-24"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Administration</p><h1 className="mt-3 text-3xl font-semibold">Academy operations</h1><p className="mt-2 text-sm text-white/40">Live database records. Sensitive credentials and verification hashes are never selected.</p></div><Link href="/admin/videos" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold">Manage videos</Link></div>
 <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{cards.map(([label,value])=><div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><p className="text-xs text-white/40">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div>
 <form className="mt-10 flex max-w-lg gap-3"><input name="q" defaultValue={q} className="input" placeholder="Search users by name or email"/><button className="rounded-xl bg-white/10 px-5 text-sm font-medium">Search</button></form>
 <AdminTable title="Users" headers={["Name","Email","Role","Status","Verified"]} rows={users.map(item=>[item.name,item.email,item.role,item.status,item.emailVerifiedAt?"Yes":"No"])} empty="No users match this search."/>
 {userCount>pageSize&&<div className="mt-4 flex gap-3 text-sm">{page>1&&<Link href={`/admin?q=${encodeURIComponent(q)}&page=${page-1}`}>Previous</Link>}{skip+users.length<userCount&&<Link href={`/admin?q=${encodeURIComponent(q)}&page=${page+1}`}>Next</Link>}</div>}
 <AdminTable title="Courses and modules" headers={["Course","Status","Instructor","Modules","Enrollments"]} rows={courses.map(item=>[item.title,item.status,item.instructorUser?.email??item.instructor,String(item._count.modules),String(item._count.enrollments)])} empty="No courses."/>
 <AdminTable title="Purchases and payment status" headers={["User","Status","Provider","Amount","Items"]} rows={purchases.map(item=>[item.user.email,item.status,item.provider,`${item.currency} ${(item.amountCents/100).toFixed(2)}`,String(item._count.items)])} empty="No purchases."/>
 <AdminTable title="Enrollments" headers={["User","Course","Created"]} rows={enrollments.map(item=>[item.user.email,item.course.title,item.createdAt.toLocaleDateString()])} empty="No enrollments."/>
 <AdminTable title="Contact submissions" headers={["Name","Email","Topic","Created"]} rows={contacts.map(item=>[item.name,item.email,item.topic,item.createdAt.toLocaleDateString()])} empty="No contact submissions."/>
 <AdminTable title="Security audit log" headers={["Action","Actor","Subject","Created"]} rows={audits.map(item=>[item.action,item.actor?.email??"System",item.user?.email??"—",item.createdAt.toLocaleString()])} empty="No audit events."/>
 </section>
}
function AdminTable({title,headers,rows,empty}:{title:string;headers:string[];rows:string[][];empty:string}){return <div className="mt-10"><h2 className="mb-4 text-xl font-semibold">{title}</h2><div className="overflow-x-auto rounded-2xl border border-white/10">{rows.length?<table className="min-w-full text-left text-sm"><thead className="bg-white/[.05] text-white/50"><tr>{headers.map(header=><th key={header} className="px-4 py-3 font-medium">{header}</th>)}</tr></thead><tbody className="divide-y divide-white/[.07]">{rows.map((row,index)=><tr key={index}>{row.map((cell,cellIndex)=><td key={cellIndex} className="px-4 py-3 text-white/70">{cell}</td>)}</tr>)}</tbody></table>:<p className="p-8 text-center text-sm text-white/40">{empty}</p>}</div></div>}
