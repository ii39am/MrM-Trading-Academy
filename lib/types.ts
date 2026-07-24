export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  preview?: boolean;
}

export interface CourseModule {
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  longDescription: string;
  instructor: string;
  difficulty: Difficulty;
  duration: string;
  lessons: number;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  accent: string;
  outcomes: string[];
  requirements: string[];
  curriculum: CourseModule[];
  featured?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  status: "PENDING_VERIFICATION" | "ACTIVE" | "DISABLED" | "MIGRATION_REQUIRED";
  sessionVersion: number;
}

export interface Enrollment {
  courseId: string;
  progress: number;
  nextLessonId: string;
  completedLessons: string[];
}
