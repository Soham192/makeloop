import { NextResponse } from "next/server";
import { register } from "@/server/auth";
import { route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export const POST = route(async (req) => {
  await rateLimit(`register:${req.headers.get("x-forwarded-for") ?? "local"}`, 10, 3600);
  const user = await register(await req.json());
  return NextResponse.json({ user }, { status: 201 });
});
