"use client";

import { GeneratorShell } from "@/components/GeneratorShell";
import { Section, Pill } from "@/components/OutputBlocks";
import { CharBadge } from "@/components/CharBadge";
import { CopyButton } from "@/components/CopyButton";
import { buildShoppingPrompt, SHOPPING_LIMITS, type ShoppingInput } from "@/lib/prompts/google-shopping";
import type { GeneratorConfig } from "@/lib/generator-config";

const config: GeneratorConfig<ShoppingInput & Record<string, unknown>> = {
  title: "Google Shopping Optimizer",
  subtitle: "Title rule order + long-tail query targeting + Merchant Center field recommendations.",
  platform: "google",
  campaign_type: "Shopping",
  maxTokens: 3500,
  fields: [
    { name: "product_title", label: "Current title", kind: "text", required: true, span: 2, placeholder: "e.g. Wool Crew Socks 3-Pack" },
    { name: "brand", label: "Brand", kind: "text", required: true, placeholder: "Acme" },
    // Field name "product_category" instead of "category" so smart-fill (which
    // aliases "category" → brain.industry) doesn't auto-populate the wrong value.
    // Google Shopping's "Category" is the product taxonomy path, not the brand's vertical.
    { name: "product_category", label: "Category", kind: "text", required: true, placeholder: "Apparel > Socks" },
    { name: "price", label: "Price", kind: "text", placeholder: "24.99", hint: "Your selected currency (see Settings)." },
    { name: "attributes", label: "Key attributes (size/color/material)", kind: "textarea", required: true, rows: 2, placeholder: "Merino wool, 80%; sizes M-XL; black, navy, cream", span: 2 },
    { name: "current_description", label: "Current description", kind: "textarea", required: true, rows: 5, placeholder: "Paste the current product description", span: 2 },
  ],
  initial: { product_title: "", brand: "", product_category: "", price: "", attributes: "", current_description: "" } as any,
  buildPrompt: (input) => buildShoppingPrompt(input as unknown as ShoppingInput),
  buildTitle: (i: any) => `Shopping · ${i.product_title?.slice(0, 30)}`,
  expectJson: true,
  renderJson: (json) => <ShoppingOutput json={json} />,
};

export default function Page() {
  return <GeneratorShell config={config} scope="generate/google/shopping" />;
}

function ShoppingOutput({ json }: { json: any }) {
  return (
    <div className="space-y-4 stagger">
      <Section title="Optimized title" actions={<CopyButton text={json?.title?.text ?? ""} />}>
        <div className="flex items-center gap-2 mb-2">
          <CharBadge count={json?.title?.chars ?? 0} max={SHOPPING_LIMITS.title} />
          <Pill text={json?.title?.status?.replace(/_/g, " ")} tone={json?.title?.status === "ok" ? "pos" : json?.title?.status === "over" ? "neg" : "live"} />
        </div>
        <p className="font-display italic text-xl text-ink leading-snug">{json?.title?.text}</p>
      </Section>

      <Section title="Optimized description" actions={<CopyButton text={json?.description?.text ?? ""} />}>
        <div className="flex items-center gap-2 mb-2">
          <CharBadge count={json?.description?.chars ?? 0} max={SHOPPING_LIMITS.description} />
          <Pill text={json?.description?.status?.replace(/_/g, " ")} tone={json?.description?.status === "ok" ? "pos" : "live"} />
        </div>
        <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{json?.description?.text}</p>
      </Section>

      {json?.highlights?.length ? (
        <Section title="Highlights">
          <ul className="grid md:grid-cols-2 gap-1.5">
            {json.highlights.map((h: string, i: number) => (
              <li key={i} className="border border-base-700 bg-base-900/30 px-2 py-1.5 text-sm text-ink flex gap-2">
                <span className="text-live">○</span>{h}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {json?.merchant_center_attributes?.length ? (
        <Section title="Merchant Center attributes to populate">
          <ul className="space-y-1">
            {json.merchant_center_attributes.map((a: any, i: number) => (
              <li key={i} className="flex items-center gap-2 border border-base-700 px-2 py-1.5 text-xs">
                <Pill text={a.priority} tone={a.priority === "high" ? "neg" : a.priority === "medium" ? "live" : "default"} label="pri" />
                <span className="font-mono text-[10px] uppercase tracking-ui-mega text-ink-muted w-32">{a.field}</span>
                <span className="flex-1 text-ink">{a.value_or_action}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {json?.long_tail_queries_to_rank_for?.length ? (
        <Section title="Long-tail queries to rank for">
          <ul className="grid md:grid-cols-2 gap-1 text-sm text-ink">
            {json.long_tail_queries_to_rank_for.map((q: string, i: number) => <li key={i} className="border border-base-700 px-2 py-1">{q}</li>)}
          </ul>
        </Section>
      ) : null}

      {json?.negative_keywords?.length ? (
        <Section title="Negatives">
          <div className="flex flex-wrap gap-1.5">
            {json.negative_keywords.map((n: string, i: number) => (
              <span key={i} className="border border-base-700 bg-base-900/30 px-2 py-1 text-xs text-ink">−{n}</span>
            ))}
          </div>
        </Section>
      ) : null}

      {Array.isArray(json?.policy_warnings) ? (
        <Section title="Policy warnings">
          {json.policy_warnings.length === 0 ? (
            <p className="text-pos text-sm">No warnings — listing looks Merchant Center-clean.</p>
          ) : (
            <ul className="space-y-1 text-sm text-neg">{json.policy_warnings.map((w: string, i: number) => <li key={i}>⚠ {w}</li>)}</ul>
          )}
        </Section>
      ) : null}
    </div>
  );
}
