import { NextResponse } from "next/server";
import { courseRepository } from "@/lib/course-repository";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await courseRepository.getBySlug(slug);
  return course ? NextResponse.json(course) : NextResponse.json({ error: "Course not found" }, { status: 404 });
}
