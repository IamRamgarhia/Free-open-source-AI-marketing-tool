# Tool Audit Prompt — for fix-cycle agents

You are auditing a specific batch of tools in the AdForge codebase. For every tool assigned to you, you must run the methodology below and produce a structured report of confirmed bugs.

## Inputs you receive

1. A list of tools to audit (e.g. `app/generate/meta`, `app/optimize/budget`)
2. The companion `TEST-SCENARIOS.md` (per-tool expectations) and `AUDIT-FINDINGS.md` (recent fixes already shipped)
3. The shared infrastructure these tools sit on:
   - `components/GeneratorShell.tsx` — generation orchestrator
   - `lib/llm.ts` — provider routing
   - `lib/quota-tracker.ts` — rate-limit tracking
   - `lib/smart-fill.ts` — brand-brain prefill heuristics
   - `lib/storage.ts` — IndexedDB persistence
   - `lib/brand-brain.ts` — schema + system prompt

## Methodology

For each tool, run these checks IN ORDER. Stop only when you've completed all six.

### 1. Static read
- Open the page file (`app/<path>/page.tsx`) and its prompt builder (`lib/prompts/<...>.ts`)
- Read every line — no skipping
- Confirm: does it use `GeneratorShell`? If yes, you can skip most of the rate-limit / autosave checks. If no (custom impl), audit them in detail.

### 2. Happy-path trace
Mentally simulate: user has active brand → opens tool → all fields auto-fill from brain → click Generate → output streams → saves to history.
- Smart-fill matches: confirm the `name` of every input field in the page config matches one of the 40+ aliases in `lib/smart-fill.ts:suggestFromBrain`. List any unmatched field names.
- buildPrompt: confirm the prompt builder produces a non-trivial prompt when given typical brain values + typical input values.

### 3. Empty-input check
Mentally simulate: user with no active brand opens the tool blank → clicks Generate.
- Required fields gating: which fields are `required: true`? Does the UI block submission cleanly when they're missing? Or does the AI receive `undefined` and confuse itself?
- Empty system prompt: when brain is null, `buildBrandSystemPrompt(null)` returns a generic prompt. Confirm the tool's prompt builder gracefully handles undefined brain fields (no `brain.products[0]` without null check, etc.).

### 4. Streaming + autosave check (custom-implemented tools only)
For tools that don't use GeneratorShell:
- `const finalText = res.text || stream.text` fallback present? (audit-finding #recent)
- `saveAd` called with the right brand_id and platform?
- `addUsage` called with `(cost, input_tokens, output_tokens)` in the right order?
- `estimateCostUsd` 3-arg form `(providerId, modelId, usage)`?
- Abort signal threaded through `llmStream` / `llmCall`?
- Rate-limit error parsing — does the catch detect 429-class errors and surface usefully?

### 5. Edge cases by tool type
- **Generator with CharBadge** (google, meta, tiktok, linkedin, etc.): does the platform-limit validation gate auto-save? Should over-limit headlines not be auto-saved? (Currently they ARE saved — flag as low-priority issue.)
- **Generator with image field** (vision-capable): is the field config `kind: "image"`? Does the prompt include an "IF IMAGE ATTACHED" block that's conditional on actual attachment?
- **Optimizer with budget input**: is the label currency-agnostic (no hardcoded `$`)? Does the prompt prefix the budget with the currency code from `getCurrency()`?
- **Tool with URL input** (landing-page, reel-teardown): is `looksLikeUrl()` called? Does ingestUrl get a signal for abort?
- **Tool with comma-separated input** (keywords): does the parse handle whitespace, trailing commas, duplicates?

### 6. State-integration scenarios
- Active brand switch mid-generation: does the tool use `runningRef` (or equivalent) to prevent brain state from mutating during an in-flight call?
- Provider switch mid-generation: in-flight request should complete on the OLD provider; next request uses NEW.
- Save while autosave is off: confirm the manual "Save" button is wired and works.

## Output format

Return a single Markdown block per tool, like this:

```
### app/generate/meta · status: PASS / ISSUES_FOUND

Pass items: [list scenario IDs from TEST-SCENARIOS.md that you verified pass]

Issues found:
1. **<severity>** [file:line]: <one-sentence symptom>
   Root cause: <what's wrong in code>
   Fix sketch: <how to fix in 1-2 lines of code>
   Confidence: 0-100

Open questions: <anything you couldn't verify statically and would need a running browser to confirm>
```

Severity:
- **BLOCKER**: tool crashes, silently fails, or produces wrong output
- **HIGH**: tool works but UX is broken (no error feedback, wrong currency, etc.)
- **MEDIUM**: edge case or nicety
- **LOW**: nitpick, skip unless trivial

## Hard rules

- Do not invent issues. If you can't verify, mark it "open question."
- Do not flag style preferences.
- Confidence < 60 → don't include unless it's a security issue.
- Cite file:line for every finding so the fix agent can navigate directly.

## What "done" looks like

- Every tool in your batch has a status block
- Every BLOCKER and HIGH has enough detail to fix in <10 lines of code
- The report is ready to hand to a fix agent
