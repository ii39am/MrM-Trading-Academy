import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";

const db = new PrismaClient();
const courses = JSON.parse(await readFile(new URL("../data/courses.json", import.meta.url), "utf8"));

for (const item of courses) {
  await db.course.upsert({
    where: { id: item.id },
    update: {},
    create: {
      id: item.id,
      slug: item.slug,
      title: item.title,
      eyebrow: item.eyebrow,
      description: item.description,
      longDescription: item.longDescription,
      instructor: item.instructor,
      difficulty: item.difficulty,
      duration: item.duration,
      lessonCount: item.lessons,
      priceCents: item.price * 100,
      rating: item.rating,
      reviewCount: item.reviews,
      image: item.image,
      accent: item.accent,
      outcomes: item.outcomes,
      requirements: item.requirements,
      status: "PUBLISHED",
      publishedAt: new Date("2026-01-01"),
      modules: {
        create: item.curriculum.map((module, moduleIndex) => ({
          title: module.title,
          position: moduleIndex,
          lessons: {
            create: module.lessons.map((lesson, lessonIndex) => ({
              id: lesson.id,
              title: lesson.title,
              duration: lesson.duration,
              position: lessonIndex,
              isPreview: Boolean(lesson.preview),
              publishedAt: new Date("2026-01-01"),
            })),
          },
        })),
      },
    },
  });
}

await db.$disconnect();
