import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "./db";
import { HttpError } from "./http";
import { track } from "./analytics";

export const SESSION_COOKIE = "ml_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(s);
}

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1),
});

export type SessionUser = { id: string; email: string; name: string; role: "PARENT" | "ADMIN" };

async function issueSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function register(input: unknown): Promise<SessionUser> {
  const data = registerSchema.parse(input);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new HttpError(409, "An account with that email already exists");
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 12) },
  });
  await issueSession(user.id);
  await track("USER_REGISTERED", { userId: user.id });
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function login(input: unknown): Promise<SessionUser> {
  const data = loginSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  const ok = user ? await bcrypt.compare(data.password, user.passwordHash) : false;
  if (!user || !ok) throw new HttpError(401, "Email or password is incorrect");
  await issueSession(user.id);
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    return user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please log in");
  return user;
}

/** For server components: redirects to login instead of throwing. */
export async function pageUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** For server components: 404s unless the child belongs to the user. */
export async function pageChild(user: SessionUser, childId: string) {
  try {
    return await requireOwnedChild(user, childId);
  } catch {
    notFound();
  }
}

export async function requireOwnedChild(user: SessionUser, childId: string) {
  const child = await prisma.childProfile.findUnique({ where: { id: childId } });
  if (!child || (child.parentId !== user.id && user.role !== "ADMIN")) {
    throw new HttpError(404, "Child profile not found");
  }
  return child;
}
