import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { evaluateBuild } from "@/server/ai";
import { route } from "@/server/http";
import { aiRateLimit } from "@/server/rate-limit";

export const maxDuration = 30;
const body = z.object({ attemptId: z.string().min(1) });

export const POST = route(async (req) => {
  const user = await requireUser();
  await aiRateLimit(user.id);
  const { attemptId } = body.parse(await req.json());
  return NextResponse.json(await evaluateBuild(user, attemptId));
});
