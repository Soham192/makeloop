import { z } from "zod";
import { prisma } from "./db";
import { requireOwnedChild, type SessionUser } from "./auth";
import { track } from "./analytics";

export const AVATARS = ["rocket", "robot", "dino", "owl", "fox", "whale"] as const;

// Deliberately minimal: a first name or nickname and an age. No birthdays, photos, schools, etc.
const childSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(30, "Keep it short — a first name or nickname"),
  age: z.coerce.number().int().min(4, "Ages 4–14 are supported").max(14, "Ages 4–14 are supported"),
  avatar: z.enum(AVATARS).default("rocket"),
});

export function listChildren(user: SessionUser) {
  return prisma.childProfile.findMany({ where: { parentId: user.id }, orderBy: { createdAt: "asc" } });
}

export async function createChild(user: SessionUser, input: unknown) {
  const data = childSchema.parse(input);
  const child = await prisma.childProfile.create({ data: { ...data, parentId: user.id } });
  await track("CHILD_PROFILE_CREATED", { userId: user.id, childId: child.id });
  return child;
}

export async function updateChild(user: SessionUser, childId: string, input: unknown) {
  await requireOwnedChild(user, childId);
  const data = childSchema.partial().parse(input);
  return prisma.childProfile.update({ where: { id: childId }, data });
}
