"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Hint } from "@/shared/ai";
import type { AttemptDto } from "@/server/attempts";
import { api, ApiError } from "@/components/api";
import { preparePhoto, type PreparedPhoto } from "@/components/photo";
import { ResultBadge } from "@/components/progress";
import { Button, ButtonLink, Card, ProgressBar } from "@/components/ui";

type Mission = {
  id: string;
  title: string;
  emoji: string;
  summary: string;
  objective: string;
  requirements: string[];
  concept: string;
  safetyNotes: string | null;
  materials: { name: string; emoji: string; quantity: string }[];
};

type Unlocked = { code: string; title: string; emoji: string };
type EvaluateResponse = { attempt: AttemptDto; achievements: Unlocked[]; missionCompleted: boolean };
type Stage = "brief" | "build" | "checking" | "feedback";

const CHECKING_MESSAGES = [
  "Looking closely at your build…",
  "Checking the mission goals…",
  "Thinking of something helpful to say…",
  "Almost there…",
];

const HINT_LABEL: Record<number, string> = { 1: "Think about it", 2: "The big idea", 3: "Try this" };

export function MissionFlow({
  child,
  mission,
  initialAttempts,
}: {
  child: { id: string; name: string };
  mission: Mission;
  initialAttempts: AttemptDto[];
}) {
  const [attempts, setAttempts] = useState(initialAttempts);
  const latest = attempts.at(-1) ?? null;
  const [stage, setStage] = useState<Stage>(latest ? (latest.status === "EVALUATED" ? "feedback" : "build") : "brief");
  const [celebrate, setCelebrate] = useState<{ achievements: Unlocked[]; completed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function upsertAttempt(a: AttemptDto) {
    setAttempts((prev) => {
      const i = prev.findIndex((p) => p.id === a.id);
      if (i === -1) return [...prev, a];
      const copy = [...prev];
      copy[i] = a;
      return copy;
    });
  }

  async function start() {
    setError(null);
    try {
      await api(`/api/missions/${mission.id}/start`, { method: "POST", json: { childId: child.id } });
    } catch {
      // Starting is just a tracking step — never block the child on it.
    }
    setStage("build");
  }

  async function evaluate(attemptId: string) {
    setStage("checking");
    setError(null);
    try {
      const res = await api<EvaluateResponse>("/api/ai/evaluate-build", { method: "POST", json: { attemptId } });
      upsertAttempt(res.attempt);
      if (res.achievements.length || res.missionCompleted) {
        setCelebrate({ achievements: res.achievements, completed: res.missionCompleted });
      }
      setStage("feedback");
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setAttempts((prev) => prev.map((p) => (p.id === attemptId ? { ...p, status: "AI_FAILED" } : p)));
      setError(
        status === 503 || status === 0
          ? "Your invention is saved! Our feedback helper is taking a short break. Try again in a moment."
          : (err as Error).message,
      );
      setStage("build");
    }
  }

  async function submit(photo: PreparedPhoto) {
    setStage("checking");
    setError(null);
    const form = new FormData();
    form.set("childId", child.id);
    form.set("image", photo.blob, "build.jpg");
    let attempt: AttemptDto;
    try {
      ({ attempt } = await api<{ attempt: AttemptDto }>(`/api/missions/${mission.id}/attempts`, { method: "POST", body: form }));
    } catch (err) {
      setError((err as Error).message);
      setStage("build");
      throw err;
    }
    upsertAttempt(attempt);
    await evaluate(attempt.id);
  }

  const pending = latest && latest.status !== "EVALUATED" ? latest : null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <Link href={`/play/${child.id}`} className="text-sm font-bold text-sky">
        ← All missions
      </Link>

      <header className="mt-4 flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-sky-soft text-4xl" aria-hidden>
          {mission.emoji}
        </span>
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">{mission.title}</h1>
          <p className="text-muted">{mission.summary}</p>
        </div>
      </header>

      {celebrate && <Celebration {...celebrate} onClose={() => setCelebrate(null)} childId={child.id} />}

      {error && (
        <p role="alert" className="mt-6 rounded-2xl bg-sun-soft px-4 py-3 font-semibold">
          {error}
        </p>
      )}

      {stage === "brief" && <Brief mission={mission} childId={child.id} onStart={start} />}

      {stage === "build" && (
        <>
          {pending?.status === "AI_FAILED" && (
            <Card className="mt-6 border-sun">
              <p className="font-bold">Your build from try #{pending.attemptNumber} is saved.</p>
              <Button className="mt-3" variant="mint" onClick={() => evaluate(pending.id)}>
                Get my feedback now
              </Button>
            </Card>
          )}
          <BuildStep mission={mission} attemptNumber={(latest?.attemptNumber ?? 0) + 1} onSubmit={submit} />
        </>
      )}

      {stage === "checking" && <Checking />}

      {stage === "feedback" && latest && (
        <>
          <FeedbackCard attempt={latest} />
          <Hints attempt={latest} onUpdate={upsertAttempt} />
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => setStage("build")}>
              {latest.feedback?.retakePhoto ? "📸 Take another photo" : latest.result === "SUCCESS" ? "🔁 Make it even better" : "🔁 Improve and try again"}
            </Button>
            <Explain missionId={mission.id} childId={child.id} concept={mission.concept} />
          </div>
        </>
      )}

      {attempts.length > 0 && stage !== "checking" && <History attempts={attempts} />}
    </main>
  );
}

