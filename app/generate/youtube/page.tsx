"use client";

import { GeneratorShell } from "@/components/GeneratorShell";
import { Section, Pill } from "@/components/OutputBlocks";
import { CopyButton } from "@/components/CopyButton";
import { buildYouTubePrompt, type YouTubeInput } from "@/lib/prompts/youtube-ads";
import type { GeneratorConfig } from "@/lib/generator-config";

const config: GeneratorConfig<YouTubeInput & Record<string, unknown>> = {
  title: "YouTube — Ad Scripts",
  subtitle: "In-stream (skip-stoppers), 6-second bumpers, or Discovery card copy.",
  platform: "youtube",
  campaign_type: "Script",
  maxTokens: 3500,
  fields: [
    {
      name: "format",
      label: "Format",
      kind: "select",
      options: [
        { value: "in_stream", label: "In-stream (60s skippable)" },
        { value: "bumper", label: "Bumper (6s non-skippable)" },
        { value: "discovery", label: "Discovery" },
      ],
    },
    { name: "product", label: "Product", kind: "text", required: true, placeholder: "e.g. AI design tool", span: 2 },
    { name: "goal", label: "Goal", kind: "text", required: true, placeholder: "free trial signups" },
    { name: "landing_url", label: "Landing URL", kind: "text", placeholder: "https://…" },
  ],
  initial: { format: "in_stream", product: "", goal: "", landing_url: "" } as any,
  buildPrompt: (input) => buildYouTubePrompt(input as unknown as YouTubeInput),
  buildTitle: (i: any) => `YouTube · ${i.format} · ${i.product}`,
  expectJson: true,
  renderJson: (json) => <YouTubeOutput json={json} />,
};

export default function Page() {
  return <GeneratorShell config={config} scope="generate/youtube" />;
}

function YouTubeOutput({ json }: { json: any }) {
  if (json?.variants) {
    return (
      <div className="space-y-4 stagger">
        {json.variants.map((v: any, i: number) => (
          <Section key={i} title={`Variant ${v.label}`} actions={<CopyButton text={Object.entries(v).filter(([k]) => !["label", "b_roll", "companion_banner"].includes(k)).map(([k, val]: any) => typeof val === "string" ? `${k}: ${val}` : `${k} [${val.t ?? "?"}]: ${val.vo} | ${val.visual}`).join("\n")} label="copy beats" />}>
            <div className="space-y-1.5 text-sm">
              {["hook", "problem", "solution", "proof", "cta"].map((k) =>
                v[k] ? (
                  <div key={k} className="flex gap-2 text-xs">
                    <span className="font-mono text-ink-faint w-14">{v[k].t || ""}</span>
                    <span className="text-[9px] font-mono uppercase tracking-ui-mega text-live w-14 mt-0.5">{k}</span>
                    <div className="flex-1">
                      <div className="text-ink">{v[k].vo}</div>
                      <div className="text-ink-subtle text-[11px]">visual: {v[k].visual}</div>
                      {v[k].on_screen_url ? <div className="text-pos text-[11px]">overlay: {v[k].on_screen_url}</div> : null}
                    </div>
                  </div>
                ) : null
              )}
              {v.b_roll?.length ? (
                <div className="text-[12px] text-ink-muted mt-2">B-roll: {v.b_roll.join(" · ")}</div>
              ) : null}
              {v.companion_banner ? <Pill label="banner 300×60" text={v.companion_banner} /> : null}
            </div>
          </Section>
        ))}
        {json.view_rate_target ? (
          <p className="text-[11px] text-ink-muted font-mono uppercase tracking-ui-wide">{json.view_rate_target}</p>
        ) : null}
      </div>
    );
  }
  if (json?.scripts) {
    return (
      <div className="space-y-3 stagger">
        {json.scripts.map((s: any, i: number) => (
          <Section key={i} title={`Bumper ${s.label} · ${s.angle}`} actions={<CopyButton text={`${s.vo}\n${s.on_screen_text}`} label="copy" />}>
            <div className="space-y-1.5 text-sm">
              <Pill label="vo" text={s.vo} />
              <Pill label="overlay" text={s.on_screen_text} tone="live" />
              <p className="text-xs text-ink-muted">visual: {s.visual}</p>
            </div>
          </Section>
        ))}
      </div>
    );
  }
  if (json?.headlines) {
    return (
      <div className="space-y-3 stagger">
        <Section title="Headlines">
          <ul className="space-y-1 text-sm">{json.headlines.map((h: string, i: number) => <li key={i} className="text-ink">{h}</li>)}</ul>
        </Section>
        <Section title="Descriptions">
          <ul className="space-y-1 text-sm">{json.descriptions?.map((d: string, i: number) => <li key={i} className="text-ink">{d}</li>)}</ul>
        </Section>
        {json.thumbnail_concepts?.length ? (
          <Section title="Thumbnail concepts">
            <ul className="space-y-2 text-sm">
              {json.thumbnail_concepts.map((c: any, i: number) => (
                <li key={i} className="border border-base-700 p-2">
                  <div className="flex items-center gap-2">
                    <Pill label="emotion" text={c.emotion} tone="live" />
                    <span className="text-ink font-medium">{c.title}</span>
                  </div>
                  <div className="text-xs text-ink-muted mt-1">{c.visual}</div>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    );
  }
  return null;
}
