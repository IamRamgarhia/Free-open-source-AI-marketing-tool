/**
 * Zod schema for the /optimize/creative-score generator. Wired into
 * GeneratorShell via `config.schema` so a wrong-shape reply triggers a
 * single corrective retry instead of crashing the renderer.
 *
 * Be lenient where the renderer is lenient — e.g. the renderer already
 * checks `json?.scores ? ... : null`, so `scores` is optional. Only require
 * the fields the UI ACTUALLY reads to avoid spurious retries.
 */
import { z } from "zod";

const LeverScore = z.object({
  score: z.number(),
  reason: z.string(),
});

const Fix = z.object({
  lever: z.string(),
  exact_phrase_to_change: z.string(),
  replacement: z.string(),
  expected_lift: z.string(),
});

export const CreativeScoreSchema = z
  .object({
    overall_score: z.number(),
    tier: z.enum(["scale", "iterate", "rewrite", "kill"]),
    scores: z
      .object({
        hook_strength: LeverScore,
        specificity: LeverScore,
        urgency: LeverScore,
        brand_fit: LeverScore,
        conversion_potential: LeverScore,
      })
      .partial()
      .optional(),
    top_3_fixes: z.array(Fix).max(5).optional(),
    predicted_ctr_band: z.string().optional(),
    honest_verdict: z.string().optional(),
  })
  .passthrough();
