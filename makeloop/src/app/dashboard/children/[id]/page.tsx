import Link from "next/link";
import { pageChild, pageUser } from "@/server/auth";
import { getProgress } from "@/server/progress";
import { listAchievements } from "@/server/achievements";
import { AppHeader } from "@/components/app-header";
import { ChildForm } from "@/components/child-form";
import { AchievementGrid, ResultBadge, SkillList } from "@/components/progress";
import { AVATAR_EMOJI, ButtonLink, Card, ProgressBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ChildProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser();
  const child = await pageChild(user, id);
  const [progress, achievements] = await Promise.all([getProgress(user, id), listAchievements(user, id)]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <AppHeader />
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-bold text-sky">
        ← All makers
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-16 place-items-center rounded-2xl bg-sky-soft text-4xl" aria-hidden>
            {AVATAR_EMOJI[child.avatar] ?? "🚀"}
          </span>
          <div>
            <h1 className="text-3xl font-black">{child.name}&apos;s progress</h1>
            <p className="text-muted">Age {child.age}</p>
          </div>
        </div>
        <ButtonLink href={`/play/${child.id}`}>Start building</ButtonLink>
      </div>

      <section className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Builds shared", value: progress.totals.attempts },
          { label: "Missions tried", value: progress.totals.missionsTried },
          { label: "Missions completed", value: progress.totals.missionsCompleted },
        ].map((t) => (
          <Card key={t.label} className="text-center">
            <div className="text-3xl font-black">{t.value}</div>
            <div className="text-xs font-bold text-muted sm:text-sm">{t.label}</div>
          </Card>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-xl font-extrabold">Skills</h2>
          <SkillList skills={progress.skills} />
        </Card>
        <Card>
          <h2 className="mb-4 text-xl font-extrabold">Achievements</h2>
          <AchievementGrid achievements={achievements} />
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 text-xl font-extrabold">Missions</h2>
        {progress.missions.length === 0 ? (
          <p className="text-muted">No missions tried yet.</p>
        ) : (
          <ul className="space-y-4">
            {progress.missions.map((m) => (
              <li key={m.missionId}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-bold">
                    <span aria-hidden>{m.emoji}</span> {m.title}
                  </span>
                  <span className="text-muted">
                    {m.attempts} {m.attempts === 1 ? "try" : "tries"} · best {m.bestScore ?? "–"}%
                    {m.completed && " · ✅ completed"}
                  </span>
                </div>
                <ProgressBar value={m.bestScore ?? 0} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-6">
        <h2 className="mb-4 text-xl font-extrabold">Recent builds</h2>
        {progress.recentAttempts.length === 0 ? (
          <p className="text-muted">Builds will appear here after the first photo.</p>
        ) : (
          <ul className="divide-y-2 divide-line">
            {progress.recentAttempts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>
                  <span className="font-bold">{a.missionTitle}</span> · try #{a.attemptNumber}
                </span>
                <span className="flex items-center gap-2">
                  {a.score !== null && <span className="font-bold">{a.score}%</span>}
                  <ResultBadge result={a.result} status={a.status} />
                  <span className="text-muted">{a.createdAt.toLocaleDateString()}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <details className="mt-6 rounded-[var(--radius-blob)] border-2 border-line bg-white p-5">
        <summary className="cursor-pointer font-extrabold">Edit profile</summary>
        <div className="mt-4 max-w-xl">
          <ChildForm child={{ id: child.id, name: child.name, age: child.age, avatar: child.avatar }} />
        </div>
      </details>
    </main>
  );
}
