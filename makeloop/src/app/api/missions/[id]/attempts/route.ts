import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { createAttempt, listAttempts } from "@/server/attempts";
import { HttpError, route } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, { params }: Ctx) => {
  const user = await requireUser();
  const form = await req.formData().catch(() => {
    throw new HttpError(400, "Upload must be multipart form data");
  });
  return NextResponse.json({ attempt: await createAttempt(user, (await params).id, form) }, { status: 201 });
});

export const GET = route(async (req, { params }: Ctx) => {
  const user = await requireUser();
  const childId = new URL(req.url).searchParams.get("childId");
  if (!childId) throw new HttpError(400, "childId is required");
  return NextResponse.json({ attempts: await listAttempts(user, (await params).id, childId) });
});
