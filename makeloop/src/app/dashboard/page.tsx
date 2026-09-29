import { pageUser } from "@/server/auth";
import { listChildren } from "@/server/children";
import { AppHeader } from "@/components/app-header";
import { ChildForm } from "@/components/child-form";
import { AVATAR_EMOJI, ButtonLink, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await pageUser();
  const children = await listChildren(user);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <AppHeader />
      <h1 className="mt-8 text-3xl font-black">Hi {user.name.split(" ")[0]} 👋</h1>
      <p className="mt-1 text-muted">Choose who&apos;s building today, or check in on their progress.</p>

      {children.length > 0 && (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className="grid size-14 place-items-center rounded-2xl bg-sky-soft text-3xl" aria-hidden>
                  {AVATAR_EMOJI[c.avatar] ?? "🚀"}
                </span>
                <div>
                  <h2 className="text-xl font-extrabold">{c.name}</h2>
                  <p className="text-sm text-muted">Age {c.age}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <ButtonLink href={`/play/${c.id}`} className="flex-1">
                  Start building
                </ButtonLink>
                <ButtonLink href={`/dashboard/children/${c.id}`} variant="secondary">
                  Progress
                </ButtonLink>
              </div>
            </Card>
          ))}
        </section>
      )}

      <Card className="mt-8 max-w-xl">
        <h2 className="text-xl font-extrabold">{children.length ? "Add another maker" : "Add your first maker"}</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Profiles live under your account — kids never log in on their own.</p>
        <ChildForm />
      </Card>
    </main>
  );
}
