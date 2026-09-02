import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { writeAudit } from "@/lib/audit";
import type { TelegramAccessProvider } from "@/lib/providers/telegram";
import { TelegramClientError } from "@/lib/providers/telegram";

const INVITE_LIFETIME_MS = 15 * 60_000;
const RATE_WINDOW_MS = 60 * 60_000;
const MAX_GRANTS_PER_WINDOW = 3;
const STALE_PENDING_MS = 2 * 60_000;

const registry = globalThis as typeof globalThis & {
  __academyTelegramProvider?: TelegramAccessProvider;
};
export function registerTelegramProvider(provider: TelegramAccessProvider) {
  registry.__academyTelegramProvider = provider;
}
export function getTelegramProvider() {
  if (!registry.__academyTelegramProvider)
    throw new CourseAccessError("TELEGRAM_UNAVAILABLE");
  return registry.__academyTelegramProvider;
}

export type CourseAccessErrorCode =
  | "ENTITLEMENT_REQUIRED"
  | "COURSE_UNAVAILABLE"
  | "ACCESS_DISABLED"
  | "RATE_LIMITED"
  | "ISSUANCE_IN_PROGRESS"
  | "TELEGRAM_UNAVAILABLE";
export class CourseAccessError extends Error {
  readonly name = "CourseAccessError";
  constructor(readonly code: CourseAccessErrorCode) {
    super("Secure course access could not be issued");
  }
}

type IssueDependencies = {
  enabled?: boolean;
  provider?: TelegramAccessProvider;
  now?: Date;
};

async function transaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        attempt < 2 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      )
        continue;
      throw error;
    }
  }
  throw new CourseAccessError("TELEGRAM_UNAVAILABLE");
}

function inviteName(courseId: string, grantId: string) {
  return `course-${courseId.slice(0, 8)}-grant-${grantId.slice(0, 8)}`.slice(0, 32);
}

export async function issueCourseAccess(
  userId: string,
  courseId: string,
  dependencies: IssueDependencies = {},
) {
  const now = dependencies.now ?? new Date();
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: {
      purchase: { select: { id: true, userId: true, status: true } },
      course: {
        select: {
          id: true,
          status: true,
          publishedAt: true,
          telegramAccessEnabled: true,
          telegramChatId: true,
        },
      },
    },
  });
  if (
    !enrollment ||
    enrollment.purchase.userId !== userId ||
    enrollment.purchase.status !== "PAID"
  )
    throw new CourseAccessError("ENTITLEMENT_REQUIRED");
  if (
    enrollment.course.status !== "PUBLISHED" ||
    !enrollment.course.publishedAt ||
    enrollment.course.publishedAt > now
  )
    throw new CourseAccessError("COURSE_UNAVAILABLE");
  if (!(dependencies.enabled ?? env.TELEGRAM_ACCESS_ENABLED))
    throw new CourseAccessError("ACCESS_DISABLED");
  if (!enrollment.course.telegramAccessEnabled || !enrollment.course.telegramChatId)
    throw new CourseAccessError("ACCESS_DISABLED");
  await writeAudit({
    action: "COURSE_ACCESS_REQUESTED",
    actorId: userId,
    targetUserId: userId,
    entityType: "Course",
    entityId: courseId,
    category: "ACCESS",
    metadata: { courseId },
  });

  const grantId = randomUUID();
  const expiresAt = new Date(now.getTime() + INVITE_LIFETIME_MS);
  try {
    await transaction(async (tx) => {
      await tx.courseAccessGrant.updateMany({
        where: { userId, courseId, status: "ACTIVE", expiresAt: { lte: now } },
        data: { status: "EXPIRED" },
      });
      await tx.courseAccessGrant.updateMany({
        where: {
          userId,
          courseId,
          status: "PENDING",
          createdAt: { lte: new Date(now.getTime() - STALE_PENDING_MS) },
        },
        data: { status: "FAILED", lastErrorCode: "ISSUANCE_TIMEOUT" },
      });
      const count = await tx.courseAccessGrant.count({
        where: {
          userId,
          courseId,
          createdAt: { gte: new Date(now.getTime() - RATE_WINDOW_MS) },
        },
      });
      if (count >= MAX_GRANTS_PER_WINDOW)
        throw new CourseAccessError("RATE_LIMITED");
      const claimed = await tx.courseAccessGrant.createMany({
        data: [{
          id: grantId,
          userId,
          courseId,
          purchaseId: enrollment.purchase.id,
          enrollmentId: enrollment.id,
          createdAt: now,
          expiresAt,
        }],
        skipDuplicates: true,
      });
      if (claimed.count !== 1) throw new CourseAccessError("ISSUANCE_IN_PROGRESS");
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new CourseAccessError("ISSUANCE_IN_PROGRESS");
    if (error instanceof CourseAccessError) {
      if (error.code === "RATE_LIMITED")
        await writeAudit({
          action: "COURSE_ACCESS_RATE_LIMITED",
          actorId: userId,
          targetUserId: userId,
          entityType: "Course",
          entityId: courseId,
          category: "ACCESS",
          metadata: { courseId, count: MAX_GRANTS_PER_WINDOW },
        });
      throw error;
    }
    throw error;
  }

  const name = inviteName(courseId, grantId);
  try {
    const provider = dependencies.provider ?? getTelegramProvider();
    const invite = await provider.createInvite({
      chatId: enrollment.course.telegramChatId,
      name,
      expiresAt,
      memberLimit: 1,
    });
    const activated = await transaction(async (tx) => {
      const current = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        include: { purchase: { select: { id: true, status: true, userId: true } } },
      });
      if (
        !current ||
        current.id !== enrollment.id ||
        current.purchase.id !== enrollment.purchase.id ||
        current.purchase.userId !== userId ||
        current.purchase.status !== "PAID"
      ) {
        await tx.courseAccessGrant.update({
          where: { id: grantId },
          data: { status: "REVOKED", revokedAt: new Date(), lastErrorCode: "ENTITLEMENT_REVOKED" },
        });
        return false;
      }
      await tx.courseAccessGrant.update({
        where: { id: grantId },
        data: {
          status: "ACTIVE",
          expiresAt: invite.expiresAt,
          externalInviteId: invite.name,
        },
      });
      await writeAudit(
        {
          action: "COURSE_ACCESS_GRANTED",
          actorId: userId,
          targetUserId: userId,
          entityType: "CourseAccessGrant",
          entityId: grantId,
          category: "ACCESS",
          metadata: { courseId, purchaseId: enrollment.purchase.id, grantId, provider: "telegram" },
        },
        tx,
      );
      return true;
    });
    if (!activated) {
      await provider.revokeInvite(enrollment.course.telegramChatId, invite.inviteUrl).catch(() => undefined);
      throw new CourseAccessError("ENTITLEMENT_REQUIRED");
    }
    return { grantId, inviteUrl: invite.inviteUrl, expiresAt: invite.expiresAt };
  } catch (error) {
    if (error instanceof CourseAccessError) throw error;
    const code = error instanceof TelegramClientError ? error.code : "PROVIDER_ERROR";
    await db.courseAccessGrant.updateMany({
      where: { id: grantId, status: "PENDING" },
      data: { status: "FAILED", lastErrorCode: code },
    });
    await writeAudit({
      action: "COURSE_ACCESS_FAILED",
      actorId: userId,
      targetUserId: userId,
      entityType: "CourseAccessGrant",
      entityId: grantId,
      category: "ACCESS",
      metadata: { courseId, purchaseId: enrollment.purchase.id, grantId, errorCode: code },
    });
    throw new CourseAccessError("TELEGRAM_UNAVAILABLE");
  }
}
