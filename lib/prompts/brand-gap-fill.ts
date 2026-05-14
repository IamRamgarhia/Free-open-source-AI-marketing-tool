/**
 * Second-pass prompt for filling fields the first extraction left empty.
 *
 * The first AI pass is general-purpose — schema, honesty floor, every field.
 * Gemini Flash and other lighter models often return many inference fields
 * blank under that prompt because the honesty constraints make them risk-averse.
 *
 * This pass is narrow: takes the known facts about the brand + the raw website
 * content, lists exactly which fields are empty, and asks the model to infer
 * them. No schema confusion, no honesty floor for non-fabricable fields, just:
 * "you know X, Y, Z about this business — what's the tone, audience, etc."
 */

export interface BrandGapFillInput {
  business_name: string;
  industry?: string;
  niche?: string;
  usp?: string;
  website_content?: string;
  /** Names of fields that came back empty from the first pass. */
  missing_fields: string[];
}

const FIELD_GUIDANCE: Record<string, string> = {
  tone: '2-4 adjectives describing the brand\'s voice (e.g. "Confident, direct, slightly irreverent"). Read the writing style and pick.',
  personality_traits: 'Array of 2-4 adjectives. Examples: ["Direct", "Analytical", "Anti-fluff"].',
  writing_style: 'One sentence describing sentence length, vocabulary, and structure (e.g. "Short punchy sentences, concrete numbers, no corporate hedging").',
  audience_who: 'One sentence describing the ideal customer (e.g. "Bootstrapped ecommerce founders doing $1M-$10M ARR who manage their own paid ads"). Infer from offer shape, price signals, terminology, hero copy.',
  audience_pain_points: 'Array of 3-5 problems this audience has. Infer from what the offer solves. Examples: ["Can\'t tell which channel drove the sale", "Spreadsheet hell every Monday"].',
  audience_desires: 'Array of 3-5 outcomes this audience wants. Infer from outcome language in the copy. Examples: ["A single dashboard they trust", "Time back from weekly reporting"].',
  audience_demographics: 'One sentence: age range, geography, language, technical sophistication. Infer reasonably even if not stated.',
  products: 'Array of 3+ products/services/offers. Pull from navigation, hero, services list, pricing tables.',
  platforms: 'Array of social platforms the brand uses. Canonical names: Instagram, TikTok, YouTube, LinkedIn, X / Twitter, Facebook, Pinterest, Threads. Empty only if you find ZERO social presence.',
  content_pillars: 'Array of 4-6 recurring themes the brand talks about. Infer from blog topics, About emphasis, repeated phrases.',
  key_benefits: 'Array of 3-5 concrete benefits the offer delivers. What changes for the customer? Examples: ["Cut reporting time from 4 hours to 10 minutes"].',
  key_messages: 'Array of 2-4 core repeatable claims the brand makes. The "north stars" of their copy.',
  words_to_use: 'Array of 5+ literal words the brand uses in its own copy. Pull from the website content.',
  words_to_avoid: 'Array of words this brand would NOT use (corporate fluff they avoid). 0-5 entries — empty is fine if uncertain.',
  competitors: 'Array of 1-3 likely competitors. Infer from industry + positioning. Use generic competitor names if unsure (e.g. "Other web design agencies in Punjab", "DIY website builders").',
  differentiators: 'Array of 2-4 things this brand emphasizes over alternatives. From hero copy, About page, "Why us" sections.',
  price_positioning: 'One short phrase: budget / mid-market / premium / enterprise, with one-line reasoning.',
  objections: 'Array of 3-5 likely customer objections (questions/doubts before buying). Infer from FAQ pages, About emphasis, addressed concerns.',
  objection_handling: 'Same-indexed array of rebuttals. Index 0 rebuts objection 0, etc.',
};

export function buildBrandGapFillPrompt(input: BrandGapFillInput): string {
  const ctx = [
    input.business_name ? `Business: ${input.business_name}` : "",
    input.industry ? `Industry: ${input.industry}` : "",
    input.niche ? `Positioning: ${input.niche}` : "",
    input.usp ? `USP: ${input.usp}` : "",
  ].filter(Boolean).join("\n");

  const fieldList = input.missing_fields
    .map((f) => `  "${f}": ${JSON.stringify(FIELD_GUIDANCE[f] ?? "Fill based on the content.")}`)
    .join(",\n");

  return `You are a senior brand strategist. You already know these facts about a brand:

${ctx}

WEBSITE CONTENT (raw, partial):
"""
${(input.website_content ?? "").slice(0, 12000)}
"""

A previous extraction pass left the following fields EMPTY. Your job is to fill them by READING the website content and INFERRING reasonable values. Inference is the entire point — these fields are rarely stated verbatim. Use the business, industry, positioning, and USP above as anchors.

REQUIRED — fill EVERY field below. Do NOT return empty values. If you genuinely cannot find signal in the content, make a reasonable, conservative inference based on what brands in this industry typically have.

Return ONLY a valid JSON object with EXACTLY these keys (no markdown fences, no prose):
{
${fieldList}
}

Rules:
- Replace each value above with the ACTUAL inferred content (not the description).
- Arrays must have entries — empty arrays count as failure.
- Strings must be non-empty.
- Match objections to objection_handling by array index.
- Never invent specific numbers, named customers, awards, or testimonials. Inference about traits and audience is fine and required.`;
}
