/**
 * Per-provider free-tier quotas — what limits the user is likely hitting.
 * Reference text shown alongside the provider in Settings + StatusBar tooltip.
 *
 * These are documented public limits as of late 2025. They change; we update
 * when users report mismatch with reality. Not enforced client-side — the
 * provider returns 429 when exceeded; this is just *informational*.
 */

export interface ProviderLimits {
  providerId: string;
  /** Concise one-line summary. Shown inline next to the model picker. */
  summary: string;
  /** Detailed bullets for tooltips / docs links. */
  details: string[];
  /** Whether the provider offers a free tier at all. */
  has_free_tier: boolean;
  /** Public docs URL where the user can confirm current limits. */
  docs_url: string;
}

export const PROVIDER_LIMITS: Record<string, ProviderLimits> = {
  anthropic: {
    providerId: "anthropic",
    summary: "Paid only — no free tier. $5 minimum top-up, $0/mo if unused.",
    details: [
      "Pay-as-you-go, no monthly minimum after first $5 top-up.",
      "Default tier-1 limits: 50 req/min, 40k input tokens/min for Sonnet.",
      "Higher tiers unlock automatically based on spend history.",
    ],
    has_free_tier: false,
    docs_url: "https://docs.anthropic.com/en/api/rate-limits",
  },
  openai: {
    providerId: "openai",
    summary: "Paid only — $5 minimum top-up. No free tier.",
    details: [
      "Tier-1 (≥$5 paid, <7 days old): 500 req/min for GPT-4.1 / GPT-5.",
      "Limits scale with billing history — tier-5 is 10,000 req/min.",
      "GPT-4.1-mini: cheapest paid tier, ~$0.40/M input.",
    ],
    has_free_tier: false,
    docs_url: "https://platform.openai.com/docs/guides/rate-limits",
  },
  google: {
    summary: "FREE tier · 15 req/min · 1,500 req/day · 1M tokens/min on Gemini Flash.",
    providerId: "google",
    details: [
      "Free tier (no credit card): 15 RPM, 1500 RPD, 1M TPM on Gemini 2.5 Flash.",
      "Gemini 2.5 Pro free: 5 RPM, 100 RPD, 250K TPM.",
      "429 'quota exceeded' = day or minute cap. Look at the retry-in seconds.",
      "Paid tier (with billing): 2000 RPM, no daily cap, 4M TPM.",
    ],
    has_free_tier: true,
    docs_url: "https://ai.google.dev/gemini-api/docs/rate-limits",
  },
  groq: {
    providerId: "groq",
    summary: "FREE · 30 req/min · 14,400 req/day · 6,000 tokens/min on Llama 70B.",
    details: [
      "Free tier: 30 RPM, ~14,400 RPD, 6,000 TPM on Llama 3.3 70B.",
      "Llama 3.1 8B has higher TPM (30,000) for short tasks.",
      "Mixtral 8x7B: 30 RPM but lower TPM. Avoid for long-context jobs.",
      "Hard quota — exhaust the daily cap and you wait until midnight UTC.",
    ],
    has_free_tier: true,
    docs_url: "https://console.groq.com/docs/rate-limits",
  },
  cerebras: {
    providerId: "cerebras",
    summary: "FREE · 30 req/min · 60,000 tokens/min on Llama 70B.",
    details: [
      "Free tier: 30 RPM, 60,000 TPM on Llama 3.3 70B.",
      "Fastest tokens-per-second on the market (specialized hardware).",
      "Daily-token limits not publicly published — refresh on rate-limit error.",
    ],
    has_free_tier: true,
    docs_url: "https://inference-docs.cerebras.ai/introduction",
  },
  openrouter: {
    providerId: "openrouter",
    summary: "FREE models · 20 req/min · 50/day on most :free variants.",
    details: [
      "Models tagged ':free' (Llama 3.3 70B, DeepSeek V3): 20 RPM, 50 RPD.",
      "Free-tier accounts may face additional caps based on credit balance.",
      "Paid usage routes via your OpenRouter credit — buy credits separately.",
    ],
    has_free_tier: true,
    docs_url: "https://openrouter.ai/docs/api-reference/limits",
  },
  together: {
    providerId: "together",
    summary: "Paid pay-as-you-go · select free models w/ daily quotas.",
    details: [
      "Most models pay-per-token. Cheap rates (~$0.88/M for Llama 70B).",
      "A handful of 'free' models have daily quotas — check the model card.",
      "$5 free signup credit; expires.",
    ],
    has_free_tier: false,
    docs_url: "https://docs.together.ai/docs/rate-limits",
  },
  deepseek: {
    providerId: "deepseek",
    summary: "Paid pay-as-you-go · cheapest serious reasoning model.",
    details: [
      "DeepSeek V3: ~$0.27/M input, ~$1.10/M output. No free tier.",
      "DeepSeek R1 (reasoner): ~$0.55/M input, ~$2.19/M output.",
      "Default RPM: tier-based, ~60 RPM for new accounts.",
    ],
    has_free_tier: false,
    docs_url: "https://api-docs.deepseek.com/quick_start/rate_limit",
  },
  mistral: {
    providerId: "mistral",
    summary: "Paid pay-as-you-go · €5 free credit on signup.",
    details: [
      "Mistral Large: ~$2/M input, $6/M output.",
      "Mistral Small: ~$0.20/M input, $0.60/M output — recommended cost/quality.",
      "Default 60 RPM; multilingual + JSON output is a strength.",
    ],
    has_free_tier: false,
    docs_url: "https://docs.mistral.ai/deployment/laplateforme/tier/",
  },
};

export function getProviderLimits(providerId: string | null | undefined): ProviderLimits | null {
  if (!providerId) return null;
  return PROVIDER_LIMITS[providerId] ?? null;
}
