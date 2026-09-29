import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { getOwnedAttempt, toDto } from "@/server/attempts";
import { route } from "@/server/http";

export const GET = route(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  return NextResponse.json({ attempt: toDto(await getOwnedAttempt(user, (await params).id)) });
});
