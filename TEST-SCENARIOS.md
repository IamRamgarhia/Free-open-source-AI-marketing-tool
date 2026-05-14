# AdForge — Pre-Launch Tool Test Scenarios

This document enumerates **every realistic scenario** a user can hit across the app, organized by tool. Each scenario is paired with an expected behavior so a tester (human or AI agent) can mechanically check "did the right thing happen?"

The goal is to ship a build where **every cell in every table is green** before users see it.

---

## Tool inventory

### Onboarding + brand brain (5 surfaces)
- `/brand` — clients list
- `/brand/new` — onboarding (4 methods)
- `/brand/[id]` — edit existing brain
- `BrandBrainForm` — embedded form used by /brand/new (manual) and /brand/[id]
- `ExtractionReview` — cross-check panel after URL/paste/google extraction

### Generators (18 tools — all use `GeneratorShell`)
`generate/`: `meta`, `google`, `google-pmax`, `google-shopping`, `tiktok`, `linkedin`, `youtube`, `twitter`, `display`, `hashtags`, `email-subjects`, `lead-form`, `spark-ads`, `creative-prompts`, `branded-hashtag-challenge`, `campaign-kit`, `content-calendar`, `reel-ideas`

### Optimizers (11 tools — all use `GeneratorShell`)
`optimize/`: `ab-test`, `ad-fatigue`, `audience`, `bid-strategy`, `budget`, `budget-planner`, `creative-score`, `ctr`, `keywords`, `landing-page`, `quality-score`

### Research (3 tools — mix)
- `/research/competitors` — custom (not GeneratorShell)
- `/research/reel-teardown` — GeneratorShell
- `/research/compare` — custom

### Launch (3 surfaces)
- `/launch/wizard` — 10-minute campaign builder (5-phase streaming)
- `/launch-guide` — platform launch guide content
- `/strategy`, `/strategy/decision-tree` — strategy tools

### Discovery (2 surfaces)
- `/suggestions` — proactive AI campaign suggestions (custom, not GeneratorShell)
- `/platforms`, `/platforms/[platform]` — platform hub pages

### Content (5 surfaces)
- `/learn` — concept library
- `/learn/[concept]` — concept detail (AI explainer)
- `/learn/courses`, `/learn/courses/[course]`, `/learn/courses/[course]/[lesson]`
- `/learn/frameworks` — framework trainer (AI)

### Management (5 surfaces)
- `/history` — generated ads log with edit/delete/log-performance
- `/campaigns` — saved campaigns from launch wizard
- `/report` — usage reports
- `/batch` — multi-client batch mode
- `/settings` — provider/currency/sync configuration

### Infrastructure
- Provider switching (StatusBar quick-switcher + ProviderSwitcher inline)
- Currency selection (12 currencies)
- Quota tracker (per-provider RPM/RPD counters)
- Service worker (offline shell + LLM exclusion)
- Local-sync sidecar (folder-portable data + URL ingest)
- Auto-update (`/update/apply` from GitHub main)

---

## Cross-cutting scenarios (apply to every tool)

| # | Scenario | Expected behavior |
|---|---|---|
| X1 | No API key configured | Each tool gated by `ApiKeyGate` redirects to `/setup` |
| X2 | API key present but wrong format | Save+Verify in /settings rejects; tools never try the key |
| X3 | API key valid but provider returns 401 mid-call | Friendly error surfaces with the provider's message |
| X4 | API key valid but provider returns 429 (rate limit) | Rate-limit panel shows with countdown + ProviderSwitcher inline |
| X5 | Network offline mid-call | Friendly error; no partial save; abort cleans up |
| X6 | User clicks Generate twice rapidly | Second click no-op (busy guard) |
| X7 | User presses Cmd+Enter while running | No-op (running guard) |
| X8 | User navigates away mid-stream | Abort fires; partial output discarded (or saved as draft for wizard) |
| X9 | No active brand brain | Tool either guards with banner OR runs with empty system prompt |
| X10 | User switches active brand mid-generation | In-flight request keeps OLD brain; next request uses NEW |
| X11 | Brand brain is deleted while editing a tool that uses it | Form keeps the staged values; subsequent reads return `null` |
| X12 | Currency changed from USD → INR | Budget inputs reflect new currency in labels; cost preview converts; existing inputs unchanged |
| X13 | Provider switched while a tool is open | StatusBar updates; next generation uses new provider |
| X14 | Service worker has stale shell after deploy | `controllerchange` triggers reload |
| X15 | IndexedDB quota exhausted (Safari private) | `saveAd` throws → surfaced as error, no UI deadlock |
| X16 | Two tabs save simultaneously | Web Locks API serializes (snapshot push only); ad/brain saves are last-writer-wins (acceptable) |

