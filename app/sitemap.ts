import type { MetadataRoute } from "next";
import { courseRepository } from "@/lib/course-repository";
export const dynamic = "force-dynamic";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base=process.env.APP_URL??process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000";
 const routes=["","/courses","/pricing","/about","/contact"].map(url=>({url:`${base}${url}`,lastModified:new Date(),changeFrequency:"weekly" as const,priority:url===""?1:.7}));
 const courses=(await courseRepository.list()).map(c=>({url:`${base}/courses/${c.slug}`,lastModified:new Date(),changeFrequency:"monthly" as const,priority:.8}));
 return [...routes,...courses];
}
