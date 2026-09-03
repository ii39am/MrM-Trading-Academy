import type { MetadataRoute } from "next";
import { courseRepository } from "@/lib/course-repository";
import { appUrl } from "@/lib/app-url";
export const dynamic = "force-dynamic";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const routes=["/","/courses","/pricing","/about","/contact"].map(path=>({url:appUrl(path).toString(),lastModified:new Date(),changeFrequency:"weekly" as const,priority:path==="/"?1:.7}));
 const courses=(await courseRepository.list()).map(c=>({url:appUrl(`/courses/${encodeURIComponent(c.slug)}`).toString(),lastModified:new Date(),changeFrequency:"monthly" as const,priority:.8}));
 return [...routes,...courses];
}