---

## Per-tool scenarios

### Onboarding / `/brand/new` (Method 1 — URL)

| # | Scenario | Expected |
|---|---|---|
| O1 | Paste valid URL with rich content (e.g. brand with JSON-LD) | All 6 phases run; cross-check shows ≥10 filled fields; "Save & activate" persists |
| O2 | Paste URL with thin SPA content (Stripe-style) | Phases run; auto-Google fills inference fields; industry-fallback fills remainder; cross-check non-empty |
| O3 | Paste business name (not URL) | Auto-routes to Method 2 / Google search |
| O4 | Paste Instagram URL | Detects social-only → auto-routes to Method 2 with hint |
| O5 | Paste invalid URL (`asdf`) | Auto-routes to Method 2 with "looks like a name" message |
| O6 | URL returns 404 | Each reader's specific message shown; manual-paste box surfaces |
| O7 | URL blocked by Cloudflare | Sidecar/Jina/AllOrigins all fail; manual-paste box surfaces |
| O8 | User pastes javascript: URL | Rejected with "Only http(s) URLs are allowed" |
| O9 | User clicks Stop during phase 3 | All in-flight calls abort; "Extraction cancelled" status; no draft saved |
| O10 | Page crash / refresh after extraction completes | Resume-draft banner appears on next visit to `/brand/new` |
| O11 | User clicks "Edit before saving" then exits | Brain saved as draft? (Currently no — flag for verification) |
| O12 | Cross-check shows core fields empty | Red banner; "Save anyway" still works |
| O13 | Gemini Flash returns empty across all passes | Industry-fallback fills with closest template; generic fallback as last resort |
| O14 | User pastes URL twice rapidly (Enter + click Extract) | `busyRef` guards; only one extraction runs |
| O15 | Light-mode toggle on | Only AI pass 1 + industry-fallback run; gap-fill + auto-Google skipped |

### Onboarding / Method 2 (Google search)
| # | Scenario | Expected |
|---|---|---|
| G1 | Search "DSC Cricket" | Jina-via-sidecar fetches results; AI extracts; cross-check populated |
| G2 | Search with too-generic term ("software") | AI returns ambiguous result; cross-check shows partial fill; user can edit |
| G3 | Search Jina rate-limited | Sidecar `/ingest` succeeds (server-side); same outcome |
| G4 | Both Jina + AllOrigins blocked + sidecar offline | Clear error; offer Method 3/4 |

### Onboarding / Method 2.5 (Vision)
| # | Scenario | Expected |
|---|---|---|
| V1 | User drops PNG, active provider is Gemini Flash (vision-capable) | AI reads screenshot; cross-check populated |
| V2 | User drops image, active provider is Groq (no vision) | Error: "switch to Claude / GPT / Gemini" |
| V3 | User drops 5MB image | Encoded as base64; fits within model context |
| V4 | User drops non-image (PDF) | File picker filters; if bypassed, AI returns "can't read this" |

### Onboarding / Method 3 (Industry template)
| # | Scenario | Expected |
|---|---|---|
| T1 | Click "Local restaurant" → BrandBrainForm opens with skeleton | Active brand NOT set yet; only fires on explicit Save |
| T2 | User edits + saves | Template values + edits persist; active brain switches |
| T3 | User abandons (closes tab) | Skeleton remains in IndexedDB unused (no active dangling reference) |

### `/brand/[id]` (edit existing brain)
| # | Scenario | Expected |
|---|---|---|
| E1 | Open existing populated brain | Top "AI extract" section collapsed; brain fields filled below |
| E2 | Click "Fill empty with AI" | Full 4-pass pipeline runs against saved website_url; only empty fields fill |
| E3 | Click "Template fill" | Industry-fallback fills empty fields; AI not called |
| E4 | Edit business_name + save | Saves; active brain ID still points at same record |
| E5 | Click Delete | Confirm dialog; soft-delete; undo toast 7s; active brain cleared if was active |
| E6 | "Forget" / "Export" buttons | Functional |

### Generators (18 tools — GeneratorShell)

For each generator, apply this 6-row matrix:

| # | Scenario | Expected |
|---|---|---|
| GN1 | Active brand set, all required fields auto-filled, click Generate | Streaming output; saved-to-history flash; output renders |
| GN2 | No active brand, required fields blank | "Required: <fields>" error |
| GN3 | Required field empty, Generate click | "Required: <field-label>" error; Generate stays enabled |
| GN4 | Vision-capable image field + image attached + non-vision provider | Vision fallback message in warning style; routes via fallback provider |
| GN5 | Vision-capable image + no other vision-provider key | Hard error: "no vision provider configured" |
| GN6 | Generate, Stop, Generate again | First aborts; second runs cleanly |

