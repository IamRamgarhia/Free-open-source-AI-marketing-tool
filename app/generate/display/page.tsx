"use client";

import { GeneratorShell } from "@/components/GeneratorShell";
import { Section } from "@/components/OutputBlocks";
import { CharBadge } from "@/components/CharBadge";
import { CopyButton } from "@/components/CopyButton";
import { buildDisplayPrompt, DISPLAY_SIZES, type DisplayInput } from "@/lib/prompts/display-ads";
import type { GeneratorConfig } from "@/lib/generator-config";

const config: GeneratorConfig<DisplayInput & Record<string, unknown>> = {
  title: "Display Banners",
  subtitle: "Copy for every standard banner size + responsive display assets.",
  platform: "display",
  campaign_type: "Display",
  maxTokens: 3500,
  fields: [
    { name: "product", label: "Product", kind: "text", required: true, placeholder: "e.g. cooking subscription box", span: 2 },
    { name: "goal", label: "Goal", kind: "text", required: true, placeholder: "first-month signups" },
    { name: "brand_promise", label: "Brand promise", kind: "textarea", required: true, placeholder: "What's the one promise the visual must deliver?", rows: 2, span: 2 },
    { name: "cta", label: "CTA", kind: "text", placeholder: "Try Free" },
  ],
  initial: { product: "", goal: "", brand_promise: "", cta: "" } as any,
  buildPrompt: (input) => buildDisplayPrompt(input as unknown as DisplayInput),
  buildTitle: (i: any) => `Display · ${i.product}`,
  expectJson: true,
  renderJson: (json) => <DisplayOutput json={json} />,
};

export default function Page() {
  return <GeneratorShell config={config} scope="generate/display" />;
}

function DisplayOutput({ json }: { json: any }) {
  return (
    <div className="space-y-4 stagger">
      <Section title={`Sized creatives · ${json?.creatives?.length ?? 0}`}>
        <div className="grid md:grid-cols-2 gap-2">
          {(json?.creatives ?? []).map((c: any, i: number) => {
            // Look up per-size limits — banner sizes have different char caps
            // (Mobile Banner is 22/28, Half Page is 30/90, etc.). Falling back
            // to 30/90 when no match is the loosest defensible default.
            const sz = DISPLAY_SIZES.find((s) => s.name === c.name || s.ratio === c.size);
            const hMax = sz?.h_max ?? 30;
            const dMax = sz?.d_max ?? 90;
            return (
            <div key={i} className="border border-base-700 bg-base-900/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-ui-mega text-live">{c.size}</span>
                <span className="text-[10px] text-ink-faint">{c.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <CharBadge count={c.char_counts?.headline ?? c.short_headline?.length ?? 0} max={hMax} />
                <span className="text-sm text-ink font-medium">{c.short_headline}</span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <CharBadge count={c.char_counts?.description ?? c.description?.length ?? 0} max={dMax} />
                <span className="text-ink-muted">{c.description}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint">cta: <span className="text-pos">{c.cta_button}</span></span>
                <CopyButton text={`${c.short_headline}\n${c.description}\n${c.cta_button}`} label="" />
              </div>
              <p className="text-[11px] text-info border-t border-base-700 pt-2 mt-1">visual: {c.image_concept}</p>
            </div>
            );
          })}
        </div>
      </Section>

      {json?.responsive_display_assets ? (
        <Section title="Responsive display assets">
          <div className="grid md:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint mb-1">short headlines</div>
              <ul className="space-y-0.5 text-ink">{json.responsive_display_assets.short_headlines?.map((h: string, i: number) => <li key={i}>{h}</li>)}</ul>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint mb-1">descriptions</div>
              <ul className="space-y-0.5 text-ink">{json.responsive_display_assets.descriptions?.map((h: string, i: number) => <li key={i}>{h}</li>)}</ul>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint mb-1">long headline</div>
              <p className="text-ink">{json.responsive_display_assets.long_headline}</p>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint mb-1">business name</div>
              <p className="text-ink">{json.responsive_display_assets.business_name}</p>
            </div>
            <div className="md:col-span-2">
              <div className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint mb-1">image prompts</div>
              <ul className="space-y-1 text-info">{json.responsive_display_assets.image_prompts?.map((h: string, i: number) => <li key={i}>· {h}</li>)}</ul>
            </div>
          </div>
        </Section>
      ) : null}
    </div>
  );
}
