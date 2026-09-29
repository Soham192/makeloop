import { z } from "zod";

export const visionObservationSchema = z.object({
  build_detected: z.boolean(),
  mission_relevant: z.boolean(),
  observations: z.array(z.string().max(300)).max(8),
  confidence: z.number().min(0).max(1),
  requirements_met: z.array(z.number().int().min(0)).default([]),
  suggested_hint: z.string().max(300).default(""),
});
export type VisionObservation = z.infer<typeof visionObservationSchema>;

export type MissionContext = {
  title: string;
  objective: string;
  expectedObject: string;
  requirements: string[];
  concept: string;
  materials: string[];
  childAge: number;
  attemptNumber: number;
  previousScore: number | null;
};

export type BuildResult = "SUCCESS" | "PARTIAL" | "NEEDS_WORK" | "UNCLEAR";

export type ChildFeedback = {
  result: BuildResult;
  score: number | null;
  headline: string;
  praise: string;
  observations: string[];
  nextStep: string;
  retakePhoto: boolean;
  improved: boolean | null;
  source: "ai" | "demo";
};

export type HintLevel = 1 | 2 | 3;

export type Hint = { level: HintLevel; text: string };

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
