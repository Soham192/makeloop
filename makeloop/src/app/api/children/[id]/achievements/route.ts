import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { listAchievements } from "@/server/achievements";
import { route } from "@/server/http";

export const GET = route(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  return NextResponse.json({ achievements: await listAchievements(user, (await params).id) });
});
