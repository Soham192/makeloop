import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { explainConcept } from "@/server/ai";
import { route } from "@/server/http";
import { aiRateLimit } from "@/server/rate-limit";

export const maxDuration = 30;
const body = z.object({ missionId: z.string().min(1), childId: z.string().min(1) });

export const POST = route(async (req) => {
  const user = await requireUser();
  await aiRateLimit(user.id);
  const { missionId, childId } = body.parse(await req.json());
  return NextResponse.json(await explainConcept(user, missionId, childId));
});
