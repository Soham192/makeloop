import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { getProgress } from "@/server/progress";

export const GET = route(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  return NextResponse.json(await getProgress(user, (await params).id));
});
