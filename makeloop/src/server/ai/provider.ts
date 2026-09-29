// Provider-agnostic: any OpenAI-compatible /chat/completions endpoint, configured only via env.

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string | ContentPart[] };

export function aiEnabled() {
  return process.env.DEMO_MODE !== "true" && !!process.env.LLM_API_KEY && !!process.env.LLM_MODEL;
}

export class AiUnavailableError extends Error {}

export async function chat(
  messages: ChatMessage[],
  opts: { vision?: boolean; json?: boolean; maxTokens?: number; timeoutMs?: number } = {},
): Promise<string> {
  const base = (process.env.LLM_API_BASE ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = opts.vision ? (process.env.VISION_MODEL || process.env.LLM_MODEL) : process.env.LLM_MODEL;
  const key = opts.vision ? (process.env.VISION_API_KEY || process.env.LLM_API_KEY) : process.env.LLM_API_KEY;
  if (!key || !model) throw new AiUnavailableError("AI provider not configured");

  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens ?? 600,
        temperature: 0.3,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 13_000),
    });
  } catch (err) {
    throw new AiUnavailableError(`AI request failed: ${(err as Error).message}`);
  }
  if (!res.ok) throw new AiUnavailableError(`AI provider returned ${res.status}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new AiUnavailableError("AI provider returned an empty response");
  return text;
}

export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new AiUnavailableError("AI response was not JSON");
  return JSON.parse(text.slice(start, end + 1));
}
