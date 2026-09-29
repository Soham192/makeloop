import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export type AnalyticsEventName =
  | "USER_REGISTERED"
  | "CHILD_PROFILE_CREATED"
  | "MISSION_VIEWED"
  | "MISSION_STARTED"
  | "ATTEMPT_CREATED"
  | "IMAGE_SUBMITTED"
  | "AI_FEEDBACK_RECEIVED"
  | "HINT_REQUESTED"
  | "MISSION_COMPLETED"
  | "ACHIEVEMENT_UNLOCKED";

export async function track(
  name: AnalyticsEventName,
  ctx: { userId?: string; childId?: string; props?: Prisma.InputJsonValue } = {},
) {
  try {
    await prisma.analyticsEvent.create({
      data: { name, userId: ctx.userId, childId: ctx.childId, props: ctx.props },
    });
  } catch (err) {
    console.warn("analytics event dropped", name, err);
  }
}