**Tool-specific over-and-above scenarios:**

- **`generate/google` (RSA)**: CharBadge over-limit headlines/descriptions; user can still copy
- **`generate/meta`**: 27-character primary text limit per variant
- **`generate/tiktok` / `reel-ideas`**: Reel-format-specific (no headlines, focus on hook)
- **`generate/email-subjects`**: ≤60 char limit
- **`generate/hashtags`**: Outputs flat list, not JSON
- **`generate/lead-form`**: Multi-question schema validation
- **`generate/campaign-kit`**: 5500 tokens; long output; verify nothing truncates
- **`generate/content-calendar`**: 30-day plan; date math right; weekday/weekend split
- **`generate/branded-hashtag-challenge`**: TikTok-specific phases

### Optimizers (11 tools — GeneratorShell)

Same 6-row matrix as generators, plus:

- **`optimize/audience`**: Vision input for screenshot; conditional "IF IMAGE ATTACHED" prompt block
- **`optimize/bid-strategy`**: Numeric validation on conversions_per_month, days_active
- **`optimize/budget`** / **`optimize/budget-planner`**: Currency-aware labels (no `$` hardcoded)
- **`optimize/ctr`**: Image input optional
- **`optimize/landing-page`**: URL ingest of the LP for AI to read
- **`optimize/ad-fatigue`**: Time-series input (impressions/CPM over 14 days)
- **`optimize/ab-test`**: Two variants comparison
- **`optimize/creative-score`**: Single asset evaluation
- **`optimize/keywords`**: Comma-separated list parse
- **`optimize/quality-score`**: Google-specific; landing + ad copy + extensions

### `/research/competitors` (custom path)
| # | Scenario | Expected |
|---|---|---|
| C1 | Paste competitor ads + own product + USP, Generate | Streaming output; stop button works |
| C2 | No competitor ads pasted | "Paste at least one competitor ad" error |
| C3 | No USP or product | "Tell us what we're selling" error |
| C4 | Rate-limit during stream | Provider switcher panel shows with one-click options |
| C5 | Save + delete + re-save | History reflects correctly |

### `/research/reel-teardown`
| # | Scenario | Expected |
|---|---|---|
| R1 | Paste TikTok/Reel URL | Sidecar fetches → AI tears down |
| R2 | Upload video file | Vision provider reads frames |
| R3 | No URL / no upload | Error |

### `/launch/wizard`
| # | Scenario | Expected |
|---|---|---|
| W1 | All inputs filled, click Build | 5 phases stream sequentially; each shows live output (not "queued") |
| W2 | Budget empty | "Set a budget" error |
| W3 | Provider stalls during phase 2 | Per-phase timeout (90s) fires; auto-failover to backup provider if configured |
| W4 | User clicks Stop mid-phase 3 | Completed phases saved; phase 3 cancelled; phases 4-5 dropped; campaign linked to what was done |
| W5 | Re-run wizard after partial completion | Existing campaign visible in /campaigns; new run creates new campaign (or appends?) |
| W6 | Currency INR + budget "50000" | Sent to AI as "INR 50000"; output mentions INR amounts |
| W7 | All 5 phases done, click Save & View Campaign | /campaigns/[id] loads with all 5 assets linked |

### `/suggestions`
| # | Scenario | Expected |
|---|---|---|
| S1 | Active brand set, Generate | 3 campaign cards stream; saved-to-history |
| S2 | No active brand | Error: "No active brand brain. Add one at /brand first" |
| S3 | Rate-limited | Provider switcher inline |
| S4 | Save link, click "Open campaign" | Navigates to relevant launch path |

### `/history`
| # | Scenario | Expected |
|---|---|---|
| H1 | View list with 50+ ads | Renders; filters by brand/platform/type work |
| H2 | Click an ad | Detail view shows input + output + cost |
| H3 | Edit performance (impressions/clicks/spend) | Saves; CTR/CVR/CPA/ROAS computed |
| H4 | Delete ad | Confirm dialog; undo toast 7s |
| H5 | Bulk select + delete | Soft-delete all; single undo for all? (verify) |
| H6 | Filter by deleted brand's ID | Empty result (or "brand deleted" indicator) |

### `/campaigns`
| # | Scenario | Expected |
|---|---|---|
| CM1 | Campaign created by launch wizard appears | With all 5 linked assets |
| CM2 | Open campaign detail | Each asset opens in respective tool's history view |
| CM3 | Delete campaign | Confirm; assets keep linked status (or unlink?) — verify |

