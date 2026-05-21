/**
 * Schema-validated LLM output.
 *
 * Why this exists: every generator today calls `llmCall` then `tryParseJson`
 * then blindly trusts whatever shape comes back. When a provider returns
 * malformed JSON (Gemini is the worst offender), or returns a string where the
 * UI expects an array, the UI either crashes or silently shows wrong data. The
 * user's #1 complaint: "no false results."
 *
 * This helper wraps a single llmCall with:
 *  1. A Zod schema that defines the expected shape.
 *  2. Tolerant JSON extraction (already in tryParseJson).
 *  3. Schema validation.
 *  4. One automatic retry: if the parse fails, we re-prompt the SAME provider
 *     with the validation errors and ask it to fix the JSON. Costs one extra
 *     LLM round-trip but eliminates almost all "model returned wrong shape"
 *     failures.
 *
 * If both attempts fail, throws a typed StructuredLlmError so the caller can
 * surface a useful message (instead of a generic "JSON parse error" or — worse
 * — rendering undefined.map() and crashing the page).
 */
import { z, type ZodTypeAny } from "zod";
import { llmCall } from "@/lib/llm";
import { tryParseJson, estimateCostUsd } from "@/lib/providers";
import type { LLMUsage, LLMMessage, Provider } from "@/lib/providers/types";

// Mirrors lib/llm.ts RunOptions — kept local because that type isn't exported.
interface BaseLlmOpts {
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  providerOverride?: Provider;
  modelOverride?: string;
  apiKeyOverride?: string;
}

export class StructuredLlmError extends Error {
  readonly raw: string;
  readonly zodIssues: z.ZodIssue[] | null;
  readonly providerId: string;
  readonly modelId: string;
  readonly attempts: number;
  constructor(opts: {
    message: string;
    raw: string;
    zodIssues: z.ZodIssue[] | null;
    providerId: string;
    modelId: string;
    attempts: number;
  }) {
    super(opts.message);
    this.name = "StructuredLlmError";
    this.raw = opts.raw;
    this.zodIssues = opts.zodIssues;
    this.providerId = opts.providerId;
    this.modelId = opts.modelId;
    this.attempts = opts.attempts;
  }
}

export interface StructuredResult<T> {
  data: T;
  raw: string;
  providerId: string;
  modelId: string;
  usage: LLMUsage | null;
  costUsd: number;
  attempts: number;
  /**
   * True when the first parse failed and we recovered via the retry round-trip.
   * The UI can use this to show a small "AI auto-corrected" badge so the user
   * knows the result is valid but came from a second attempt.
   */
  recovered: boolean;
}

interface StructuredOptions<S extends ZodTypeAny> extends BaseLlmOpts {
  /** The Zod schema the returned JSON must satisfy. */
  schema: S;
  /** Prompt to send. Should already instruct the model to reply with JSON. */
  prompt: string;
  /**
   * Optional system instruction. If omitted, a generic
   * "Reply with ONLY a JSON object matching the schema" line is prepended.
   */
  system?: string;
  /** How many total attempts (initial + retries). Default: 2. Min: 1. Max: 3. */
  maxAttempts?: number;
}

function summarizeIssues(issues: z.ZodIssue[]): string {
  return issues
    .slice(0, 8)
    .map((i) => `- ${i.path.join(".") || "<root>"}: ${i.message}`)
    .join("\n");
}

const JSON_HINT =
  "Reply with ONLY a valid JSON value matching the requested shape. " +
  "No prose, no markdown, no commentary, no code fences. " +
  "If a field is unknown, return an empty string or empty array — never invent data.";

export async function llmCallStructured<S extends ZodTypeAny>(
  opts: StructuredOptions<S>
): Promise<StructuredResult<z.infer<S>>> {
  const maxAttempts = Math.max(1, Math.min(3, opts.maxAttempts ?? 2));
  const system = opts.system ? `${opts.system}\n\n${JSON_HINT}` : JSON_HINT;
  const messages: LLMMessage[] = [{ role: "user", content: opts.prompt }];

  let lastRaw = "";
  let lastIssues: z.ZodIssue[] | null = null;
  let lastProviderId = "";
  let lastModelId = "";
  let totalCost = 0;
  let totalUsage: LLMUsage | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await llmCall({
      system,
      messages,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      signal: opts.signal,
      providerOverride: opts.providerOverride,
      modelOverride: opts.modelOverride,
      apiKeyOverride: opts.apiKeyOverride,
    });
    lastProviderId = res.providerId;
    lastModelId = res.modelId;
    if (res.usage) {
      const prevIn: number = totalUsage ? totalUsage.input_tokens : 0;
      const prevOut: number = totalUsage ? totalUsage.output_tokens : 0;
      const nextUsage: LLMUsage = {
        input_tokens: prevIn + (res.usage.input_tokens ?? 0),
        output_tokens: prevOut + (res.usage.output_tokens ?? 0),
      };
      totalUsage = nextUsage;
    }
    totalCost += estimateCostUsd(res.providerId, res.modelId, res.usage);
    lastRaw = res.text ?? "";

    const candidate = tryParseJson<unknown>(lastRaw);
    if (candidate !== null) {
      const parsed = opts.schema.safeParse(candidate);
      if (parsed.success) {
        return {
          data: parsed.data,
          raw: lastRaw,
          providerId: res.providerId,
          modelId: res.modelId,
          usage: totalUsage,
          costUsd: totalCost,
          attempts: attempt,
          recovered: attempt > 1,
        };
      }
      lastIssues = parsed.error.issues;
    } else {
      lastIssues = null;
    }

    // Build the corrective re-prompt so the next loop iteration self-heals.
    if (attempt < maxAttempts) {
      messages.push({ role: "assistant", content: lastRaw.slice(0, 8000) });
      const fixHint = lastIssues
        ? `Your previous reply did not match the required JSON shape. Fix these issues and return ONLY the corrected JSON:\n\n${summarizeIssues(
            lastIssues
          )}`
        : "Your previous reply was not valid JSON. Return ONLY a valid JSON value matching the requested shape — no prose, no markdown, no code fences.";
      messages.push({ role: "user", content: fixHint });
    }
  }

  throw new StructuredLlmError({
    message: lastIssues
      ? `Model returned a shape that does not match the schema after ${maxAttempts} attempts.`
      : `Model returned non-JSON after ${maxAttempts} attempts.`,
    raw: lastRaw,
    zodIssues: lastIssues,
    providerId: lastProviderId,
    modelId: lastModelId,
    attempts: maxAttempts,
  });
}

/**
 * Lightweight one-shot validator for cases where the caller already has a
 * raw LLM response in hand (e.g. legacy streaming code paths). Returns
 * { ok: true, data } or { ok: false, issues } — never throws.
 */
export function validateLlmJson<S extends ZodTypeAny>(
  raw: string,
  schema: S
): { ok: true; data: z.infer<S> } | { ok: false; issues: z.ZodIssue[] | null; raw: string } {
  const candidate = tryParseJson<unknown>(raw);
  if (candidate === null) return { ok: false, issues: null, raw };
  const parsed = schema.safeParse(candidate);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, issues: parsed.error.issues, raw };
}
