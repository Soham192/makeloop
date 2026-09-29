"use client";

import { Button, ButtonLink } from "@/components/ui";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="text-6xl" aria-hidden>
        🧰
      </div>
      <h1 className="mt-4 text-2xl font-black">Oops, something wobbled</h1>
      <p className="mt-2 text-muted">Don&apos;t worry — your builds are saved. Let&apos;s try that again.</p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/dashboard" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </main>
  );
}
