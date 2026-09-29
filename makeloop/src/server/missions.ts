import { prisma } from "./db";
import { notFound } from "./http";
import { track } from "./analytics";
import { requireOwnedChild, type SessionUser } from "./auth";

const missionInclude = {
  materials: { include: { material: true } },
  skills: { include: { skill: true } },
} as const;

export async function listMissions(user: SessionUser, childId: string | null) {
  if (!childId) {
    const all = await prisma.mission.findMany({ include: missionInclude, orderBy: [{ difficulty: "asc" }, { title: "asc" }] });
    return all.map((m) => ({ ...m, attemptCount: 0, bestScore: null as number | null, completed: false }));
  }
  const child = await requireOwnedChild(user, childId);
  const missions = await prisma.mission.findMany({
    where: { minAge: { lte: child.age }, maxAge: { gte: child.age } },
    include: missionInclude,
    orderBy: [{ difficulty: "asc" }, { title: "asc" }],
  });
  const attempts = await prisma.attempt.groupBy({
    by: ["missionId"],
    where: { childId },
    _count: { _all: true },
    _max: { score: true },
  });
  const completed = await prisma.attempt.findMany({
    where: { childId, result: "SUCCESS" },
    select: { missionId: true },
    distinct: ["missionId"],
  });
  const done = new Set(completed.map((a) => a.missionId));
  return missions.map((m) => {
    const a = attempts.find((x) => x.missionId === m.id);
    return { ...m, attemptCount: a?._count._all ?? 0, bestScore: a?._max.score ?? null, completed: done.has(m.id) };
  });
}

export async function getMission(user: SessionUser, missionId: string, childId: string | null) {
  const mission = await prisma.mission.findUnique({ where: { id: missionId }, include: missionInclude });
  if (!mission) throw notFound("Mission not found");
  if (childId) {
    await requireOwnedChild(user, childId);
    await track("MISSION_VIEWED", { userId: user.id, childId, props: { missionId } });
  }
  return mission;
}

export async function startMission(user: SessionUser, missionId: string, childId: string) {
  const child = await requireOwnedChild(user, childId);
  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission) throw notFound("Mission not found");
  await track("MISSION_STARTED", { userId: user.id, childId: child.id, props: { missionId } });
  const attemptCount = await prisma.attempt.count({ where: { childId, missionId } });
  return { missionId, childId, attemptCount };
}
