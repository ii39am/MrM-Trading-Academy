import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { canAccessVideoAdministration } from "@/lib/admin";
import { db } from "@/lib/db";
import { AdminVideoPanel } from "@/components/admin-video-panel";
export const metadata={title:"Video administration",robots:{index:false,follow:false}};
export default async function AdminVideos(){const user=await getSessionUser();if(!user)redirect("/login?next=/admin/videos");if(!canAccessVideoAdministration(user))redirect("/unauthorized");const lessons=await db.lesson.findMany({where:user.role==="ADMIN"?{}:{module:{course:{instructorId:user.id}}},include:{video:true,module:{include:{course:{select:{title:true}}}}},orderBy:[{module:{position:"asc"}},{position:"asc"}]});return <section className="container-pad pt-28 pb-24"><p className="eyebrow">Administration</p><h1 className="mt-3 text-3xl font-semibold">Lesson videos</h1><p className="mt-2 text-sm text-white/40">Direct, resumable uploads to Cloudflare Stream. Videos remain unpublished until processing is ready.</p><div className="mt-10 grid gap-5 lg:grid-cols-2">{lessons.map(lesson=><AdminVideoPanel key={lesson.id} lessonId={lesson.id} title={`${lesson.module.course.title} · ${lesson.title}`} initialState={lesson.video?.state??"EMPTY"}/>)}</div></section>}
