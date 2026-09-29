import type { BuildResult, ChildFeedback, MissionContext, VisionObservation } from "@/shared/ai";
import { safeForChild } from "./safety";

export const CONFIDENCE_FLOOR = 0.5;
export const CONFIDENT = 0.75;

const RETAKE =
  "Could you take another photo? Try good light, a plain background, and get the whole build in the picture — maybe from a different angle.";

export function toChildFeedback(
  obs: VisionObservation,
  ctx: MissionContext,
  source: ChildFeedback["source"],
): ChildFeedback {
  if (!obs.build_detected || obs.confidence < CONFIDENCE_FLOOR) {
    return {
      result: "UNCLEAR",
      score: null,
      headline: "Hmm, I can't quite see your build",
      praise: "Thanks for sharing! Your invention is saved.",
      observations: [],
      nextStep: RETAKE,
      retakePhoto: true,
      improved: null,
      source,
    };
  }

  if (!obs.mission_relevant) {
    return {
      result: "UNCLEAR",
      score: null,
      headline: `I'm not sure this is a ${ctx.expectedObject} yet`,
      praise: "That looks like an interesting build!",
      observations: safeList(obs.observations),
      nextStep: `If this is your ${ctx.expectedObject}, try another photo so I can see it better. If not, check the mission goal: ${ctx.objective}`,
      retakePhoto: true,
      improved: null,
      source,
    };
  }

  const total = ctx.requirements.length;
  const met = new Set(obs.requirements_met.filter((i) => i < total));
  const score = total ? Math.round((met.size / total) * 100) : null;
  const confident = obs.confidence >= CONFIDENT;

  let result: BuildResult;
  if (met.size === total && confident) result = "SUCCESS";
  else if (met.size > 0) result = "PARTIAL";
  else result = "NEEDS_WORK";

  const firstUnmet = ctx.requirements.find((_, i) => !met.has(i));
  const fallbackNext = firstUnmet
    ? `Next challenge: ${lowerFirst(firstUnmet)}. What could you change to get there?`
    : "Test it out! Does it work the way you hoped? What could make it even better?";

  const improved = ctx.previousScore !== null && score !== null ? score > ctx.previousScore : null;

  return {
    result,
    score,
    headline: headlineFor(result, confident, improved),
    praise: improved
      ? "Your changes made a difference — that's what real engineers do!"
      : "Great job building and sharing your invention!",
    observations: safeList(obs.observations, !confident),
    nextStep: result === "SUCCESS" ? fallbackNext : safeForChild(obs.suggested_hint, fallbackNext, { hedge: true }),
    retakePhoto: false,
    improved,
    source,
  };
}

function headlineFor(result: BuildResult, confident: boolean, improved: boolean | null) {
  if (result === "SUCCESS") return improved ? "You did it — and it's better than before!" : "Mission accomplished, it looks like!";
  if (result === "PARTIAL")
    return improved ? "Nice improvement! You're getting closer" : confident ? "Great start — you're part of the way there" : "It looks like you're on your way";
  return "Good first try — let's keep building";
}

function safeList(items: string[], hedgeAll = false) {
  return items
    .map((o) => safeForChild(o, "", { hedge: true }))
    .filter(Boolean)
    .slice(0, 4)
    .map((o) => (hedgeAll && !/^(it looks like|i think|maybe)/i.test(o) ? `It looks like ${lowerFirst(o)}` : o));
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
