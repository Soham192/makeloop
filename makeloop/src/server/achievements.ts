import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { track } from "./analytics";
import { requireOwnedChild, type SessionUser } from "./auth";

export const ACHIEVEMENTS = {
  FIRST_BUILD: { title: "First Build", emoji: "🧱", description: "Shared your first invention" },
  FIRST_MISSION: { title: "Mission Complete", emoji: "🏅", description: "Completed a mission" },
  IMPROVER: { title: "Better Every Time", emoji: "📈", description: "Improved a build on a new attempt" },
  PERSISTENT: { title: "Never Give Up", emoji: "💪", description: "Tried the same mission 3 times" },
  EXPLORER: { title: "Explorer", emoji: "🧭", description: "Completed 3 different missions" },
} as const;
export type AchievementCode = keyof typeof ACHIEVEMENTS;

async function unlock(childId: string, code: AchievementCode) {
  const def = ACHIEVEMENTS[code];
  try {
    const a = await prisma.achievement.create({ data: { childId, code, title: def.title, emoji: def.emoji } });
    await track("ACHIEVEMENT_UNLOCKED", { childId, props: { code } });
    return a;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return null;
    throw err;
  }
}

export async function checkAchievements(
  childId: string,
  ev: { attemptNumber: number; improved: boolean | null; missionCompleted: boolean },
) {
  const codes: AchievementCode[] = ["FIRST_BUILD"];
  if (ev.improved) codes.push("IMPROVER");
  if (ev.attemptNumber >= 3) codes.push("PERSISTENT");
  if (ev.missionCompleted) {
    codes.push("FIRST_MISSION");
    const completed = await prisma.attempt.findMany({
      where: { childId, result: "SUCCESS" },
      distinct: ["missionId"],
      select: { missionId: true },
    });
    if (completed.length >= 3) codes.push("EXPLORER");
  }
  const unlocked = await Promise.all(codes.map((c) => unlock(childId, c)));
  return unlocked.filter((a) => a !== null);
}

export async function listAchievements(user: SessionUser, childId: string) {
  await requireOwnedChild(user, childId);
  const earned = await prisma.achievement.findMany({ where: { childId }, orderBy: { earnedAt: "asc" } });
  return (Object.keys(ACHIEVEMENTS) as AchievementCode[]).map((code) => {
    const e = earned.find((a) => a.code === code);
    return { code, ...ACHIEVEMENTS[code], earned: !!e, earnedAt: e?.earnedAt ?? null };
  });
}
