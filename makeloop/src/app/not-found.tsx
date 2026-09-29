import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="text-6xl" aria-hidden>
        🧭
      </div>
      <h1 className="mt-4 text-2xl font-black">We couldn&apos;t find that</h1>
      <p className="mt-2 text-muted">It may have moved, or it belongs to a different account.</p>
      <ButtonLink href="/dashboard" className="mt-6">
        Back home
      </ButtonLink>
    </main>
  );
}
