#!/usr/bin/env node
/**
 * Verification harness for lib/deterministic-brand-fill.ts.
 *
 * Runs the sidecar's extractMetadata against a saved HTML page, then runs the
 * deterministic-fill logic against the result, and prints the populated fields.
 *
 * Usage: node scripts/test-deterministic-fill.cjs <html-file>
 *
 * This is a CommonJS mirror of lib/deterministic-brand-fill.ts so we can
 * exercise the logic without a TS build step.
 */

const fs = require("fs");
const path = require("path");

// Load extractMetadata from the sidecar by requiring the file's evaluated form.
// Since local-sync.cjs is a server we can't simply require, copy the function.
function extractMetadata(html, baseUrl) {
  const meta = { title: "", description: "", og: {}, favicon: "", social_links: {}, json_ld: [] };
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) meta.title = titleMatch[1].trim();
  const metaTagRe = /<meta\b[^>]*>/gi;
  let m;
  while ((m = metaTagRe.exec(html)) !== null) {
    const tag = m[0];
    const nameMatch = tag.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i);
    const contentMatch = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    if (!nameMatch || !contentMatch) continue;
    const key = nameMatch[1].toLowerCase();
    const val = contentMatch[1];
    if (key === "description" && !meta.description) meta.description = val;
    if (key.startsWith("og:")) meta.og[key.slice(3)] = val;
    if (key === "twitter:title" && !meta.og.title) meta.og.title = val;
    if (key === "twitter:description" && !meta.og.description) meta.og.description = val;
  }
  const linkRe = /<link\b[^>]*>/gi;
  while ((m = linkRe.exec(html)) !== null) {
    const tag = m[0];
    const relMatch = tag.match(/rel\s*=\s*["']([^"']+)["']/i);
    const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!relMatch || !hrefMatch) continue;
    if (/icon/i.test(relMatch[1])) {
      try { meta.favicon = new URL(hrefMatch[1], baseUrl).toString(); if (!/apple-touch/i.test(relMatch[1])) break; } catch {}
    }
  }
  if (!meta.favicon) { try { meta.favicon = new URL("/favicon.ico", baseUrl).toString(); } catch {} }
  const anchorRe = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  while ((m = anchorRe.exec(html)) !== null) {
    let u;
    try { u = new URL(m[1], baseUrl); } catch { continue; }
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const url = u.toString();
    if (!meta.social_links.facebook && /(^|\.)facebook\.com$/.test(host) && !/\/sharer/i.test(u.pathname)) meta.social_links.facebook = url;
    if (!meta.social_links.instagram && /(^|\.)instagram\.com$/.test(host)) meta.social_links.instagram = url;
    if (!meta.social_links.twitter && (/(^|\.)twitter\.com$/.test(host) || /(^|\.)x\.com$/.test(host)) && !/\/intent\//i.test(u.pathname)) meta.social_links.twitter = url;
    if (!meta.social_links.linkedin && /(^|\.)linkedin\.com$/.test(host)) meta.social_links.linkedin = url;
    if (!meta.social_links.youtube && /(^|\.)youtube\.com$/.test(host)) meta.social_links.youtube = url;
    if (!meta.social_links.tiktok && /(^|\.)tiktok\.com$/.test(host)) meta.social_links.tiktok = url;
    if (!meta.social_links.pinterest && /(^|\.)pinterest\.com$/.test(host)) meta.social_links.pinterest = url;
    if (!meta.social_links.threads && /(^|\.)threads\.net$/.test(host)) meta.social_links.threads = url;
  }
  const jsonLdRe = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = jsonLdRe.exec(html)) !== null) {
    try { meta.json_ld.push(JSON.parse(m[1].trim())); } catch {}
  }
  return meta;
}

