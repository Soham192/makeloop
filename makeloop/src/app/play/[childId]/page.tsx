import Link from "next/link";
import { pageChild, pageUser } from "@/server/auth";
import { listMissions } from "@/server/missions";
import { listAchievements } from "@/server/achievements";
import { AVATAR_EMOJI, ButtonLink, Logo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PlayHome({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const user = await pageUser();
  const child = await pageChild(user, childId);
  const [missions, achievements] = await Promise.all([listMissions(user, childId), listAchievements(user, childId)]);
  const earned = achievements.filter((a) => a.earned);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Logo href={`/play/${childId}`} />
        <ButtonLink href="/dashboard" variant="ghost" className="px-3 py-2 text-sm">
          Grown-ups
        </ButtonLink>
      </header>

      <section className="mt-8 flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-sun-soft text-4xl" aria-hidden>
          {AVATAR_EMOJI[child.avatar] ?? "🚀"}
        </span>
        <div>
          <h1 className="text-3xl font-black">Hi {child.name}! What will you build today?</h1>
          {earned.length > 0 && (
            <p className="mt-1 text-sm text-muted">
              Your badges:{" "}
              {earned.map((a) => (
                <span key={a.code} title={a.title} className="mr-1">
                  {a.emoji}
                </span>
              ))}
            </p>
          )}
        </div>
      </section>

      {missions.length === 0 ? (
        <p className="mt-10 text-muted">No missions for this age yet — check back soon!</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {missions.map((m) => (
            <li key={m.id}>
              <Link
                href={`/play/${childId}/missions/${m.id}`}
                className="group flex h-full flex-col rounded-[var(--radius-blob)] border-2 border-line bg-white p-5 transition hover:-translate-y-1 hover:border-brand focus-visible:outline-3 focus-visible:outline-sky"
              >
                <div className="flex items-start justify-between">
                  <span className="text-5xl transition group-hover:scale-110" aria-hidden>
                    {m.emoji}
                  </span>
                  {m.completed ? (
                    <span className="rounded-full bg-mint-soft px-2 py-1 text-xs font-bold text-mint">✅ Done</span>
                  ) : m.attemptCount > 0 ? (
                    <span className="rounded-full bg-sun-soft px-2 py-1 text-xs font-bold">In progress</span>
                  ) : null}
                </div>
                <h2 className="mt-3 text-lg font-extrabold">{m.title}</h2>
                <p className="mt-1 flex-1 text-sm text-muted">{m.summary}</p>
                <div className="mt-4 flex items-center justify-between text-xs font-bold text-muted">
                  <span aria-label={`Difficulty ${m.difficulty} of 3`}>
                    {"★".repeat(m.difficulty)}
                    <span className="opacity-30">{"★".repeat(3 - m.difficulty)}</span>
                  </span>
                  <span>
                    {m.materials.length} materials
                    {m.attemptCount > 0 && ` · ${m.attemptCount} ${m.attemptCount === 1 ? "try" : "tries"}`}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
