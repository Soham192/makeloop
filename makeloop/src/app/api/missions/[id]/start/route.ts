import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { startMission } from "@/server/missions";

const body = z.object({ childId: z.string().min(1) });

export const POST = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { childId } = body.parse(await req.json());
  return NextResponse.json(await startMission(user, (await params).id, childId));
});
