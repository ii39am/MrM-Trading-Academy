import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { courseRepository } from "@/lib/course-repository";
import { DashboardClient } from "@/components/dashboard-client";
import { db } from "@/lib/db";
export const metadata={robots:{index:false,follow:false}};
export default async function Dashboard(){const user=await getSessionUser();if(!user)redirect("/login");const owned=await db.enrollment.findMany({where:{userId:user.id},select:{course:{select:{slug:true}}}});const courses=(await Promise.all(owned.map(x=>courseRepository.getProtectedBySlug(x.course.slug)))).filter(x=>x!==null);return <DashboardClient user={user} courses={courses}/>}
