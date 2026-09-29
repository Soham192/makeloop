import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const AVATAR_EMOJI: Record<string, string> = {
  rocket: "🚀",
  robot: "🤖",
  dino: "🦕",
  owl: "🦉",
  fox: "🦊",
  whale: "🐳",
};

const variants = {
  primary: "bg-brand text-white hover:bg-brand-dark shadow-[0_4px_0_0_var(--color-brand-dark)] active:translate-y-0.5 active:shadow-none",
  secondary: "bg-white text-ink border-2 border-line hover:border-ink/30",
  ghost: "text-muted hover:text-ink hover:bg-white/60",
  mint: "bg-mint text-white hover:brightness-95 shadow-[0_4px_0_0_#07785b] active:translate-y-0.5 active:shadow-none",
} as const;

type Variant = keyof typeof variants;
const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-bold transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky";

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-[var(--radius-blob)] border-2 border-line bg-white p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function ProgressBar({ value, max = 100, color = "bg-mint" }: { value: number; max?: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-line/60" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Field({ label, error, ...props }: ComponentProps<"input"> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-ink">{label}</span>
      <input
        className="w-full rounded-2xl border-2 border-line bg-white px-4 py-3 text-base outline-none focus:border-sky"
        {...props}
      />
      {error && <span className="mt-1 block text-sm text-brand-dark">{error}</span>}
    </label>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="text-2xl font-black tracking-tight text-ink">
      MAKE<span className="text-brand">LOOP</span>
    </Link>
  );
}
