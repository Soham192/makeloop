import { describe, expect, it } from "vitest";
import type { MissionContext, VisionObservation } from "@/shared/ai";
import { visionObservationSchema } from "@/shared/ai";
import { toChildFeedback } from "./feedback";
import { checkText, safeForChild } from "./safety";
import { demoObservation } from "./demo";
import { extractJson } from "./provider";

const ctx: MissionContext = {
  title: "Paper Bridge",
  objective: "Build a bridge",
  expectedObject: "paper bridge",
  requirements: ["Spans the gap", "Paper is folded", "Coins on top"],
  concept: "Shape",
  materials: ["paper"],
  childAge: 8,
  attemptNumber: 1,
  previousScore: null,
};

const obs = (o: Partial<VisionObservation>): VisionObservation => ({
  build_detected: true,
  mission_relevant: true,
  observations: ["I can see a folded bridge."],
  confidence: 0.9,
  requirements_met: [0, 1, 2],
  suggested_hint: "What could hold more coins?",
  ...o,
});

describe("toChildFeedback", () => {
  it("hedges and asks for a retake when confidence is low", () => {
    const f = toChildFeedback(obs({ confidence: 0.3 }), ctx, "ai");
    expect(f.result).toBe("UNCLEAR");
    expect(f.retakePhoto).toBe(true);
    expect(f.score).toBeNull();
    expect(f.nextStep).toMatch(/another photo/i);
  });

  it("asks for a retake when no build is detected", () => {
    expect(toChildFeedback(obs({ build_detected: false }), ctx, "ai").retakePhoto).toBe(true);
  });

  it("does not claim success at medium confidence even when all requirements look met", () => {
    const f = toChildFeedback(obs({ confidence: 0.6 }), ctx, "ai");
    expect(f.result).toBe("PARTIAL");
    expect(f.observations[0]).toMatch(/^It looks like/);
  });

  it("marks success when all requirements are met with high confidence", () => {
    const f = toChildFeedback(obs({}), ctx, "ai");
    expect(f.result).toBe("SUCCESS");
    expect(f.score).toBe(100);
  });

  it("ignores out-of-range requirement indexes", () => {
    const f = toChildFeedback(obs({ requirements_met: [0, 7, 9] }), ctx, "ai");
    expect(f.score).toBe(33);
    expect(f.result).toBe("PARTIAL");
  });

  it("reports improvement against the previous score", () => {
    const f = toChildFeedback(obs({ requirements_met: [0, 1] }), { ...ctx, previousScore: 33 }, "ai");
    expect(f.improved).toBe(true);
  });

  it("replaces unsafe model hints with a safe fallback", () => {
    const f = toChildFeedback(obs({ requirements_met: [0], suggested_hint: "Use a knife to cut the paper" }), ctx, "ai");
    expect(f.nextStep).not.toMatch(/knife/i);
    expect(f.nextStep).toMatch(/paper is folded/i);
  });
});

describe("safety", () => {
  it("flags unsafe, personal-info and clinical text", () => {
    expect(checkText("Heat it on the stove").ok).toBe(false);
    expect(checkText("What is your address?").ok).toBe(false);
    expect(checkText("You might have ADHD").ok).toBe(false);
  });

  it("allows ordinary build language", () => {
    expect(checkText("I saw a tall tower with a wide base").ok).toBe(true);
  });

  it("strips links/markdown and softens overconfident claims", () => {
    expect(safeForChild("**Definitely** strong! https://x.y", "fb", { hedge: true })).toBe("probably strong!");
  });
});

describe("demo evaluator", () => {
  it("shows improvement from the first to the second attempt", () => {
    const first = toChildFeedback(demoObservation(ctx, "hint"), ctx, "demo");
    const second = toChildFeedback(
      demoObservation({ ...ctx, attemptNumber: 2 }, "hint"),
      { ...ctx, attemptNumber: 2, previousScore: first.score },
      "demo",
    );
    expect(first.result).toBe("PARTIAL");
    expect(second.result).toBe("SUCCESS");
    expect(second.improved).toBe(true);
  });
});

describe("vision output parsing", () => {
  it("extracts JSON wrapped in prose and validates it", () => {
    const raw = 'Here you go: {"build_detected":true,"mission_relevant":true,"observations":[],"confidence":0.8} thanks';
    const parsed = visionObservationSchema.parse(extractJson(raw));
    expect(parsed.requirements_met).toEqual([]);
  });

  it("rejects out-of-range confidence", () => {
    expect(
      visionObservationSchema.safeParse({ build_detected: true, mission_relevant: true, observations: [], confidence: 3 }).success,
    ).toBe(false);
  });
});
