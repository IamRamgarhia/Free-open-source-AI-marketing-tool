import type { BrandBrain } from "./brand-brain";
import type { InputField } from "./generator-config";

/**
 * Auto-suggest values for generator input fields based on the active Brand Brain.
 * Matches by field-name heuristics (no AI call). Returns the suggested string or null.
 */
export function suggestFromBrain(field: InputField, brain: BrandBrain | null): string | null {
  if (!brain) return null;
  const n = field.name.toLowerCase();

  // Direct brain-field passthroughs
  if (n === "business_name" || n === "company" || n === "company_name") return brain.business_name;
  if (n === "industry" || n === "category") return brain.industry;
  if (n === "brand" || n === "brand_name") return brain.business_name;
  if (n === "usp" || n === "differentiator" || n === "our_usp" || n === "brand_promise") return brain.usp;
  if (n === "tone" || n === "voice" || n === "brand_voice" || n === "voice_notes") return brain.tone;
  if (n === "writing_style") return brain.writing_style;

  // Product / service
  if (n === "product" || n === "product_or_service" || n === "service" || n === "our_product" || n === "product_or_message" || n === "product_or_topic") return brain.business_name;

  // Audience
  if (n === "audience" || n === "audience_who" || n === "target_audience" || n === "audience_role" || n === "audience_age") return brain.audience_who;

  // Landing
  if (n === "landing_url" || n === "url" || n === "website" || n === "website_url") return brain.website_url ?? "";

  // Competitor
  if (n === "competitor_name" && brain.competitors?.length) return brain.competitors[0];
  if (n === "competitors" && brain.competitors?.length) return brain.competitors.join(", ");

  // Platforms — prefer brain.platforms; downstream forms use comma-separated.
  if (n === "platforms" || n === "platform_list" || n === "social_platforms") {
    if (brain.platforms?.length) return brain.platforms.join(", ");
  }

  // Content pillars — prefer brain.content_pillars; fall back to key_messages.
  if (n === "pillars" || n === "content_pillars" || n === "themes") {
    if (brain.content_pillars?.length) return brain.content_pillars.join(" · ");
    if (brain.key_messages?.length) return brain.key_messages.join(" · ");
  }

  // Niche — more specific than industry. Falls back to industry.
  if (n === "niche") return brain.niche || brain.industry || "";

  // Products — comma-separated.
  if (n === "products" || n === "product_list" || n === "offers") {
    if (brain.products?.length) return brain.products.join(", ");
  }

  // Per-platform social handle fields (e.g. "instagram_handle", "tiktok_url").
  const socialMatch = n.match(/^(instagram|tiktok|youtube|linkedin|twitter|facebook|pinterest|threads)(_handle|_url|_link)?$/);
  if (socialMatch && brain.social_links) {
    return (brain.social_links as any)[socialMatch[1]] || null;
  }

  // CTA preference
  if (n === "cta" || n === "preferred_cta") return ""; // intentionally empty — too brand-specific

  // Brand promise / message
  if (n === "primary_offer" && brain.key_benefits?.length) return brain.key_benefits[0];
  if (n === "title" || n === "campaign_name") return ""; // leave blank — user names campaigns

  return null;
}

/**
 * Apply smart-fill across an entire input object, only filling fields that are currently empty.
 */
export function applySmartFill<I extends Record<string, unknown>>(
  fields: InputField[],
  current: I,
  brain: BrandBrain | null
): I {
  if (!brain) return current;
  const next: any = { ...current };
  for (const f of fields) {
    const cur = String(next[f.name] ?? "").trim();
    if (cur) continue; // never overwrite what the user typed
    const suggestion = suggestFromBrain(f, brain);
    if (suggestion) next[f.name] = suggestion;
  }
  return next as I;
}
