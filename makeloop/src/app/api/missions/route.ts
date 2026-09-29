import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { listMissions } from "@/server/missions";

export const GET = route(async (req) => {
  const user = await requireUser();
  const childId = new URL(req.url).searchParams.get("childId");
  return NextResponse.json({ missions: await listMissions(user, childId) });
});
