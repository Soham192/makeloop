import { NextResponse } from "next/server";
import { requireOwnedChild, requireUser } from "@/server/auth";
import { updateChild } from "@/server/children";
import { route } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req, { params }: Ctx) => {
  const user = await requireUser();
  return NextResponse.json({ child: await requireOwnedChild(user, (await params).id) });
});

export const PATCH = route(async (req, { params }: Ctx) => {
  const user = await requireUser();
  return NextResponse.json({ child: await updateChild(user, (await params).id, await req.json()) });
});
