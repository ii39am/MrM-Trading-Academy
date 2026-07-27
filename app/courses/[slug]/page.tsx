import { notFound } from "next/navigation";
import { courseRepository } from "@/lib/course-repository";
import { CourseDetail } from "@/components/course-detail";
import { getLocale,localized } from "@/lib/i18n";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const course=await courseRepository.getBySlug((await params).slug),locale=await getLocale();if(!course)return {};const copy=localized(course,locale);return {title:copy.title,description:copy.shortDescription}}
export default async function CoursePage({params}:{params:Promise<{slug:string}>}){const course=await courseRepository.getBySlug((await params).slug);if(!course)notFound();return <CourseDetail course={course} locale={await getLocale()}/>}
