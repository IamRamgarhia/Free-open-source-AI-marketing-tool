/**
 * Server-side URL ingest — the hosted-mode equivalent of the local sidecar's
 * /ingest endpoint. Called by lib/url-ingest.ts when running on a non-loopback
 * host (i.e. deployed to Vercel/Cloudflare/Netlify).
 *
 * What it does: server-side HTTP GET of a user-supplied URL, strip HTML to
 * plain text, extract OG/title/JSON-LD metadata, return as JSON. Bypasses
 * browser CORS so the same URL ingest flow works without the local sidecar.
 *
 * What it does NOT do:
 *  - No LLM calls. The user's BYOK key never touches the server.
 *  - No persistence. We don't store the URL, the content, or anything else.
 *  - No telemetry. No logs of which URLs were ingested.
 *
 * SSRF guarded: blocks loopback, RFC1918 private, link-local, IPv6 unique-
 * local, and 169.254.169.254 (cloud metadata) on both the initial URL and
 * every redirect hop. Body capped at 500 KB. 15s timeout per hop, max 5
 * redirects.
 *
 * Mirrors the response shape of the sidecar (lib/url-ingest.ts uses both
 * interchangeably via serverProxyUrl()).
 */
import { NextResponse } from "next/server";

// Force Node runtime (not Edge) — we need redirect-by-hand control + the
// 15s timeout per hop, which Edge fetch doesn't expose granularly.
export const runtime = "nodejs";
// No caching — every ingest is a fresh fetch. We don't want stale brand data.
export const dynamic = "force-dynamic";

const MAX_REMOTE_BYTES = 500_000;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;
const OUTPUT_CAP = 40_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; OpenAdKit/1.0; +https://github.com/IamRamgarhia/AdForge)";

function isPrivateOrLoopbackHost(hostname: string): boolean {
  if (!hostname) return true;
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "ip6-localhost" || h === "ip6-loopback") return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^0\./.test(h)) return true;
  if (h === "::1" || h === "::") return true;
  if (/^fe[89ab][0-9a-f]:/i.test(h)) return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(h)) return true;
  return false;
}

interface Metadata {
  title: string;
  description: string;
  og: Record<string, string>;
  favicon: string;
  social_links: Record<string, string>;
  json_ld: unknown[];
}

