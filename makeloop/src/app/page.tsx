import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import { ButtonLink, Logo } from "@/components/ui";

export const dynamic = "force-dynamic";

const steps = [
  { emoji: "🎯", title: "Pick a mission", text: "Bridges, towers, boats, launchers — real challenges with things from home." },
  { emoji: "🛠️", title: "Build it for real", text: "Hands on, with paper, tape, straws and imagination." },
  { emoji: "📸", title: "Snap a photo", text: "Our friendly helper looks at the build and shares what it notices." },
  { emoji: "🔁", title: "Make it better", text: "Get hints when you need them, try again, and watch yourself improve." },
];

export default async function Home() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Logo />
        <ButtonLink href="/login" variant="ghost">
          Log in
        </ButtonLink>
      </header>

      <section className="mt-12 grid items-center gap-10 sm:mt-20 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-3 inline-block rounded-full bg-sun-soft px-3 py-1 text-sm font-bold text-ink">Ages 5–14 · Parent-controlled</p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            Build it. Snap it. <span className="text-brand">Make it better.</span>
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted">
            MAKELOOP gives kids real-world building missions and friendly AI feedback on their creations, so every try teaches
            something new.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/register">Create a parent account</ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              I have an account
            </ButtonLink>
          </div>
        </div>
        <div className="relative mx-auto grid aspect-square w-full max-w-sm place-items-center rounded-[3rem] bg-sky-soft text-[7rem]">
          <span className="animate-wobble" aria-hidden>
            🌉
          </span>
          <span className="absolute left-6 top-6 text-5xl" aria-hidden>🪙</span>
          <span className="absolute bottom-8 right-8 text-5xl" aria-hidden>📸</span>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded-[var(--radius-blob)] border-2 border-line bg-white p-5">
            <div className="text-4xl" aria-hidden>
              {s.emoji}
            </div>
            <h2 className="mt-3 font-extrabold">
              {i + 1}. {s.title}
            </h2>
            <p className="mt-1 text-sm text-muted">{s.text}</p>
          </div>
        ))}
      </section>

      <footer className="mt-auto pt-16 text-center text-sm text-muted">
        No public profiles, no chat, no ads. Parents own every account.
      </footer>
    </main>
  );
}
