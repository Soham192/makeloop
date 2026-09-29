import { ProgressBar } from "./ui";

type Skill = { slug: string; name: string; emoji: string; points: number };
type Achievement = { code: string; title: string; emoji: string; description: string; earned: boolean };

const LEVEL_SIZE = 30;

export function SkillList({ skills }: { skills: Skill[] }) {
  return (
    <ul className="space-y-3">
      {skills.map((s) => {
        const level = Math.floor(s.points / LEVEL_SIZE) + 1;
        return (
          <li key={s.slug}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-bold">
                <span aria-hidden>{s.emoji}</span> {s.name}
              </span>
              <span className="text-muted">
                Level {level} · {s.points} pts
              </span>
            </div>
            <ProgressBar value={s.points % LEVEL_SIZE} max={LEVEL_SIZE} />
          </li>
        );
      })}
    </ul>
  );
}

export function AchievementGrid({ achievements }: { achievements: Achievement[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {achievements.map((a) => (
        <li
          key={a.code}
          className={`rounded-2xl border-2 p-3 text-center ${a.earned ? "border-sun bg-sun-soft" : "border-dashed border-line opacity-60"}`}
          title={a.description}
        >
          <div className={`text-3xl ${a.earned ? "" : "grayscale"}`} aria-hidden>
            {a.emoji}
          </div>
          <div className="mt-1 text-sm font-extrabold">{a.title}</div>
          <div className="text-xs text-muted">{a.earned ? a.description : "Locked"}</div>
        </li>
      ))}
    </ul>
  );
}

const RESULT_LABEL: Record<string, { text: string; cls: string }> = {
  SUCCESS: { text: "Completed", cls: "bg-mint-soft text-mint" },
  PARTIAL: { text: "Getting there", cls: "bg-sun-soft text-ink" },
  NEEDS_WORK: { text: "Keep going", cls: "bg-sky-soft text-sky" },
  UNCLEAR: { text: "Photo unclear", cls: "bg-line/60 text-muted" },
};

export function ResultBadge({ result, status }: { result: string | null; status?: string }) {
  if (!result) {
    const text = status === "AI_FAILED" ? "Saved — waiting for feedback" : "Waiting for feedback";
    return <span className="rounded-full bg-line/60 px-2 py-0.5 text-xs font-bold text-muted">{text}</span>;
  }
  const r = RESULT_LABEL[result] ?? RESULT_LABEL.UNCLEAR;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.cls}`}>{r.text}</span>;
}
