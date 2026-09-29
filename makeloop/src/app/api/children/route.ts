import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { createChild, listChildren } from "@/server/children";
import { route } from "@/server/http";

export const GET = route(async () => {
  const user = await requireUser();
  return NextResponse.json({ children: await listChildren(user) });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  return NextResponse.json({ child: await createChild(user, await req.json()) }, { status: 201 });
});