function extractMetadata(html: string, baseUrl: string): Metadata {
  const meta: Metadata = {
    title: "",
    description: "",
    og: {},
    favicon: "",
    social_links: {},
    json_ld: [],
  };

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) meta.title = titleMatch[1].trim();

  const metaTagRe = /<meta\b[^>]*>/gi;
  const attrRe = (name: string) =>
    new RegExp(`(?:${name})\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  let m: RegExpExecArray | null;
  while ((m = metaTagRe.exec(html)) !== null) {
    const tag = m[0];
    const nameMatch = tag.match(attrRe("name|property"));
    const contentMatch = tag.match(attrRe("content"));
    if (!nameMatch || !contentMatch) continue;
    const key = (nameMatch[1] || nameMatch[2] || nameMatch[3] || "").toLowerCase();
    const val = contentMatch[1] || contentMatch[2] || contentMatch[3] || "";
    if (key === "description" && !meta.description) meta.description = val;
    if (key.startsWith("og:")) meta.og[key.slice(3)] = val;
    if (key === "twitter:title" && !meta.og.title) meta.og.title = val;
    if (key === "twitter:description" && !meta.og.description) meta.og.description = val;
    if (key === "twitter:image" && !meta.og.image) meta.og.image = val;
  }

  const linkRe = /<link\b[^>]*>/gi;
  while ((m = linkRe.exec(html)) !== null) {
    const tag = m[0];
    const relMatch = tag.match(/rel\s*=\s*["']([^"']+)["']/i);
    const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!relMatch || !hrefMatch) continue;
    if (/icon/i.test(relMatch[1])) {
      try {
        meta.favicon = new URL(hrefMatch[1], baseUrl).toString();
        if (!/apple-touch/i.test(relMatch[1])) break;
      } catch {
        // ignore
      }
    }
  }
  if (!meta.favicon) {
    try {
      meta.favicon = new URL("/favicon.ico", baseUrl).toString();
    } catch {
      // ignore
    }
  }

  const anchorRe = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  while ((m = anchorRe.exec(html)) !== null) {
    let u: URL;
    try {
      u = new URL(m[1], baseUrl);
    } catch {
      continue;
    }
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const url = u.toString();
    if (!meta.social_links.facebook && /(^|\.)facebook\.com$/.test(host) && !/\/sharer/i.test(u.pathname))
      meta.social_links.facebook = url;
    if (!meta.social_links.instagram && /(^|\.)instagram\.com$/.test(host))
      meta.social_links.instagram = url;
    if (
      !meta.social_links.twitter &&
      (/(^|\.)twitter\.com$/.test(host) || /(^|\.)x\.com$/.test(host)) &&
      !/\/intent\//i.test(u.pathname)
    )
      meta.social_links.twitter = url;
    if (!meta.social_links.linkedin && /(^|\.)linkedin\.com$/.test(host))
      meta.social_links.linkedin = url;
    if (!meta.social_links.youtube && /(^|\.)youtube\.com$/.test(host))
      meta.social_links.youtube = url;
    if (!meta.social_links.tiktok && /(^|\.)tiktok\.com$/.test(host))
      meta.social_links.tiktok = url;
    if (!meta.social_links.pinterest && /(^|\.)pinterest\.com$/.test(host))
      meta.social_links.pinterest = url;
    if (!meta.social_links.threads && /(^|\.)threads\.net$/.test(host))
      meta.social_links.threads = url;
  }

  const jsonLdRe = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = jsonLdRe.exec(html)) !== null) {
    try {
      meta.json_ld.push(JSON.parse(m[1].trim()));
    } catch {
      // skip malformed JSON-LD
    }
  }

  return meta;
}

async function fetchWithRedirects(initialUrl: string): Promise<string> {
  let current = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = new URL(current);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("Non-http(s) URL blocked");
    }
    if (isPrivateOrLoopbackHost(u.hostname)) {
      throw new Error("Private / loopback / link-local host blocked");
    }
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: ac.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });
    } finally {
      clearTimeout(timer);
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error(`Redirect ${res.status} without Location header`);
      current = new URL(loc, current).toString();
      continue;
    }
    if (res.status < 200 || res.status >= 400) {
      throw new Error(`HTTP ${res.status} from target`);
    }
    // Read body with cap. Reader to enforce the byte budget without
    // accumulating an unbounded string in memory.
    if (!res.body) return await res.text();
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    let out = "";
    let total = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REMOTE_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
        throw new Error(`Remote body exceeded ${MAX_REMOTE_BYTES} bytes`);
      }
      out += decoder.decode(value, { stream: true });
    }
    out += decoder.decode();
    return out;
  }
  throw new Error("Too many redirects");
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const target = u.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ ok: false, error: "Missing url param." }, { status: 400 });
  }
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid url." }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json(
      { ok: false, error: "Only http/https URLs supported." },
      { status: 400 }
    );
  }
  if (isPrivateOrLoopbackHost(parsed.hostname)) {
    return NextResponse.json(
      { ok: false, error: "Private / loopback / link-local hosts are not allowed." },
      { status: 400 }
    );
  }

  let body: string;
  try {
    body = await fetchWithRedirects(target);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Fetch failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  const metadata = extractMetadata(body, target);
  const text = stripHtml(body);
  const truncated = text.length > OUTPUT_CAP;
  return NextResponse.json({
    ok: true,
    url: target,
    content: truncated ? text.slice(0, OUTPUT_CAP) : text,
    truncated,
    source: "hosted-api",
    metadata,
  });
}
