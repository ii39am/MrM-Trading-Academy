"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Award,BookOpen,ChevronRight,LogOut,Settings,UserRound } from "lucide-react";
import type { Course,User } from "@/lib/types";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/ui";
export function DashboardClient({user,courses}:{user:User;courses:Course[]}){
 const router=useRouter(),progress=courses.map(()=>0),[section,setSection]=useState<"learning"|"certificates"|"profile"|"settings">("learning");
 async function logout(){await api.logout();router.push("/");router.refresh()}
 const navigation=[{id:"learning" as const,icon:BookOpen,label:"My learning"},{id:"certificates" as const,icon:Award,label:"Certificates"},{id:"profile" as const,icon:UserRound,label:"Profile"},{id:"settings" as const,icon:Settings,label:"Settings"}];
 return <div className="container-pad grid gap-8 pt-28 pb-24 lg:grid-cols-[220px_1fr]">
  <aside className="h-fit rounded-2xl border border-white/[.08] bg-white/[.025] p-3">
   <div className="flex items-center gap-3 border-b border-white/[.07] p-3 pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold">{user.name[0]}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{user.name}</p><p className="truncate text-xs text-white/30">{user.email}</p></div></div>
   <nav className="mt-3 space-y-1">{navigation.map(({id,icon:Icon,label})=><button type="button" onClick={()=>setSection(id)} key={id} aria-current={section===id?"page":undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm ${section===id?"bg-blue-500/10 text-blue-300":"text-white/40 hover:bg-white/5 hover:text-white"}`}><Icon className="h-4 w-4"/>{label}</button>)}{user.role==="ADMIN"&&<Link href="/admin" className="flex rounded-xl px-3 py-3 text-sm text-blue-300">Academy administration</Link>}<button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/40 hover:bg-red-500/10 hover:text-red-300"><LogOut className="h-4 w-4"/>Sign out</button></nav>
  </aside>
  <div><p className="eyebrow">Learning dashboard</p><h1 className="mt-3 text-3xl font-semibold">{section==="learning"?`Welcome back, ${user.name.split(" ")[0]}.`:navigation.find(item=>item.id===section)?.label}</h1><p className="mt-2 text-sm text-white/40">{section==="learning"?"Keep the momentum. Your next lesson is ready.":section==="certificates"?"Your earned course credentials.":section==="profile"?"Your verified academy identity.":"Manage security and account access."}</p>
   {section==="learning"&&<>
   <div className="mt-10 grid gap-4 sm:grid-cols-3">{[["Courses in progress",String(courses.length)],["Lessons completed","0"],["Certificates","0"]].map(([label,value])=><div key={label} className="rounded-2xl border border-white/[.08] bg-white/[.025] p-5"><p className="text-xs text-white/35">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div>
   <h2 className="mt-12 text-xl font-semibold">Continue learning</h2>{courses.length?<div className="mt-5 space-y-4">{courses.map((course,index)=><Link href={`/learn/${course.slug}`} key={course.id} className="group flex gap-5 rounded-2xl border border-white/[.08] bg-white/[.025] p-5"><div className="flex-1"><div className="flex justify-between"><h3 className="font-medium">{course.title}</h3><ChevronRight className="h-4 w-4 text-white/20"/></div><div className="mt-4 h-1.5 rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-blue-500" style={{width:`${progress[index]}%`}}/></div></div></Link>)}</div>:<div className="mt-5"><EmptyState title="Your library is empty" copy="Enroll in a course to begin your learning journey."/></div>}
   </>}
   {section==="certificates"&&<div className="mt-10"><EmptyState title="No certificates yet" copy="Complete an enrolled course to earn your first certificate."/></div>}
   {section==="profile"&&<div className="mt-10 max-w-2xl rounded-2xl border border-white/[.08] bg-white/[.025] p-6"><dl className="grid gap-6 sm:grid-cols-2"><div><dt className="text-xs text-white/35">Full name</dt><dd className="mt-2 font-medium">{user.name}</dd></div><div><dt className="text-xs text-white/35">Email</dt><dd className="mt-2 font-medium">{user.email}</dd></div><div><dt className="text-xs text-white/35">Email status</dt><dd className="mt-2 text-emerald-300">{user.emailVerified?"Verified":"Not verified"}</dd></div><div><dt className="text-xs text-white/35">Account role</dt><dd className="mt-2 capitalize">{user.role.toLowerCase()}</dd></div></dl></div>}
   {section==="settings"&&<div className="mt-10 max-w-2xl space-y-4"><div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-6"><h2 className="font-semibold">Password and recovery</h2><p className="mt-2 text-sm text-white/40">Use a recovery code to replace a forgotten password and revoke existing sessions.</p><Link href="/forgot-password" className="mt-4 inline-flex text-sm font-medium text-blue-400 hover:text-blue-300">Open account recovery</Link></div><div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-6"><h2 className="font-semibold">Need help?</h2><p className="mt-2 text-sm text-white/40">Contact support for phone-number changes or account assistance.</p><Link href="/contact" className="mt-4 inline-flex text-sm font-medium text-blue-400 hover:text-blue-300">Contact support</Link></div></div>}
  </div>
 </div>;
}
