"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "./api";
import { AVATAR_EMOJI, Button, Field } from "./ui";

type Child = { id: string; name: string; age: number; avatar: string };

export function ChildForm({ child, onDone }: { child?: Child; onDone?: () => void }) {
  const router = useRouter();
  const [avatar, setAvatar] = useState(child?.avatar ?? "rocket");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setBusy(true);
    setError(null);
    try {
      const body = { name: form.get("name"), age: Number(form.get("age")), avatar };
      if (child) await api(`/api/children/${child.id}`, { method: "PATCH", json: body });
      else await api("/api/children", { method: "POST", json: body });
      if (!child) formEl.reset();
      router.refresh();
      onDone?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <Field label="First name or nickname" name="name" defaultValue={child?.name} required maxLength={30} />
        <Field label="Age" name="age" type="number" min={4} max={14} defaultValue={child?.age ?? 8} required />
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-bold">Pick a buddy</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(AVATAR_EMOJI).map(([key, emoji]) => (
            <button
              type="button"
              key={key}
              onClick={() => setAvatar(key)}
              aria-pressed={avatar === key}
              aria-label={key}
              className={`grid size-12 place-items-center rounded-2xl border-2 text-2xl transition ${
                avatar === key ? "border-brand bg-rose-soft" : "border-line bg-white"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-muted">We only store a first name, age and buddy — nothing else about your child.</p>
      {error && (
        <p role="alert" className="rounded-2xl bg-rose-soft px-4 py-3 text-sm font-semibold text-brand-dark">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : child ? "Save changes" : "Add profile"}
      </Button>
    </form>
  );
}
