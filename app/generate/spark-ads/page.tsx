"use client";

import { GeneratorShell } from "@/components/GeneratorShell";
import { Section, Pill, Kv } from "@/components/OutputBlocks";
import { CopyButton } from "@/components/CopyButton";
import { getCurrency } from "@/lib/currency";
import { buildSparkAdsPrompt, type SparkInput } from "@/lib/prompts/tiktok-spark";
import type { GeneratorConfig } from "@/lib/generator-config";

const config: GeneratorConfig<SparkInput & Record<string, unknown>> = {
  title: "TikTok Spark Ads brief",
  subtitle: "Which posts to boost · creator brief · disclosure · CTA timing · scale/kill rules.",
  platform: "tiktok",
  campaign_type: "Spark Ads",
  maxTokens: 3500,
  fields: [
    { name: "product", label: "Product", kind: "text", required: true, placeholder: "e.g. cooking subscription box", span: 2 },
    { name: "audience", label: "Audience", kind: "text", required: true, placeholder: "Millennial home cooks, urban", span: 2 },
    { name: "organic_post_context", label: "Organic post / creator context", kind: "textarea", required: true, rows: 4, placeholder: "Describe the organic post (or creator's style). Hook? Length? Native or polished?", span: 2 },
    { name: "brand_voice", label: "Brand voice", kind: "text", placeholder: "raw, no script, slightly chaotic", span: 2 },
  ],
  initial: { product: "", audience: "", organic_post_context: "", brand_voice: "" } as any,
  buildPrompt: (input) => buildSparkAdsPrompt(input as unknown as SparkInput),
  buildTitle: (i: any) => `Spark · ${i.product}`,
  expectJson: true,
  renderJson: (json) => <SparkOutput json={json} />,
};

export default function Page() {
  return <GeneratorShell config={config} scope="generate/spark-ads" />;
}

function SparkOutput({ json }: { json: any }) {
  return (
    <div className="space-y-4 stagger">
      {json?.boost_decision_criteria ? (
        <Section title="Boost decision criteria">
          <div className="grid md:grid-cols-2 gap-2">
            <Kv k="min hook rate" v={`${json.boost_decision_criteria.hook_rate_min_pct ?? 0}%`} />
            <Kv k="min completion" v={`${json.boost_decision_criteria.completion_rate_min_pct ?? 0}%`} />
            <Kv k="min engagement" v={`${json.boost_decision_criteria.organic_engagement_rate_min_pct ?? 0}%`} />
            <Kv k="max post age" v={`${json.boost_decision_criteria.post_age_max_days ?? 0} days`} />
          </div>
          {json.boost_decision_criteria.do_not_spark_if?.length ? (
            <div className="mt-3 border-t border-base-700 pt-2">
              <div className="text-[10px] font-mono uppercase tracking-ui-mega text-neg mb-1">do not spark if</div>
              <ul className="text-sm text-ink-muted list-disc list-inside space-y-0.5">
                {json.boost_decision_criteria.do_not_spark_if.map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          ) : null}
        </Section>
      ) : null}

      {json?.creator_brief ? (
        <Section title="Creator brief" actions={<CopyButton text={`SHOW DON'T TELL:\n${json.creator_brief.show_dont_tell?.join("\n")}\n\nDON'T:\n${json.creator_brief.do_not?.join("\n")}\n\nGOAL: ${json.creator_brief.single_goal}`} />}>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-ui-mega text-pos mb-1">show, don't tell</div>
              <ul className="text-sm text-ink list-disc list-inside space-y-0.5">{json.creator_brief.show_dont_tell?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-ui-mega text-neg mb-1">do not</div>
              <ul className="text-sm text-ink list-disc list-inside space-y-0.5">{json.creator_brief.do_not?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            </div>
          </div>
          <div className="mt-3 border-t border-base-700 pt-2">
            <Pill label="single goal" text={json.creator_brief.single_goal} tone="live" />
          </div>
        </Section>
      ) : null}

      {json?.adaptation_copy ? (
        <Section title="Adaptation copy">
          <div className="space-y-2 text-sm">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint mb-1">caption variants</div>
              <ul className="space-y-0.5 text-ink">{json.adaptation_copy.caption_variants?.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint mb-1">on-screen text</div>
              <ul className="space-y-0.5 text-ink">{json.adaptation_copy.on_screen_text_variants?.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
            </div>
            {json.adaptation_copy.hashtag_strategy?.length ? (
              <div className="flex flex-wrap gap-1">{json.adaptation_copy.hashtag_strategy.map((t: string, i: number) => <span key={i} className="text-info text-[11px] font-mono">{t}</span>)}</div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {json?.disclosure ? (
        <Section title="Disclosure">
          <div className="space-y-1.5 text-sm">
            <Kv k="in caption" v={json.disclosure.in_caption} />
            <Kv k="in video" v={json.disclosure.in_video} />
            <Kv k="visible seconds" v={`${json.disclosure.duration_visible_seconds ?? 0}s`} />
          </div>
        </Section>
      ) : null}

      {json?.cta_overlay ? (
        <Section title="CTA overlay">
          <div className="grid md:grid-cols-3 gap-2">
            <Kv k="timing" v={json.cta_overlay.timing_seconds} />
            <Kv k="text" v={json.cta_overlay.text} />
            <Kv k="treatment" v={json.cta_overlay.visual_treatment} />
          </div>
        </Section>
      ) : null}

      {json?.scale_rules ? (
        <Section title="Scale / kill rules">
          <ul className="space-y-1 text-sm">
            <li className="flex gap-2"><Pill text="scale" tone="pos" /><span className="text-ink flex-1">{json.scale_rules.scale_when}</span></li>
            <li className="flex gap-2"><Pill text="kill" tone="neg" /><span className="text-ink flex-1">{json.scale_rules.kill_when}</span></li>
            <li className="flex gap-2"><Pill text="cap" /><span className="text-ink flex-1">max {getCurrency().symbol}{json.scale_rules.max_spend_per_post_usd}/post</span></li>
          </ul>
        </Section>
      ) : null}

      {json?.audience_targeting ? (
        <Section title="Audience targeting">
          <div className="grid md:grid-cols-2 gap-2 text-xs">
            <Kv k="interests" v={json.audience_targeting.interests?.join(", ")} />
            <Kv k="behaviors" v={json.audience_targeting.behaviors?.join(", ")} />
            <Kv k="lookalike" v={json.audience_targeting.lookalike_seed} />
            <Kv k="exclude" v={json.audience_targeting.exclusions?.join(", ")} />
          </div>
        </Section>
      ) : null}
    </div>
  );
}