// Now mirror the deterministic-fill logic from lib/deterministic-brand-fill.ts
function decodeEntities(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function extractOrganizations(ld) {
  const out = [];
  if (!ld) return out;
  if (Array.isArray(ld)) { for (const x of ld) out.push(...extractOrganizations(x)); return out; }
  if (ld["@graph"]) { for (const x of ld["@graph"]) out.push(...extractOrganizations(x)); }
  const types = Array.isArray(ld["@type"]) ? ld["@type"] : [ld["@type"]];
  if (types.some((t) => typeof t === "string" && /Organization|LocalBusiness|Corporation|Person/i.test(t))) {
    const logo = typeof ld.logo === "string" ? ld.logo : ld.logo?.url || ld.logo?.contentUrl;
    let address = "";
    if (ld.address) {
      if (typeof ld.address === "string") address = ld.address;
      else { const a = ld.address; address = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry].filter(Boolean).join(", "); }
    }
    // NEW extras:
    const description = ld.description;
    const legalName = ld.legalName;
    const sameAs = Array.isArray(ld.sameAs) ? ld.sameAs : (typeof ld.sameAs === "string" ? [ld.sameAs] : []);
    const email = ld.email;
    let telephone;
    if (ld.contactPoint) {
      const cp = Array.isArray(ld.contactPoint) ? ld.contactPoint[0] : ld.contactPoint;
      telephone = cp?.telephone;
    }
    if (!telephone && ld.telephone) telephone = ld.telephone;
    out.push({ name: ld.name, logo, address, description, legalName, sameAs, email, telephone });
  }
  return out;
}

function extractFAQs(ld) {
  const out = [];
  if (!ld) return out;
  if (Array.isArray(ld)) { for (const x of ld) out.push(...extractFAQs(x)); return out; }
  if (ld["@graph"]) { for (const x of ld["@graph"]) out.push(...extractFAQs(x)); }
  const types = Array.isArray(ld["@type"]) ? ld["@type"] : [ld["@type"]];
  if (types.some((t) => typeof t === "string" && /FAQPage/i.test(t)) && Array.isArray(ld.mainEntity)) {
    for (const q of ld.mainEntity) {
      if (q?.name && q.acceptedAnswer?.text) {
        out.push({ question: String(q.name), answer: String(q.acceptedAnswer.text) });
      }
    }
  }
  return out;
}

function bucketSocialFromUrls(urls) {
  const out = {};
  for (const raw of urls) {
    let u; try { u = new URL(raw); } catch { continue; }
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const url = u.toString();
    if (!out.facebook && /(^|\.)facebook\.com$/.test(host)) out.facebook = url;
    else if (!out.instagram && /(^|\.)instagram\.com$/.test(host)) out.instagram = url;
    else if (!out.twitter && (/(^|\.)twitter\.com$/.test(host) || /(^|\.)x\.com$/.test(host))) out.twitter = url;
    else if (!out.linkedin && /(^|\.)linkedin\.com$/.test(host)) out.linkedin = url;
    else if (!out.youtube && /(^|\.)youtube\.com$/.test(host)) out.youtube = url;
    else if (!out.tiktok && /(^|\.)tiktok\.com$/.test(host)) out.tiktok = url;
    else if (!out.pinterest && /(^|\.)pinterest\.com$/.test(host)) out.pinterest = url;
    else if (!out.threads && /(^|\.)threads\.net$/.test(host)) out.threads = url;
  }
  return out;
}

