import type { ChildFeedback } from "@/shared/ai";
import { prisma } from "./db";
import { track } from "./analytics";
import { checkAchievements } from "./achievements";
import { requireOwnedChild, type SessionUser } from "./auth";

const POINTS_PER_MISSION = 10;

export async function recordEvaluation(a: {
  attemptId: string;
  childId: string;
  missionId: string;
  attemptNumber: number;
  feedback: ChildFeedback;
}) {
  let missionCompleted = false;
  if (a.feedback.result === "SUCCESS") {
    const earlier = await prisma.attempt.count({
      where: { childId: a.childId, missionId: a.missionId, result: "SUCCESS", id: { not: a.attemptId } },
    });
    if (earlier === 0) {
      missionCompleted = true;
      const skills = await prisma.missionSkill.findMany({ where: { missionId: a.missionId } });
      await Promise.all(
        skills.map((s) =>
          prisma.childSkill.upsert({
            where: { childId_skillId: { childId: a.childId, skillId: s.skillId } },
            create: { childId: a.childId, skillId: s.skillId, points: POINTS_PER_MISSION },
            update: { points: { increment: POINTS_PER_MISSION } },
          }),
        ),
      );
      await track("MISSION_COMPLETED", { childId: a.childId, props: { missionId: a.missionId } });
    }
  }
  const achievements = await checkAchievements(a.childId, {
    attemptNumber: a.attemptNumber,
    improved: a.feedback.improved,
    missionCompleted,
  });
  return { missionCompleted, achievements };
}

export async function getProgress(user: SessionUser, childId: string) {
  const child = await requireOwnedChild(user, childId);
  const [skills, childSkills, attempts] = await Promise.all([
    prisma.skill.findMany({ orderBy: { name: "asc" } }),
    prisma.childSkill.findMany({ where: { childId } }),
    prisma.attempt.findMany({
      where: { childId },
      include: { mission: { select: { id: true, title: true, emoji: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const byMission = new Map<string, { missionId: string; title: string; emoji: string; attempts: number; bestScore: number | null; completed: boolean }>();
  for (const at of attempts) {
    const m = byMission.get(at.missionId) ?? {
      missionId: at.missionId,
      title: at.mission.title,
      emoji: at.mission.emoji,
      attempts: 0,
      bestScore: null,
      completed: false,
    };
    m.attempts++;
    if (at.score !== null && (m.bestScore === null || at.score > m.bestScore)) m.bestScore = at.score;
    if (at.result === "SUCCESS") m.completed = true;
    byMission.set(at.missionId, m);
  }
  const missions = [...byMission.values()];

  return {
    child: { id: child.id, name: child.name, age: child.age, avatar: child.avatar },
    totals: {
      attempts: attempts.length,
      missionsTried: missions.length,
      missionsCompleted: missions.filter((m) => m.completed).length,
    },
    skills: skills.map((s) => ({
      slug: s.slug,
      name: s.name,
      emoji: s.emoji,
      points: childSkills.find((c) => c.skillId === s.id)?.points ?? 0,
    })),
    missions,
    recentAttempts: attempts.slice(0, 10).map((at) => ({
      id: at.id,
      missionId: at.missionId,
      missionTitle: at.mission.title,
      attemptNumber: at.attemptNumber,
      result: at.result,
      score: at.score,
      status: at.status,
      createdAt: at.createdAt,
    })),
  };
}
