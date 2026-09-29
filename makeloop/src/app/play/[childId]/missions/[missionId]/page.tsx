import { notFound } from "next/navigation";
import { pageChild, pageUser } from "@/server/auth";
import { getMission } from "@/server/missions";
import { listAttempts } from "@/server/attempts";
import { HttpError } from "@/server/http";
import { MissionFlow } from "./mission-flow";

export const dynamic = "force-dynamic";

export default async function MissionPage({ params }: { params: Promise<{ childId: string; missionId: string }> }) {
  const { childId, missionId } = await params;
  const user = await pageUser();
  const child = await pageChild(user, childId);
  const mission = await getMission(user, missionId, childId).catch((err) => {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  });
  const attempts = await listAttempts(user, missionId, childId);

  return (
    <MissionFlow
      child={{ id: child.id, name: child.name }}
      mission={{
        id: mission.id,
        title: mission.title,
        emoji: mission.emoji,
        summary: mission.summary,
        objective: mission.objective,
        requirements: mission.requirements,
        concept: mission.concept,
        safetyNotes: mission.safetyNotes,
        materials: mission.materials.map((m) => ({ name: m.material.name, emoji: m.material.emoji, quantity: m.quantity })),
      }}
      initialAttempts={attempts}
    />
  );
}
