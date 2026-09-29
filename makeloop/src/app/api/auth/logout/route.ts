import { NextResponse } from "next/server";
import { logout } from "@/server/auth";
import { route } from "@/server/http";

export const POST = route(async () => {
  await logout();
  return NextResponse.json({ ok: true });
});
