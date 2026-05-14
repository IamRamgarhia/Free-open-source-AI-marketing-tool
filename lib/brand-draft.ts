/**
 * Onboarding draft storage. After an extraction completes but before the user
 * clicks "Save & activate," we stash the staged brain in localStorage so a
 * page refresh / tab crash / accidental navigation doesn't waste the AI cost.
 *
 * Stored as a single record (one active draft at a time). Cleared when the
 * user explicitly saves OR discards the extraction.
 */
import type { BrandBrain } from "./brand-brain";

const KEY = "ados.brand_draft.v1";

export interface BrandDraft {
  brain: BrandBrain;
  source: "url" | "paste" | "google" | "vision";
  sourceLabel: string;
  saved_at: number;
}

function safeLocal(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function saveDraft(draft: BrandDraft): void {
  const s = safeLocal();
  if (!s) return;
  try { s.setItem(KEY, JSON.stringify(draft)); } catch {}
}

export function loadDraft(): BrandDraft | null {
  const s = safeLocal();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.brain?.business_name) return null;
    // Expire drafts older than 24 hours — stale data is worse than no data.
    if (typeof parsed.saved_at === "number" && Date.now() - parsed.saved_at > 24 * 3600 * 1000) {
      s.removeItem(KEY);
      return null;
    }
    return parsed as BrandDraft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  const s = safeLocal();
  if (!s) return;
  try { s.removeItem(KEY); } catch {}
}
