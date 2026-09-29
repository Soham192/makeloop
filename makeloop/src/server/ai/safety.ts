// Enforced on every piece of AI text before it reaches a child — prompts alone are not trusted.

const UNSAFE = [
  /\b(knife|knives|blade|razor|scalpel|box ?cutter|hand ?saw|hacksaw|power tool)\b/i,
  /\b(fire|flame|lighter|matches|burn(ing)?|candle|torch)\b/i,
  /\b(electric(al)? outlet|socket|mains|plug it in|wall power|battery acid|lithium)\b/i,
  /\b(bleach|ammonia|gasoline|petrol|acid|explosive|firework|chemical(s)?)\b/i,
  /\b(stove|oven|boiling|microwave)\b/i,
  /\b(climb (on|onto)|stand on it|jump off|roof)\b/i,
];

const PERSONAL_INFO = [
  /\b(your|ur) (full name|last name|surname|address|school|phone|email|password|birthday|location)\b/i,
  /\bwhere do you live\b/i,
  /\bsend (me )?(a )?(photo|picture) of (you|your face)\b/i,
];

const CLINICAL = [
  /\b(adhd|autis(m|tic)|dyslexi(a|c)|disorder|diagnos(e|is|ed)|depress(ed|ion)|anxiety|therapy|iq)\b/i,
];

const OVERCONFIDENT = /\b(definitely|certainly|guaranteed|100%|for sure|perfectly)\b/gi;

export type SafetyVerdict = { ok: boolean; reason?: "unsafe" | "personal_info" | "clinical" };

export function checkText(text: string): SafetyVerdict {
  if (UNSAFE.some((r) => r.test(text))) return { ok: false, reason: "unsafe" };
  if (PERSONAL_INFO.some((r) => r.test(text))) return { ok: false, reason: "personal_info" };
  if (CLINICAL.some((r) => r.test(text))) return { ok: false, reason: "clinical" };
  return { ok: true };
}

export function cleanText(text: string, maxLen = 280): string {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function hedge(text: string): string {
  return text.replace(OVERCONFIDENT, "probably");
}

/** Returns sanitized text, or the fallback if the text fails any safety rule. */
export function safeForChild(
  text: string | undefined | null,
  fallback: string,
  opts: { hedge?: boolean; maxLen?: number } = {},
): string {
  if (!text) return fallback;
  const cleaned = cleanText(text, opts.maxLen);
  if (!cleaned || !checkText(cleaned).ok) return fallback;
  return opts.hedge ? hedge(cleaned) : cleaned;
}
