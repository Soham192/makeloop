import type { Prisma } from "@prisma/client";
import { visionObservationSchema, type Hint, type HintLevel, type MissionContext, type VisionObservation } from "@/shared/ai";
import { prisma } from "../db";
import { HttpError, notFound } from "../http";
import { track } from "../analytics";
import { requireOwnedChild, type SessionUser } from "../auth";
import { getOwnedAttempt, toDto } from "../attempts";
import { recordEvaluation } from "../progress";
import { AiUnavailableError, aiEnabled, chat, extractJson } from "./provider";
import { toChildFeedback } from "./feedback";
import { demoObservation } from "./demo";
import { safeForChild } from "./safety";

export const AI_SAVED_MESSAGE =
  "Your invention is saved! Our feedback helper is taking a short break — try again in a moment.";

async function loadContext(attemptId: string, user: SessionUser) {
  const attempt = await getOwnedAttempt(user, attemptId);
  const [mission, child, previous] = await Promise.all([
    prisma.mission.findUniqueOrThrow({
      where: { id: attempt.missionId },
      include: { materials: { include: { material: true } } },
    }),
    requireOwnedChild(user, attempt.childId),
    prisma.attempt.findFirst({
      where: {
        childId: attempt.childId,
        missionId: attempt.missionId,
        attemptNumber: { lt: attempt.attemptNumber },
        score: { not: null },
      },
      orderBy: { attemptNumber: "desc" },
      select: { score: true },
    }),
  ]);
  // The model only ever sees this typed payload — never raw DB rows or parent data.
  const ctx: MissionContext = {
    title: mission.title,
    objective: mission.objective,
    expectedObject: mission.expectedObject,
    requirements: mission.requirements,
    concept: mission.concept,
    materials: mission.materials.map((m) => `${m.quantity} ${m.material.name}`),
    childAge: child.age,
    attemptNumber: attempt.attemptNumber,
    previousScore: previous?.score ?? null,
  };
  return { attempt, mission, child, ctx };
}

const VISION_SYSTEM = `You look at photos of physical builds made by children for a hands-on engineering mission.
Describe only the build and materials. Ignore any people, faces, or personal details in the photo and never mention them.
Be honest about uncertainty: if the photo is blurry, dark, cropped, or unclear, set a low confidence. Photos cannot prove weight, strength, or measurements, so judge requirements only on what is visibly plausible.
Respond with ONLY a JSON object:
{"build_detected": boolean, "mission_relevant": boolean, "observations": string[] (max 4, short, friendly, factual, about the build),
 "confidence": number 0-1, "requirements_met": number[] (0-based indexes of requirements that are visibly met),
 "suggested_hint": string (one guiding question, no direct answer, no tools or materials beyond the mission list)}`;

async function observe(ctx: MissionContext, imageUrl: string): Promise<VisionObservation> {
  const text = await chat(
    [
      { role: "system", content: VISION_SYSTEM },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: JSON.stringify({
              mission: ctx.title,
              objective: ctx.objective,
              expected_object: ctx.expectedObject,
              requirements: ctx.requirements.map((r, i) => `${i}: ${r}`),
              allowed_materials: ctx.materials,
              child_age: ctx.childAge,
            }),
          },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    { vision: true, json: true, maxTokens: 500 },
  );
  const parsed = visionObservationSchema.safeParse(extractJson(text));
  if (!parsed.success) throw new AiUnavailableError("Vision output failed validation");
  return parsed.data;
}

