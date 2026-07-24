import { notFound } from "next/navigation";
import { courseRepository } from "@/lib/course-repository";
import { CourseDetail } from "@/components/course-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const course = await courseRepository.getBySlug((await params).slug);
  return course ? { title: course.title, description: course.description } : {};
}
export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const course = await courseRepository.getBySlug((await params).slug);
  if (!course) notFound();
  return <div className="pt-0"><CourseDetail course={course}/></div>;
}
