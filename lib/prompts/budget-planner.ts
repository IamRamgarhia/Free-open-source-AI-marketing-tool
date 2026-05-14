import { getCurrencyCode } from "../currency";

export interface BudgetPlannerInput {
  total_monthly: string;
  goal: string;
  business_type: string;
  current_aov_or_ltv: string;
  current_cvr: string;
  has_organic: string;
  geo: string;
}

export function buildBudgetPlannerPrompt(input: BudgetPlannerInput): string {
  const cc = getCurrencyCode();
  return `Build a monthly ad budget plan. Be specific with amounts in ${cc} — every line must add up to the total.

INPUT:
- Currency: ${cc} (ALL amounts in the output should be in ${cc})
- Total monthly budget: ${cc} ${input.total_monthly}
- Goal: ${input.goal}
- Business type: ${input.business_type}
- Current AOV / LTV: ${input.current_aov_or_ltv}
- Current site CVR: ${input.current_cvr}
- Existing organic traffic: ${input.has_organic}
- Geo: ${input.geo}

PRODUCE:

1. PLATFORM SPLIT — % and dollar amount per platform. Justify each (must reference user's actual inputs, not generic logic).

2. FUNNEL SPLIT — within those platform amounts, how much for:
   - Awareness (cold prospecting)
   - Consideration (mid-funnel content/retargeting of engagers)
   - Conversion (hot retargeting, conversion campaigns)
   The split shifts based on goal + existing organic baseline.

3. DAILY BUDGET PER CAMPAIGN — translate monthly to daily, with the campaign-by-campaign breakout. Account for: platforms that need ≥ $X/day to exit learning phase (cite the number for each platform).

4. ESTIMATED VOLUME PROJECTION — using realistic benchmarks for ${input.business_type}:
   - Estimated impressions
   - Estimated clicks
   - Estimated conversions
   - Estimated CPA
   - Estimated revenue (if AOV given)
   - ROAS projection
   Be honest — directional only, mark assumptions.

5. BREAK-EVEN ANALYSIS:
   - What CPA does this budget need to hit to be profitable at the given AOV/LTV?
   - At what spend level does each platform stop being efficient (saturation flag)?

6. RESERVE — recommend setting aside 10-15% for: testing, scaling winners, replacing fatigued creative.

7. NO-GO LIST — what NOT to spend on at this budget level. Specific.

Return ONLY valid JSON:
{
  "platform_split": [
    { "platform": "string", "pct": 0, "monthly_usd": 0, "daily_usd": 0, "rationale": "string (cite user's inputs)" }
  ],
  "funnel_split_overall": [
    { "stage": "awareness|consideration|conversion", "pct": 0, "monthly_usd": 0 }
  ],
  "campaign_breakout": [
    { "campaign_name": "string", "platform": "string", "funnel_stage": "string", "daily_usd": 0, "monthly_usd": 0, "minimum_to_exit_learning": 0 }
  ],
  "volume_projection": {
    "impressions": 0,
    "clicks": 0,
    "conversions": 0,
    "cpa_usd": 0,
    "revenue_usd": 0,
    "roas": 0,
    "directional_note": "string"
  },
  "break_even": {
    "cpa_break_even_usd": 0,
    "saturation_flags": [{ "platform": "string", "saturates_above_usd_per_day": 0 }]
  },
  "reserve": {
    "pct": 0,
    "monthly_usd": 0,
    "uses": ["testing", "scaling winners", "creative refresh"]
  },
  "no_go_list": ["string — specific things this budget cannot do well"]
}`;
}