function Brief({ mission, childId, onStart }: { mission: Mission; childId: string; onStart: () => void }) {
  const [have, setHave] = useState<Set<string>>(new Set());
  return (
    <div className="mt-6 space-y-4">
      <Card>
        <h2 className="text-lg font-extrabold">🎯 Your mission</h2>
        <p className="mt-2 text-lg">{mission.objective}</p>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {mission.requirements.map((r) => (
            <li key={r}>✔︎ {r}</li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="text-lg font-extrabold">🧰 Gather your materials</h2>
        <p className="text-sm text-muted">Tap each one when you have it.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {mission.materials.map((m) => {
            const got = have.has(m.name);
            return (
              <li key={m.name}>
                <button
                  type="button"
                  aria-pressed={got}
                  onClick={() =>
                    setHave((s) => {
                      const n = new Set(s);
                      if (got) n.delete(m.name);
                      else n.add(m.name);
                      return n;
                    })
                  }
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-2 text-left transition ${
                    got ? "border-mint bg-mint-soft" : "border-line bg-white"
                  }`}
                >
                  <span className="text-2xl" aria-hidden>
                    {m.emoji}
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold">{m.name}</span>
                    <span className="text-xs text-muted">{m.quantity}</span>
                  </span>
                  <span aria-hidden>{got ? "✅" : "⬜"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
      {mission.safetyNotes && (
        <p className="rounded-2xl bg-rose-soft px-4 py-3 text-sm">
          <span className="font-extrabold">🦺 Safety first:</span> {mission.safetyNotes}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={onStart}>🚀 Start mission</Button>
        <Explain missionId={mission.id} childId={childId} concept={mission.concept} />
      </div>
    </div>
  );
}

function BuildStep({
  mission,
  attemptNumber,
  onSubmit,
}: {
  mission: Mission;
  attemptNumber: number;
  onSubmit: (p: PreparedPhoto) => Promise<void>;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.previewUrl);
  }, [photo]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setBusy(true);
    try {
      setPhoto(await preparePhoto(file));
    } catch (err) {
      setPhotoError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!photo) return;
    setBusy(true);
    try {
      await onSubmit(photo);
    } catch {
      // Error is shown by the parent; keep the photo so nothing is lost.
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6">
      <h2 className="text-lg font-extrabold">🛠️ Build it! {attemptNumber > 1 && `(try #${attemptNumber})`}</h2>
      <p className="mt-1 text-muted">{mission.objective}</p>
      <p className="mt-3 text-sm">When you&apos;re ready, take a photo of your whole build in good light.</p>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
      <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} />

      {photo ? (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.previewUrl} alt="Your build" className="max-h-80 w-full rounded-2xl bg-cream object-contain" />
          {photo.blurry && (
            <p className="mt-3 rounded-2xl bg-sun-soft px-4 py-3 text-sm font-semibold">
              This photo looks a bit blurry. Hold still and try again — or use it anyway.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="mint" onClick={send} disabled={busy}>
              ✨ Get feedback
            </Button>
            <Button variant="secondary" onClick={() => cameraRef.current?.click()} disabled={busy}>
              Retake
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => cameraRef.current?.click()} disabled={busy}>
            📸 Take a photo
          </Button>
          <Button variant="secondary" onClick={() => uploadRef.current?.click()} disabled={busy}>
            🖼️ Upload a photo
          </Button>
        </div>
      )}
      {photoError && (
        <p role="alert" className="mt-3 rounded-2xl bg-rose-soft px-4 py-3 text-sm font-semibold text-brand-dark">
          {photoError} Camera not working? Use “Upload a photo” instead.
        </p>
      )}
    </Card>
  );
}

function Checking() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, CHECKING_MESSAGES.length - 1)), 3500);
    return () => clearInterval(t);
  }, []);
  return (
    <Card className="mt-6 text-center" >
      <div className="animate-wobble text-6xl" aria-hidden>
        🔍
      </div>
      <p className="mt-4 text-lg font-extrabold" role="status" aria-live="polite">
        {CHECKING_MESSAGES[i]}
      </p>
      <p className="mt-1 text-sm text-muted">This usually takes a few seconds.</p>
    </Card>
  );
}

function FeedbackCard({ attempt }: { attempt: AttemptDto }) {
  const f = attempt.feedback;
  if (!f) return null;
  return (
    <Card className="mt-6 animate-pop">
      <div className="flex flex-wrap items-center gap-2">
        <ResultBadge result={attempt.result} />
        {f.improved && <span className="rounded-full bg-mint-soft px-2 py-0.5 text-xs font-bold text-mint">📈 Improved!</span>}
        {f.source === "demo" && (
          <span className="rounded-full bg-line/60 px-2 py-0.5 text-xs font-bold text-muted" title="Feedback from demo mode">
            Demo mode
          </span>
        )}
        <span className="ml-auto text-sm text-muted">Try #{attempt.attemptNumber}</span>
      </div>
      <h2 className="mt-3 text-2xl font-black">{f.headline}</h2>
      <p className="mt-1">{f.praise}</p>
      {attempt.score !== null && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm font-bold">
            <span>Mission goals reached</span>
            <span>{attempt.score}%</span>
          </div>
          <ProgressBar value={attempt.score} />
        </div>
      )}
      {f.observations.length > 0 && (
        <div className="mt-4">
          <h3 className="font-extrabold">👀 What I noticed</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {f.observations.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 rounded-2xl bg-sky-soft px-4 py-3">
        <h3 className="font-extrabold">➡️ Next step</h3>
        <p className="mt-1">{f.nextStep}</p>
      </div>
      <p className="mt-3 text-xs text-muted">I can only see a photo, so I might miss things. Testing your build for real is the best check!</p>
    </Card>
  );
}

function Hints({ attempt, onUpdate }: { attempt: AttemptDto; onUpdate: (a: AttemptDto) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxed = attempt.hintLevel >= 3;

  async function ask() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ hint: Hint; hintLevel: number }>("/api/ai/hint", { method: "POST", json: { attemptId: attempt.id } });
      onUpdate({ ...attempt, hintLevel: res.hintLevel, hints: [...attempt.hints, res.hint] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">💡 Hints</h2>
        <Button variant="secondary" onClick={ask} disabled={busy || maxed}>
          {busy ? "Thinking…" : maxed ? "All hints used" : attempt.hints.length ? "I need another hint" : "I need a hint"}
        </Button>
      </div>
      {attempt.hints.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Stuck? Hints start small and get bigger each time you ask.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {attempt.hints.map((h, i) => (
            <li key={i} className="animate-pop rounded-2xl bg-sun-soft px-4 py-3">
              <span className="text-xs font-extrabold uppercase tracking-wide text-muted">
                Hint {h.level} · {HINT_LABEL[h.level]}
              </span>
              <p className="mt-1">{h.text}</p>
            </li>
          ))}
        </ol>
      )}
      {error && <p className="mt-2 text-sm font-semibold text-brand-dark">{error}</p>}
    </Card>
  );
}

function Explain({ missionId, childId, concept }: { missionId: string; childId: string; concept: string }) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (text) {
      setText(null);
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ explanation: string }>("/api/ai/explain", { method: "POST", json: { missionId, childId } });
      setText(res.explanation);
    } catch (err) {
      setText((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <Button variant="ghost" onClick={load} disabled={busy} aria-expanded={!!text}>
        🔬 {busy ? "Loading…" : text ? "Hide the science" : "Learn the science"}
      </Button>
      {text && (
        <Card className="mt-2 animate-pop bg-mint-soft">
          <h3 className="font-extrabold">{concept}</h3>
          <p className="mt-1">{text}</p>
        </Card>
      )}
    </div>
  );
}

function History({ attempts }: { attempts: AttemptDto[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-extrabold">📚 Your tries</h2>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2">
        {[...attempts].reverse().map((a) => (
          <li key={a.id} className="flex gap-3 rounded-2xl border-2 border-line bg-white p-3">
            {a.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.imageUrl} alt={`Try #${a.attemptNumber}`} className="size-20 shrink-0 rounded-xl bg-cream object-cover" />
            ) : (
              <div className="grid size-20 shrink-0 place-items-center rounded-xl bg-cream text-2xl" aria-hidden>
                🖼️
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold">Try #{a.attemptNumber}</span>
                <ResultBadge result={a.result} status={a.status} />
              </div>
              {a.score !== null && (
                <div className="mt-2">
                  <ProgressBar value={a.score} />
                  <span className="text-xs text-muted">{a.score}% of goals</span>
                </div>
              )}
              {a.feedback && <p className="mt-1 truncate text-sm text-muted">{a.feedback.headline}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Celebration({
  achievements,
  completed,
  onClose,
  childId,
}: {
  achievements: Unlocked[];
  completed: boolean;
  onClose: () => void;
  childId: string;
}) {
  return (
    <div role="status" className="mt-6 animate-pop rounded-[var(--radius-blob)] border-2 border-sun bg-sun-soft p-5 text-center">
      <div className="text-5xl" aria-hidden>
        🎉
      </div>
      {completed && <p className="mt-2 text-2xl font-black">Mission complete!</p>}
      {achievements.length > 0 && (
        <div className="mt-2">
          <p className="font-bold">New badge{achievements.length > 1 ? "s" : ""} unlocked:</p>
          <p className="mt-1 text-lg">
            {achievements.map((a) => (
              <span key={a.code} className="mx-2 inline-block">
                {a.emoji} {a.title}
              </span>
            ))}
          </p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={onClose}>
          Keep going
        </Button>
        {completed && <ButtonLink href={`/play/${childId}`}>Pick a new mission</ButtonLink>}
      </div>
    </div>
  );
}
