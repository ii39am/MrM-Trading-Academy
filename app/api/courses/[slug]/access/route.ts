import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, verifySameOrigin } from "@/lib/security";
import { CourseAccessError, issueCourseAccess } from "@/lib/telegram-access";

const responseFor = (error: CourseAccessError) => {
  switch (error.code) {
    case "ENTITLEMENT_REQUIRED":
    case "COURSE_UNAVAILABLE":
      return errorResponse("ACCESS_UNAVAILABLE", "Course access is unavailable", 404);
    case "RATE_LIMITED":
      return errorResponse("ACCESS_RATE_LIMITED", "Too many access requests. Please try again later.", 429);
    case "ISSUANCE_IN_PROGRESS":
      return errorResponse("ACCESS_IN_PROGRESS", "Secure access is already being prepared", 409);
    case "ACCESS_DISABLED":
    case "TELEGRAM_UNAVAILABLE":
      return errorResponse("ACCESS_TEMPORARILY_UNAVAILABLE", "Course access is temporarily unavailable", 503);
  }
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!verifySameOrigin(request))
    return errorResponse("CSRF_REJECTED", "Request origin rejected", 403);

  const user = await getSessionUser();
  if (!user) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

  const { slug } = await params;
  const course = await db.course.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!course)
    return errorResponse("ACCESS_UNAVAILABLE", "Course access is unavailable", 404);

  try {
    const grant = await issueCourseAccess(user.id, course.id);
    return Response.json({
      grant: {
        inviteUrl: grant.inviteUrl,
        expiresAt: grant.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof CourseAccessError) return responseFor(error);
    return errorResponse("ACCESS_TEMPORARILY_UNAVAILABLE", "Course access is temporarily unavailable", 503);
  }
}
