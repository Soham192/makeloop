import { Prisma } from "@prisma/client";
import type { ChildFeedback, Hint } from "@/shared/ai";
import { prisma } from "./db";
import { HttpError, notFound } from "./http";
import { track } from "./analytics";
import { requireOwnedChild, type SessionUser } from "./auth";
import { deleteImages, storeImage, validateImage } from "./storage";

export type AttemptDto = {
  id: string;
  childId: string;
  missionId: string;
  attemptNumber: number;
  imageUrl: string | null;
  status: "PENDING_AI" | "EVALUATED" | "AI_FAILED";
  result: string | null;
  score: number | null;
  feedback: ChildFeedback | null;
  hintLevel: number;
  hints: Hint[];
  createdAt: Date;
};

type AttemptRow = Prisma.AttemptGetPayload<object>;

export function toDto(a: AttemptRow): AttemptDto {
  return {
    id: a.id,
    childId: a.childId,
    missionId: a.missionId,
    attemptNumber: a.attemptNumber,
    imageUrl: a.imageUrl,
    status: a.status,
    result: a.result,
    score: a.score,
    feedback: (a.aiFeedback as ChildFeedback | null) ?? null,
    hintLevel: a.hintLevel,
    hints: (a.hints as Hint[]) ?? [],
    createdAt: a.createdAt,
  };
}

export async function createAttempt(user: SessionUser, missionId: string, form: FormData) {
  const childId = String(form.get("childId") ?? "");
  if (!childId) throw new HttpError(400, "childId is required");
  await requireOwnedChild(user, childId);
  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission) throw notFound("Mission not found");

  const { bytes, kind } = await validateImage(form.get("image"));
  const imageUrl = await storeImage(bytes, kind, `attempts/${childId}/${missionId}`);

  for (let tries = 0; tries < 3; tries++) {
    const last = await prisma.attempt.findFirst({
      where: { childId, missionId },
      orderBy: { attemptNumber: "desc" },
      select: { attemptNumber: true },
    });
    try {
      const attempt = await prisma.attempt.create({
        data: { childId, missionId, imageUrl, attemptNumber: (last?.attemptNumber ?? 0) + 1 },
      });
      await track("ATTEMPT_CREATED", { userId: user.id, childId, props: { missionId, attemptNumber: attempt.attemptNumber } });
      await track("IMAGE_SUBMITTED", { userId: user.id, childId, props: { attemptId: attempt.id, bytes: bytes.length } });
      return toDto(attempt);
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    }
  }
  throw new HttpError(409, "Please try submitting again");
}

export async function listAttempts(user: SessionUser, missionId: string, childId: string) {
  await requireOwnedChild(user, childId);
  const attempts = await prisma.attempt.findMany({
    where: { childId, missionId },
    orderBy: { attemptNumber: "asc" },
  });
  return attempts.map(toDto);
}

export async function getOwnedAttempt(user: SessionUser, attemptId: string) {
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw notFound("Attempt not found");
  await requireOwnedChild(user, attempt.childId).catch(() => {
    throw notFound("Attempt not found");
  });
  return attempt;
}

/** Retention policy: remove stored photos older than `days`; attempt records and feedback are kept. */
export async function purgeOldImages(days: number) {
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const old = await prisma.attempt.findMany({
    where: { createdAt: { lt: cutoff }, imageUrl: { not: null } },
    select: { id: true, imageUrl: true },
  });
  await deleteImages(old.map((a) => a.imageUrl));
  await prisma.attempt.updateMany({ where: { id: { in: old.map((a) => a.id) } }, data: { imageUrl: null } });
  return old.length;
}
