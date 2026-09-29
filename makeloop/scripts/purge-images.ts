import { purgeOldImages } from "@/server/attempts";
import { prisma } from "@/server/db";

const days = Number(process.argv[2] ?? process.env.IMAGE_RETENTION_DAYS ?? 90);

purgeOldImages(days)
  .then((n) => console.log(`Deleted ${n} photo(s) older than ${days} days`))
  .finally(() => prisma.$disconnect());
