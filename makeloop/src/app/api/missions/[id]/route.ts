import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { getMission } from "@/server/missions";

export const GET = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const childId = new URL(req.url).searchParams.get("childId");
  return NextResponse.json({ mission: await getMission(user, (await params).id, childId) });
});
