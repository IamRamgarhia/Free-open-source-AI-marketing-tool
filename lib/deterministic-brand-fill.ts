import type { BrandBrain } from "./brand-brain";
import type { IngestMetadata } from "./url-ingest";

/**
 * Pull every field we can from raw page metadata WITHOUT calling the AI.
 *
 * The AI is unreliable for things metadata already states explicitly. Pages
 * put their brand name in <title> + OG site_name. Their positioning in
 * <meta description>. Their address + email + logo in JSON-LD organization
 * schema. None of that needs inference — it's already structured.
 *
 * This runs BEFORE the AI extraction. The AI then handles the inference-
 * heavy fields (tone, audience pain points, products list, content pillars)
 * with the pre-filled fields as anchor context.
 *
 * Returns a partial BrandBrain — only the fields it could derive. Caller
 * merges over the empty-brain defaults.
 */
export function deterministicFillFromMetadata(meta: IngestMetadata | undefined, fallbackUrl: string): Partial<BrandBrain> {
  if (!meta) return {};
  const out: Partial<BrandBrain> = {};

  // 1. Business name — OG site_name beats <title>, both beat hostname.
  //    <title> usually has the format "Real Name | Tagline" or "Tagline - Real Name".
  //    Split on common separators and pick the shortest non-tagline chunk.
  let bizName = meta.og?.site_name?.trim() || "";
  if (!bizName && meta.title) {
    // "Web Design, SEO & Digital Marketing Agency in Punjab | Dice Codes" → "Dice Codes"
    // "Acme — Premium Coffee" → "Acme"
    // Heuristic: the chunk that's SHORTEST after splitting is usually the brand name.
    const cleaned = decodeEntities(meta.title);
    const parts = cleaned.split(/\s+[|\-–—·:]\s+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      // Pick the shortest part that's at least 2 chars and not a generic word.
      const ranked = parts
        .filter((p) => p.length >= 2 && !/^(home|welcome|index)$/i.test(p))
        .sort((a, b) => a.length - b.length);
      bizName = ranked[0] ?? parts[0] ?? cleaned;
    } else {
      bizName = cleaned;
    }
  }
  if (!bizName && fallbackUrl) {
    try { bizName = new URL(fallbackUrl).hostname.replace(/^www\./i, ""); } catch {}
  }
  if (bizName) {
    out.business_name = bizName;
    out.name = bizName;
  }

  // 2. JSON-LD Organization — most authoritative source. Extract whatever's there.
  const orgs = (meta.json_ld ?? []).flatMap((ld) => extractOrganizations(ld));
  const primaryOrg = orgs[0];
  if (primaryOrg) {
    if (primaryOrg.name && (!out.business_name || out.business_name.length > 60)) {
      out.business_name = primaryOrg.name;
      out.name = primaryOrg.name;
    }
    if (primaryOrg.logo) out.favicon_url = out.favicon_url || primaryOrg.logo;
    if (primaryOrg.address) {
      // Address into audience_demographics as a starting point.
      out.audience_demographics = primaryOrg.address;
    }
  }

  // 3. Niche — meta description IS a one-sentence positioning. Use it directly.
  const desc = decodeEntities(meta.description || meta.og?.description || "").trim();
  if (desc) {
    out.niche = desc;
  }

  // 4. Industry — extracted from the <title> by removing the brand part.
  //    "Web Design, SEO & Digital Marketing Agency in Punjab | Dice Codes"
  //    minus "Dice Codes" → "Web Design, SEO & Digital Marketing Agency in Punjab"
  if (meta.title && out.business_name) {
    const cleaned = decodeEntities(meta.title);
    const minusBrand = cleaned
      .replace(new RegExp(`\\s*[|\\-–—·:]\\s*${escapeRegex(out.business_name)}\\s*$`, "i"), "")
      .replace(new RegExp(`^\\s*${escapeRegex(out.business_name)}\\s*[|\\-–—·:]\\s*`, "i"), "")
      .trim();
    if (minusBrand && minusBrand !== cleaned && minusBrand.length < 200) {
      out.industry = minusBrand;
    }
  }

  // 5. USP — OG description usually IS the value-prop slogan.
  const ogDesc = decodeEntities(meta.og?.description || "").trim();
  if (ogDesc && ogDesc !== desc) {
    out.usp = ogDesc;
  } else if (desc && desc.length < 200 && !out.usp) {
    out.usp = desc;
  }

  // 6. Social links from anchor extraction.
  if (meta.social_links && Object.keys(meta.social_links).some((k) => (meta.social_links as any)[k])) {
    out.social_links = { ...(meta.social_links as any) };
  }

  // 7. Platforms array — derived from which social_links have values.
  if (meta.social_links) {
    const platformMap: Record<string, string> = {
      instagram: "Instagram",
      tiktok: "TikTok",
      youtube: "YouTube",
      linkedin: "LinkedIn",
      twitter: "X / Twitter",
      facebook: "Facebook",
      pinterest: "Pinterest",
      threads: "Threads",
    };
    const platforms = Object.entries(meta.social_links)
      .filter(([, v]) => v && typeof v === "string" && v.trim())
      .map(([k]) => platformMap[k])
      .filter(Boolean);
    if (platforms.length) out.platforms = platforms;
  }

  // 8. Favicon
  if (meta.favicon) out.favicon_url = meta.favicon;

  return out;
}

function extractOrganizations(ld: any): Array<{ name?: string; logo?: string; address?: string }> {
  const out: Array<{ name?: string; logo?: string; address?: string }> = [];
  if (!ld) return out;
  if (Array.isArray(ld)) { for (const x of ld) out.push(...extractOrganizations(x)); return out; }
  if (ld["@graph"]) { for (const x of ld["@graph"]) out.push(...extractOrganizations(x)); }
  const types = Array.isArray(ld["@type"]) ? ld["@type"] : [ld["@type"]];
  if (types.some((t: any) => typeof t === "string" && /Organization|LocalBusiness|Corporation|Person/i.test(t))) {
    const logo = typeof ld.logo === "string" ? ld.logo : ld.logo?.url || ld.logo?.contentUrl;
    let address = "";
    if (ld.address) {
      if (typeof ld.address === "string") address = ld.address;
      else {
        const a = ld.address;
        address = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry]
          .filter(Boolean).join(", ");
      }
    }
    out.push({ name: ld.name, logo, address });
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
