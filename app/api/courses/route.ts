import { NextResponse } from "next/server";
import { courseRepository } from "@/lib/course-repository";

export async function GET() {
  return NextResponse.json(await courseRepository.list());
}
