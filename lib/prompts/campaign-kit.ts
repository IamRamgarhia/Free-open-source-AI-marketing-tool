export interface CampaignKitInput {
  campaign_name: string;
  product: string;
  primary_offer: string;
  audience: string;
  goal: string;
  budget_monthly: string;
}

import { BANNED_WORDS_RULE, HONESTY_CLAUSE } from "./common-rules";

export function buildCampaignKitPrompt(input: CampaignKitInput): string {
  return `Generate a complete multi-platform campaign kit for: ${input.campaign_name}

${BANNED_WORDS_RULE}

${HONESTY_CLAUSE}

ALL OUTPUT MUST BE MESSAGE-MATCHED to ONE central USP/promise. Variants per platform — but all anchored to the same hook.

CASCADE RULE (Copycat / marketingskills pattern): START at the tightest constraint (Google headline 30 chars) and expand outward. Never start at long-form first.

INPUT:
- Product / service: ${input.product}
- Primary offer: ${input.primary_offer}
- Audience: ${input.audience}
- Goal: ${input.goal}
- Monthly budget: ${input.budget_monthly}

GENERATE — one bundle covering all surfaces:

1. The MASTER HOOK (one sentence, ≤ 90 chars). This is the anchor every platform variant must echo.

2. GOOGLE RSA: 5 headlines (≤ 30), 2 descriptions (≤ 90).

3. META FEED: 3 primary text variants (≤ 125 above-fold), 3 headlines (≤ 40), 1 CTA button.

4. TIKTOK: 5 hooks (≤ 12 words each) + 1 UGC creator brief (4–6 sentences).

5. YOUTUBE IN-STREAM: 15-second script (hook, value, CTA).

6. LINKEDIN: 1 sponsored content post (intro ≤ 150, headline ≤ 70).

7. TWITTER/X: 3 tweets (≤ 280 each).

8. EMAIL SUBJECT LINES (5): paired send for retargeting list.

9. LANDING PAGE HERO COPY: H1 (≤ 60), subhead (≤ 140), 3 bullet benefits, CTA button text.

10. BUDGET ALLOCATION recommendation based on goal + budget — % split across Google / Meta / TikTok / LinkedIn / YouTube. Justify each %.

11. KPI TARGETS — 3 numeric goals to hit in month 1.

Return ONLY valid JSON:
{
  "master_hook": "string",
  "master_usp": "string",
  "google_rsa": { "headlines": ["string"], "descriptions": ["string"] },
  "meta_feed": { "primary_text": ["string"], "headlines": ["string"], "cta": "string" },
  "tiktok": { "hooks": ["string"], "ugc_brief": "string" },
  "youtube_in_stream": {
    "hook": { "t": "0-3s", "vo": "string", "visual": "string" },
    "value": { "t": "3-12s", "vo": "string", "visual": "string" },
    "cta": { "t": "12-15s", "vo": "string", "visual": "string" }
  },
  "linkedin": { "intro": "string", "headline": "string" },
  "twitter": ["string"],
  "email_subjects": ["string"],
  "landing_hero": { "h1": "string", "subhead": "string", "bullets": ["string"], "cta_button": "string" },
  "budget_split": [
    { "platform": "Google", "pct": 0, "rationale": "string" }
  ],
  "kpi_targets": [
    { "metric": "string", "target": "string", "by_when": "string" }
  ]
}`;
}
