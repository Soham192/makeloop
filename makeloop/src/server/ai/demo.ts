import type { MissionContext, VisionObservation } from "@/shared/ai";

// Deterministic stand-in for the vision model: first attempt meets about half the
// requirements, later attempts meet them all, so the demo reliably shows improvement.
export function demoObservation(ctx: MissionContext, firstHint: string): VisionObservation {
  const total = ctx.requirements.length;
  const metCount = ctx.attemptNumber <= 1 ? Math.max(1, Math.floor(total / 2)) : total;
  const met = Array.from({ length: metCount }, (_, i) => i);
  return {
    build_detected: true,
    mission_relevant: true,
    confidence: 0.85,
    requirements_met: met,
    observations: [
      `I can see a build that looks like a ${ctx.expectedObject}.`,
      ...met.slice(0, 2).map((i) => `It looks like you managed this: ${ctx.requirements[i].toLowerCase()}.`),
    ],
    suggested_hint: firstHint,
  };
}
