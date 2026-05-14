export interface BrandExtractionInput {
  website_content?: string;
  description: string;
  audience_notes?: string;
  reviews?: string;
  // Structured metadata pulled from the HTML head + footer anchors. When the
  // sidecar /ingest endpoint provides this, it's high-signal explicit data
  // (not inference) and the AI should treat it as authoritative.
  metadata?: {
    title?: string;
    description?: string;
    og?: Record<string, string>;
    favicon?: string;
    social_links?: Record<string, string>;
    json_ld?: unknown[];
  };
  // Fields already filled deterministically from metadata. The AI should
  // accept these verbatim and focus on the inference-heavy fields the
  // metadata couldn't produce.
  prefilled?: {
    business_name?: string;
    industry?: string;
    niche?: string;
    usp?: string;
  };
}

export function buildBrandExtractionPrompt(input: BrandExtractionInput): string {
  // Render the structured metadata block when present. This is the explicit
  // data the AI should NEVER ignore — page <title>, meta description, OG tags,
  // JSON-LD organization schema, and every social-media URL we found in the
  // page's anchors.
  const meta = input.metadata;
  const metadataBlock = meta && (meta.title || meta.description || (meta.og && Object.keys(meta.og).length) || (meta.social_links && Object.keys(meta.social_links).length) || (meta.json_ld?.length))
    ? `INPUT — STRUCTURED METADATA (extracted directly from the page <head> + footer anchors — TRUST THESE, they're not inference):
${meta.title ? `- Page <title>: ${meta.title}\n` : ""}${meta.description ? `- Meta description: ${meta.description}\n` : ""}${meta.og?.title ? `- OG title: ${meta.og.title}\n` : ""}${meta.og?.description ? `- OG description: ${meta.og.description}\n` : ""}${meta.og?.site_name ? `- OG site_name: ${meta.og.site_name}\n` : ""}${meta.favicon ? `- Favicon: ${meta.favicon}\n` : ""}${meta.social_links && Object.keys(meta.social_links).length ? `- Social links found in page:\n${Object.entries(meta.social_links).map(([k, v]) => `    ${k}: ${v}`).join("\n")}\n` : ""}${meta.json_ld?.length ? `- JSON-LD schema blocks: ${JSON.stringify(meta.json_ld).slice(0, 2000)}\n` : ""}
RULE: Whatever appears above MUST populate the matching output fields verbatim. Don't second-guess the page's own metadata — use the title for business_name when explicit, the description for niche/USP, OG tags for additional positioning, social_links for the social_links output field directly. The body content below is for everything else (audience, tone, products, content pillars, pain points).

`
    : "";

  const pf = input.prefilled;
  const prefilledBlock = pf && (pf.business_name || pf.industry || pf.niche || pf.usp)
    ? `INPUT — FIELDS ALREADY FILLED DETERMINISTICALLY (use these verbatim — they came from page metadata):
${pf.business_name ? `- business_name: ${pf.business_name}\n` : ""}${pf.industry ? `- industry: ${pf.industry}\n` : ""}${pf.niche ? `- niche: ${pf.niche}\n` : ""}${pf.usp ? `- usp: ${pf.usp}\n` : ""}
YOUR JOB: Echo these fields verbatim in your output AND focus your effort on the INFERENCE-HEAVY fields below: tone, audience_who, audience_pain_points, audience_desires, key_benefits, key_messages, products, platforms, content_pillars, personality_traits, writing_style, words_to_use, differentiators. Do NOT return empty arrays for those — infer from the content even when it's not explicit.

`
    : "";

  return `You are a senior brand strategist + direct-response copywriter with 20 years experience. Your job is to extract a COMPLETE brand intelligence profile from the content below. The user pasted this content trusting you to populate everything you can reasonably deduce — empty fields are a worse outcome than thoughtful inferences.

${prefilledBlock}${metadataBlock}INPUT — WEBSITE / LANDING CONTENT (body text, after HTML strip):
"""
${input.website_content?.trim() || "(not provided)"}
"""

INPUT — BUSINESS DESCRIPTION:
${input.description?.trim() || "(not provided)"}

INPUT — AUDIENCE NOTES:
${input.audience_notes?.trim() || "(not provided)"}

INPUT — CUSTOMER REVIEWS / TESTIMONIALS:
${input.reviews?.trim() || "(not provided)"}

═══════════════════════════════════════════════════════════════
HOW TO EXTRACT — read carefully, this is the difference between
a useful brand brain and a useless one
═══════════════════════════════════════════════════════════════

INFERENCE IS ENCOURAGED, NOT FORBIDDEN.
The content rarely says "our industry is X" or "our USP is Y" verbatim. You're a strategist — your job is to READ the content and DEDUCE what isn't spelled out. Examples of valid inferences:

- "We do Website Design, SEO, Graphic Design, Digital Marketing, E-commerce, UI/UX, Mobile App Development" → industry = "Digital agency / web development", niche = "Full-service digital agency offering web, design, marketing, and mobile app development", products = ["Website Design", "SEO Services", "Graphic Design", "Digital Marketing", "E-commerce", "UI/UX Design", "Mobile App Development"]
- "Transforming Vision into Virtual Reality: Your Digital Dream Team" + service list → usp = "Full-service digital partner that turns your business vision into a live web presence", tone = "Confident, visionary, partnership-oriented"
- "Fb. Tw. Li." in the page footer → platforms = ["Facebook", "Twitter / X", "LinkedIn"]
- A list of services for "Small businesses" + portfolio of mid-market clients → audience_who = "Small-to-mid-size businesses needing a full digital stack without juggling 5 agencies"
- "Free Consultation" CTA + "Contact us" everywhere → audience_pain_points likely include "Don't know which agency to trust", "Budget anxiety", "Past bad experiences with developers"

RULES:
1. **Always populate business_name and industry.** These are derivable from any homepage. If business_name isn't explicit, use the apparent brand name (logo text, page title, hostname). If industry isn't explicit, infer from products/services/tagline.

2. **Always populate niche (one-sentence positioning).** Combine industry + audience + key differentiator into one sentence. Never leave this blank for any real business.

3. **Always populate tone.** Read the writing style. Is it formal, playful, technical, warm, urgent, authoritative? Pick 2-4 adjectives.

4. **Populate USP whenever there's a tagline, slogan, or value statement.** Translate marketing-speak into a clear sentence. "Transforming Vision into Virtual Reality" → USP about turning ideas into real digital products.

5. **Populate audience_who if there's ANY signal.** Even "We help businesses grow" tells you "B2B, growth-stage businesses". Be specific where you can, broad where you can't, but never empty.

6. **Products / offers should be a list of every named service, product, or package.** Look at navigation, service pages, pricing tables, features lists.

7. **Platforms is for social-media presence.** Look for footer icons, "Follow us on X", links like instagram.com/X or facebook.com/X. Use canonical names: Instagram, TikTok, YouTube, LinkedIn, X, Facebook, Pinterest, Threads. Empty array only if you find ZERO social links.

8. **Content pillars are themes the brand consistently talks about.** Infer from blog topics, hero copy, repeated buzzwords, customer testimonial themes.

9. **Words to use / avoid** — extract literal words from the content into "use", and infer "avoid" from the absence of cliched corporate-speak. ("avoid" empty array is fine.)

═══════════════════════════════════════════════════════════════
HONESTY FLOOR (never crossable — different from inference):
═══════════════════════════════════════════════════════════════
- NEVER invent specific numbers, percentages, customer counts, awards, certifications, or named partnerships.
- NEVER invent specific testimonials or quotes the content doesn't have.
- "voc_phrases" must be REAL phrases from the reviews — exact wording. If no reviews provided, return [].
- Inference (deducing the obvious from explicit content) is fine and REQUIRED for tone, audience, pain points, desires, benefits, messages, products, pillars, traits, words, differentiators, objections. Fabrication (making up unverifiable specifics) is not.
- An EMPTY field on the list above is a FAILED extraction. Even when uncertain, write a reasonable inference based on the content + industry norms. Empty arrays are only acceptable for voc_phrases/voc_*_quotes/best_performing_angles/failed_angles, which require real reviews/ad data.

═══════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════
HARD MINIMUMS — empty arrays for these fields = a failed extraction:
═══════════════════════════════════════════════════════════════
- products: minimum 3 entries (infer from services mentioned, navigation, hero copy)
- platforms: list every social platform referenced anywhere — empty only if you find ZERO
- content_pillars: 4-6 recurring themes
- audience_pain_points: minimum 3 (infer from what the offer solves)
- audience_desires: minimum 3 (infer from outcome language)
- key_benefits: minimum 3 (the value the offer delivers)
- key_messages: minimum 2 (core repeatable claims)
- personality_traits: 2-4 adjectives (read the writing voice)
- words_to_use: minimum 5 (literal words from the brand's own copy)
- differentiators: minimum 2 (what they emphasize over alternatives)

Return ONLY valid JSON. No markdown fences. No prose around it. Here is the EXACT schema with example shapes — DO NOT echo the example values, fill them with this brand's specifics:

{
  "business_name": "Acme Co",
  "industry": "B2B SaaS analytics platform for ecommerce stores",
  "niche": "One-sentence positioning the brand actually uses.",
  "products": ["Core analytics dashboard", "Attribution module", "Cohort exports"],
  "platforms": ["Instagram", "LinkedIn", "YouTube"],
  "content_pillars": ["Attribution clarity", "Retention math", "Bootstrapped founder stories", "Tool teardowns"],
  "social_links": {
    "instagram": "", "tiktok": "", "youtube": "", "linkedin": "",
    "twitter": "", "facebook": "", "pinterest": "", "threads": "", "other": ""
  },
  "tone": "Confident, direct, slightly irreverent",
  "personality_traits": ["Direct", "Analytical", "Anti-fluff"],
  "writing_style": "Short punchy sentences, concrete numbers, no corporate hedging",
  "words_to_use": ["actually", "the math", "compounding", "leverage", "honest"],
  "words_to_avoid": ["synergy", "best-in-class", "world-class"],
  "audience_who": "Bootstrapped ecommerce founders doing $1M-$10M ARR who manage their own paid ads",
  "audience_pain_points": ["Can't tell which channel actually drove the sale", "Spending more on tools than the value they return", "Spreadsheet hell every Monday"],
  "audience_desires": ["A single dashboard they actually trust", "Time back from weekly reporting", "Confidence in scale-up decisions"],
  "audience_demographics": "30-45, English-speaking, US/UK/AU, technically literate",
  "usp": "The only attribution tool built by ecommerce founders for ecommerce founders.",
  "key_benefits": ["Stop double-counting revenue across channels", "Cut reporting time from 4 hours to 10 minutes", "See which ad actually drove last week's revenue"],
  "key_messages": ["Attribution that respects how customers actually buy", "Built for operators, not analysts"],
  "objections": ["Will this work with my existing stack?", "How long until we see signal?"],
  "objection_handling": ["Plugs into Shopify, GA4, Meta Ads, Klaviyo on day one — no engineering required.", "Most stores see clean attribution within 14 days of install."],
  "competitors": ["Triple Whale", "Northbeam"],
  "differentiators": ["Founder-built, not VC-built", "Flat pricing, not revenue-share"],
  "price_positioning": "Mid-market — premium to free tools, cheaper than enterprise platforms",
  "voc_phrases": [],
  "voc_pain_quotes": [],
  "voc_success_quotes": [],
  "best_performing_angles": [],
  "failed_angles": []
}

Additional rules:
- Match every entry in "objections" with a same-index rebuttal in "objection_handling".
- For audience-related fields, infer from the SHAPE of the offer + tone + price signals. A free consultation suggests price-sensitive; enterprise terminology suggests B2B mid-market; etc.
- Content pillars: 4-6 themes the brand consistently posts about. Infer from repeated topics, blog categories, About-page emphasis.
- voc_* and *_angles arrays stay empty unless the input includes real reviews or ad performance data — never fabricate quotes.
- The example above is a TEMPLATE showing the shape and quality bar. Replace every value with this specific brand's information.`;
}
