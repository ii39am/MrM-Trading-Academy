import { notFound } from "next/navigation";
import { courseRepository } from "@/lib/course-repository";
import { VideoPlayer } from "@/components/video-player";
import { getSessionUser } from "@/lib/auth";
import { requireEnrollment } from "@/lib/authorization";
import { redirect } from "next/navigation";
export const metadata={robots:{index:false,follow:false}};
export default async function Learn({params}:{params:Promise<{slug:string}>}){const slug=(await params).slug;const user=await getSessionUser();if(!user)redirect(`/login?next=/learn/${encodeURIComponent(slug)}`);if(!await requireEnrollment(user.id,slug))notFound();const c=await courseRepository.getProtectedBySlug(slug);if(!c)notFound();return <VideoPlayer course={c}/>}