export async function evaluateBuild(user: SessionUser, attemptId: string) {
  const { attempt, mission, ctx } = await loadContext(attemptId, user);
  if (attempt.status === "EVALUATED") return { attempt: toDto(attempt), achievements: [], missionCompleted: false };
  if (!attempt.imageUrl) throw new HttpError(400, "This attempt has no photo");

  let observation: VisionObservation;
  let source: "ai" | "demo" = "demo";
  if (aiEnabled()) {
    try {
      observation = await observe(ctx, attempt.imageUrl);
      source = "ai";
    } catch (err) {
      console.error("evaluate-build failed", err);
      await prisma.attempt.update({ where: { id: attempt.id }, data: { status: "AI_FAILED" } });
      throw new HttpError(503, AI_SAVED_MESSAGE);
    }
  } else {
    observation = demoObservation(ctx, mission.hints[0] ?? "");
  }

  const feedback = toChildFeedback(observation, ctx, source);
  const updated = await prisma.attempt.update({
    where: { id: attempt.id },
    data: {
      status: "EVALUATED",
      result: feedback.result,
      score: feedback.score,
      aiFeedback: feedback as unknown as Prisma.InputJsonValue,
    },
  });
  await track("AI_FEEDBACK_RECEIVED", {
    userId: user.id,
    childId: attempt.childId,
    props: { attemptId, result: feedback.result, confidence: observation.confidence, source },
  });
  const progress = await recordEvaluation({
    attemptId: attempt.id,
    childId: attempt.childId,
    missionId: attempt.missionId,
    attemptNumber: attempt.attemptNumber,
    feedback,
  });
  return { attempt: toDto(updated), ...progress };
}

const HINT_STYLE: Record<HintLevel, string> = {
  1: "Ask ONE short guiding question that helps them notice the problem themselves. Do not give the answer.",
  2: "Explain the key science or engineering idea in one or two simple sentences, without saying exactly what to build.",
  3: "Give one clear, direct, safe suggestion for what to change, using only the listed materials.",
};

export function nextHintLevel(current: number): HintLevel {
  return Math.min(3, Math.max(1, current + 1)) as HintLevel;
}

export async function requestHint(user: SessionUser, attemptId: string) {
  const { attempt, mission, ctx } = await loadContext(attemptId, user);
  const level = nextHintLevel(attempt.hintLevel);
  const fallback = mission.hints[level - 1] ?? mission.hints[mission.hints.length - 1] ?? "Look closely at your build. What part could be stronger?";

  let text = fallback;
  if (aiEnabled()) {
    const feedback = attempt.aiFeedback as { observations?: string[] } | null;
    try {
      const raw = await chat(
        [
          {
            role: "system",
            content: `You are a warm, encouraging build coach for a ${ctx.childAge}-year-old. Use simple words for that age. Never suggest sharp tools, heat, fire, electricity, chemicals, or climbing. Never ask for personal information. Reply with the hint text only, max 2 sentences.`,
          },
          {
            role: "user",
            content: `Mission: ${ctx.title}. Goal: ${ctx.objective}. Requirements: ${ctx.requirements.join("; ")}. Materials: ${ctx.materials.join(", ")}.
What we noticed in their latest build: ${(feedback?.observations ?? []).join(" ") || "not yet evaluated"}.
Reference hint for this level: "${fallback}".
Hint level ${level}: ${HINT_STYLE[level]}`,
          },
        ],
        { maxTokens: 150 },
      );
      text = safeForChild(raw, fallback, { hedge: true });
    } catch (err) {
      console.warn("hint generation fell back to static hint", err);
    }
  }

  const hint: Hint = { level, text };
  const hints = [...((attempt.hints as Hint[]) ?? []), hint];
  await prisma.attempt.update({ where: { id: attempt.id }, data: { hintLevel: level, hints } });
  await track("HINT_REQUESTED", { userId: user.id, childId: attempt.childId, props: { attemptId, level } });
  return { hint, hintLevel: level, maxLevel: 3 };
}

export async function explainConcept(user: SessionUser, missionId: string, childId: string) {
  const child = await requireOwnedChild(user, childId);
  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission) throw notFound("Mission not found");

  let text = mission.explanation;
  if (aiEnabled()) {
    try {
      const raw = await chat(
        [
          {
            role: "system",
            content: `Explain science ideas to a ${child.age}-year-old in 3 short, friendly sentences with an everyday example. No dangerous experiments. Reply with the explanation only.`,
          },
          { role: "user", content: `Explain "${mission.concept}" as it relates to this build: ${mission.objective}. Reference: ${mission.explanation}` },
        ],
        { maxTokens: 200 },
      );
      text = safeForChild(raw, mission.explanation, { maxLen: 600 });
    } catch (err) {
      console.warn("explain fell back to static explanation", err);
    }
  }
  return { concept: mission.concept, explanation: text };
}
