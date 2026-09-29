"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/api";
import { Button, Card, Field, Logo } from "@/components/ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(`/api/auth/${mode}`, { method: "POST", json: form });
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const isLogin = mode === "login";
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <Logo />
      </div>
      <Card>
        <h1 className="text-2xl font-black">{isLogin ? "Welcome back" : "Create a parent account"}</h1>
        <p className="mt-1 text-sm text-muted">
          {isLogin ? "Log in to manage your young makers." : "You'll add your child's profile next. Kids never need an email."}
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {!isLogin && <Field label="Your name" name="name" autoComplete="name" required maxLength={80} />}
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            minLength={isLogin ? undefined : 8}
            required
          />
          {error && (
            <p role="alert" className="rounded-2xl bg-rose-soft px-4 py-3 text-sm font-semibold text-brand-dark">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "One moment…" : isLogin ? "Log in" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {isLogin ? "New here? " : "Already have an account? "}
          <Link href={isLogin ? "/register" : "/login"} className="font-bold text-sky underline">
            {isLogin ? "Create an account" : "Log in"}
          </Link>
        </p>
      </Card>
    </main>
  );
}