function deterministicFillFromMetadata(meta, fallbackUrl) {
  if (!meta) return {};
  const out = {};
  let bizName = meta.og?.site_name?.trim() || "";
  if (!bizName && meta.title) {
    const cleaned = decodeEntities(meta.title);
    const parts = cleaned.split(/\s+[|\-–—·:]\s+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      const ranked = parts.filter((p) => p.length >= 2 && !/^(home|welcome|index)$/i.test(p)).sort((a, b) => a.length - b.length);
      bizName = ranked[0] || parts[0] || cleaned;
    } else bizName = cleaned;
  }
  if (!bizName && fallbackUrl) { try { bizName = new URL(fallbackUrl).hostname.replace(/^www\./i, ""); } catch {} }
  if (bizName) { out.business_name = bizName; out.name = bizName; }

  const orgs = (meta.json_ld || []).flatMap((ld) => extractOrganizations(ld));
  const primaryOrg = orgs[0];
  if (primaryOrg) {
    if (primaryOrg.legalName) { out.business_name = primaryOrg.legalName; out.name = primaryOrg.legalName; }
    else if (primaryOrg.name && (!out.business_name || out.business_name.length > 60)) {
      out.business_name = primaryOrg.name; out.name = primaryOrg.name;
    }
    if (primaryOrg.logo) out.favicon_url = out.favicon_url || primaryOrg.logo;
    if (primaryOrg.address) out.audience_demographics = primaryOrg.address;
    if (primaryOrg.description) out.niche = primaryOrg.description;
    if (primaryOrg.sameAs?.length) {
      const social = bucketSocialFromUrls(primaryOrg.sameAs);
      if (Object.keys(social).length) out.social_links = { ...(out.social_links || {}), ...social };
    }
  }

  const desc = decodeEntities(meta.description || meta.og?.description || "").trim();
  if (desc && !out.niche) out.niche = desc;

  if (meta.title && out.business_name) {
    const cleaned = decodeEntities(meta.title);
    const minusBrand = cleaned
      .replace(new RegExp(`\\s*[|\\-–—·:]\\s*${escapeRegex(out.business_name)}\\s*$`, "i"), "")
      .replace(new RegExp(`^\\s*${escapeRegex(out.business_name)}\\s*[|\\-–—·:]\\s*`, "i"), "")
      .trim();
    if (minusBrand && minusBrand !== cleaned && minusBrand.length < 200) out.industry = minusBrand;
  }

  const ogDesc = decodeEntities(meta.og?.description || "").trim();
  if (ogDesc && ogDesc !== desc) out.usp = ogDesc;
  else if (desc && desc.length < 250 && !out.usp) out.usp = desc;

  // Merge social_links from anchor extraction over JSON-LD sameAs.
  const anchorSocials = meta.social_links && Object.values(meta.social_links).some((v) => v && String(v).trim()) ? meta.social_links : null;
  if (anchorSocials) out.social_links = { ...(out.social_links || {}), ...anchorSocials };

  // FAQ → objections / objection_handling / pain_points (rephrase questions).
  const faqs = (meta.json_ld || []).flatMap((ld) => extractFAQs(ld));
  if (faqs.length) {
    out.objections = faqs.map((f) => f.question);
    out.objection_handling = faqs.map((f) => f.answer);
  }

  // Platforms derived from non-empty social_links.
  if (out.social_links) {
    const platformMap = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", linkedin: "LinkedIn", twitter: "X / Twitter", facebook: "Facebook", pinterest: "Pinterest", threads: "Threads" };
    const platforms = Object.entries(out.social_links).filter(([, v]) => v && typeof v === "string" && v.trim()).map(([k]) => platformMap[k]).filter(Boolean);
    if (platforms.length) out.platforms = platforms;
  }

  if (meta.favicon) out.favicon_url = meta.favicon;
  return out;
}

const file = process.argv[2];
if (!file) { console.error("Usage: node test-deterministic-fill.cjs <html-file>"); process.exit(1); }
const html = fs.readFileSync(path.resolve(file), "utf8");
const baseUrl = process.argv[3] || "https://dicecodes.com/";
const meta = extractMetadata(html, baseUrl);
console.log("=== EXTRACTED METADATA ===");
console.log(JSON.stringify(meta, null, 2).slice(0, 3000));
console.log("\n=== DETERMINISTIC FILL OUTPUT ===");
const result = deterministicFillFromMetadata(meta, baseUrl);
console.log(JSON.stringify(result, null, 2));
console.log("\n=== FIELD COUNT ===");
console.log(`Populated fields: ${Object.keys(result).length}`);
