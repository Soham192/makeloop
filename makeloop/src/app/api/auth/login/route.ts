import { NextResponse } from "next/server";
import { login } from "@/server/auth";
import { route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export const POST = route(async (req) => {
  await rateLimit(`login:${req.headers.get("x-forwarded-for") ?? "local"}`, 20, 900);
  const user = await login(await req.json());
  return NextResponse.json({ user });
});
