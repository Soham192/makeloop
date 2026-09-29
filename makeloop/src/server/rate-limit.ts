import { prisma } from "./db";
import { HttpError } from "./http";

export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const since = new Date(Date.now() - windowSeconds * 1000);
  const count = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
  if (count >= limit) {
    throw new HttpError(429, "Whoa, lots of requests! Take a short break and try again in a minute.");
  }
  await prisma.rateLimitHit.create({ data: { key } });
  if (Math.random() < 0.02) {
    await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
  }
}

export const aiRateLimit = (userId: string) => rateLimit(`ai:${userId}`, 20, 60);