### `/settings`
| # | Scenario | Expected |
|---|---|---|
| ST1 | Add API key + Save+Verify | Real API call validates; flash success; "active" badge applies |
| ST2 | Add invalid key + Save+Verify | Verify fails; key not saved; error shown |
| ST3 | Save key during network failure | try/finally clears testing state; error surfaces |
| ST4 | Switch active provider | Event fires; StatusBar updates immediately |
| ST5 | Switch currency to INR | Currency event fires; budget labels update on next visit |
| ST6 | Toggle auto-save off + generate | Ad NOT saved to history |
| ST7 | Toggle char-warnings off | Over-limit badges hidden |
| ST8 | Toggle sync-include-keys on | data/snapshot.json includes keys (security trade-off) |
| ST9 | Export full backup → re-import in fresh session | Brains, ads, campaigns restored |
| ST10 | Wipe-all | All IndexedDB cleared after confirm |

### `/batch` (multi-client batch mode)
| # | Scenario | Expected |
|---|---|---|
| B1 | 3 clients selected + 2 generators + Generate | All 6 jobs run in parallel; each saves to respective brand |
| B2 | One job fails mid-batch | Other jobs continue; failure listed in summary |
| B3 | Stop mid-batch | Cancel all in-flight |
| B4 | No clients selected | "Pick at least one client" error |

### Provider switching
| # | Scenario | Expected |
|---|---|---|
| PS1 | StatusBar shows other provider chips when keys configured | Click → switches active; UI updates |
| PS2 | Inline switcher on rate-limit panel | Same one-click switch |
| PS3 | No other keys → switcher shows "+ Add free key" CTAs | Links go to /settings#provider-X |
| PS4 | Switch provider while a tool is running | StatusBar updates; in-flight request continues with old; next runs use new |

### Quota tracker
| # | Scenario | Expected |
|---|---|---|
| Q1 | Make 5 requests | StatusBar shows "5/15 min" |
| Q2 | Hit 80% of cap | Color flips from gray to live-yellow |
| Q3 | 429 with retry-after 15s | "rate-limited · retry in 15s" countdown until expiry |
| Q4 | Wait through countdown, retry | Successful call clears blocked state |
| Q5 | Switch provider | Counters update to new provider's history |

### Sidecar (`scripts/local-sync.cjs`)
| # | Scenario | Expected |
|---|---|---|
| SC1 | Launch via AdForge.bat (Windows) | Browser opens at localhost:3005 |
| SC2 | Launch via AdForge.command (macOS) | Same outcome |
| SC3 | Port 3005 already in use | resolve-ports.cjs shifts to next free pair |
| SC4 | Stale sidecar from another install | Detected via /health.cwd; replaced |
| SC5 | `/ingest` with private IP URL | 400 blocked |
| SC6 | `/ingest` follows redirect to private IP | 400 blocked at redirect |
| SC7 | `/update/apply` with dirty git tree | 400 blocked |
| SC8 | `/update/apply` on non-main branch | 400 blocked |
| SC9 | Browser opens malicious tab; tries POST to localhost:3006 | CSRF rejection (origin not in allowlist) |

### Currency
| # | Scenario | Expected |
|---|---|---|
| CR1 | Pick INR | All cost displays show ₹ symbol; budget labels say "(INR)" |
| CR2 | Pick JPY | ¥ symbol; integer-only display (no decimals where small) |
| CR3 | Convert $0.01 USD with INR rate | Shows "₹0.84" |
| CR4 | Budget "5,00,000" (Indian lakh notation) | parseMoneyInput handles commas |
| CR5 | Budget "5 lakh" | Parses to 500,000 |
| CR6 | Budget "2 crore" | Parses to 20,000,000 |

---

## What "bug-free" means for each tool

A tool is "passing" when:

1. **Every row in its per-tool table** above gives the expected behavior
2. **Every cross-cutting row (X1–X16)** also passes for that tool
3. **TypeScript builds clean** (`npx tsc --noEmit` exit 0)
4. **Vitest passes** (`npx vitest run` exit 0)
5. **`next build` compiles** (exit 0)
6. **Console is silent** during normal operation (no `console.error`/`warn` except for known debug logs)

---

## Testing priorities (where to spend energy)

**Tier 1 (must work for public launch):**
- All 4 onboarding methods
- Top 5 generators (`meta`, `google`, `tiktok`, `email-subjects`, `hashtags`)
- Launch wizard
- Settings: provider setup + currency
- Suggestions

**Tier 2 (must work for first 100 users):**
- All optimizers
- All remaining generators
- Competitor research
- Brand brain edit / re-run AI

**Tier 3 (must work for power users):**
- Batch mode
- History bulk operations
- Export/import
- Multi-tab sync
- Auto-update from GitHub
