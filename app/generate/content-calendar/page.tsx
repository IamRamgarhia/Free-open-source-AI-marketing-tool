"use client";

import { GeneratorShell } from "@/components/GeneratorShell";
import { Section, Pill } from "@/components/OutputBlocks";
import { CopyButton } from "@/components/CopyButton";
import { ExternalLink } from "lucide-react";
import { buildContentCalendarPrompt, type ContentCalendarInput } from "@/lib/prompts/content-calendar";
import { ContentCalendarSchema } from "@/lib/schemas/content-calendar";
import { IMAGE_TOOLS, VIDEO_TOOLS } from "@/lib/prompts/creative-prompts";
import { safeHref } from "@/lib/utils";
import type { GeneratorConfig } from "@/lib/generator-config";

const config: GeneratorConfig<ContentCalendarInput & Record<string, unknown>> = {
  title: "Social Media Content Calendar",
  subtitle: "Per-day organic posts across platforms · captions, hashtags, video/image prompts with tool recommendations + links.",
  platform: "meta",
  campaign_type: "Content Calendar",
  maxTokens: 6500,
  temperature: 0.85,
  fields: [
    {
      name: "duration",
      label: "Duration",
      kind: "select",
      options: [
        { value: "1_week", label: "1 week (7 days)" },
        { value: "2_weeks", label: "2 weeks (14 days)" },
        { value: "1_month", label: "1 month (30 days)" },
      ],
    },
    { name: "cadence_per_week", label: "Posts/week per platform", kind: "number", required: true, placeholder: "3" },
    { name: "platforms", label: "Platforms (comma-separated)", kind: "text", required: true, placeholder: "Instagram, TikTok, LinkedIn", span: 2 },
    { name: "pillars", label: "Content pillars (themes — comma-separated)", kind: "textarea", required: true, rows: 2, placeholder: "Founder stories · How-tos · Customer wins · Industry takes · Behind the scenes", span: 2 },
    { name: "primary_goal", label: "Primary goal", kind: "select", options: [
      { value: "awareness", label: "Awareness" },
      { value: "engagement", label: "Engagement" },
      { value: "lead gen", label: "Lead generation" },
      { value: "nurture", label: "Nurture" },
      { value: "sales", label: "Sales" },
    ] },
    { name: "voice_notes", label: "Voice notes (optional)", kind: "text", placeholder: "Punchy, no jargon" },
    { name: "posting_window", label: "Posting window (optional)", kind: "text", placeholder: "weekdays 8am-6pm" },
    { name: "region_or_timezone", label: "Region / timezone", kind: "text", placeholder: "US East / Mumbai / London" },
  ],
  initial: {
    duration: "1_week", cadence_per_week: 3, platforms: "", pillars: "",
    primary_goal: "engagement", voice_notes: "", posting_window: "", region_or_timezone: "",
  } as any,
  buildPrompt: (input) => buildContentCalendarPrompt(input as unknown as ContentCalendarInput),
  buildTitle: (i: any) => `Calendar · ${i.duration} · ${i.platforms?.slice(0, 24)}`,
  expectJson: true,
  schema: ContentCalendarSchema,
  renderJson: (json) => <CalendarOutput json={json} />,
};

export default function Page() {
  return <GeneratorShell config={config} scope="generate/content-calendar" />;
}

function CalendarOutput({ json }: { json: any }) {
  const calendar = json?.calendar ?? [];
  const byPlatform: Record<string, any[]> = {};
  for (const p of calendar) {
    const k = p.platform || "other";
    (byPlatform[k] = byPlatform[k] || []).push(p);
  }

  return (
    <div className="space-y-4 stagger">
      {json?.weekly_summary ? (
        <Section title="Summary">
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="border border-base-700 p-3">
              <div className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint">total posts</div>
              <div className="font-display italic text-3xl text-live tabular">{json.weekly_summary.total_posts ?? calendar.length}</div>
            </div>
            <div className="border border-base-700 p-3">
              <div className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint mb-1">by platform</div>
              {(json.weekly_summary.by_platform ?? []).map((x: any, i: number) => (
                <div key={i} className="text-ink"><span className="font-mono tabular text-live">{x.count}</span> {x.platform}</div>
              ))}
            </div>
            <div className="border border-base-700 p-3">
              <div className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint mb-1">by format</div>
              {(json.weekly_summary.by_format ?? []).map((x: any, i: number) => (
                <div key={i} className="text-ink"><span className="font-mono tabular text-live">{x.count}</span> {x.format}</div>
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      {json?.theme_rotation?.length ? (
        <Section title="Theme rotation">
          <div className="flex flex-wrap gap-1.5">
            {json.theme_rotation.map((t: any, i: number) => (
              <span key={i} className="border border-base-700 bg-base-900/30 px-2 py-1 text-xs">
                <span className="text-live font-medium">{t.pillar}</span>
                <span className="text-ink-subtle ml-1">→ days {t.days?.join(", ")}</span>
              </span>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title={`Calendar · ${calendar.length} posts`}>
        <div className="space-y-2">
          {calendar.map((p: any, i: number) => <PostCard key={i} post={p} />)}
        </div>
      </Section>

      {json?.asset_budget_estimate ? (
        <Section title="Asset-generation budget">
          <ul className="space-y-1.5 text-sm">
            <li className="border border-base-700 p-2"><Pill text="free only" tone="pos" /> <span className="text-ink">{json.asset_budget_estimate.free_only_path}</span></li>
            <li className="border border-base-700 p-2"><Pill text="freemium" tone="live" /> <span className="text-ink">{json.asset_budget_estimate.freemium_path}</span></li>
            <li className="border border-base-700 p-2"><Pill text="premium" /> <span className="text-ink">{json.asset_budget_estimate.premium_path}</span></li>
          </ul>
        </Section>
      ) : null}

      {json?.spare_hooks_for_underperformers?.length ? (
        <Section title="Spare hooks for under-performers">
          <ul className="space-y-1 text-sm text-ink">
            {json.spare_hooks_for_underperformers.map((h: string, i: number) => <li key={i} className="border border-base-700 px-2 py-1">{h}</li>)}
          </ul>
        </Section>
      ) : null}

      <Section title="AI tools directory (links)">
        <div className="grid md:grid-cols-2 gap-3">
          <ToolBox title="Image generators" tools={IMAGE_TOOLS} />
          <ToolBox title="Video generators" tools={VIDEO_TOOLS} />
        </div>
      </Section>
    </div>
  );
}

function PostCard({ post }: { post: any }) {
  const tools = (post.recommended_ai_tool?.url ?? "").includes("video") || /runway|pika|luma|sora|kling|heygen|synthesia|captions|descript|canva.*video|canva\.com\/magic-video/i.test(post.recommended_ai_tool?.url ?? "") ? VIDEO_TOOLS : IMAGE_TOOLS;
  // safeHref blocks javascript: / data: / vbscript: schemes that a
  // prompt-injected page could trick the AI into emitting. AI URLs cannot
  // be trusted as <a href> without this check. (Audit MEDIUM-1.)
  const toolUrl = safeHref(post.recommended_ai_tool?.url) || tools.find((t) => t.name.toLowerCase().includes((post.recommended_ai_tool?.name ?? "").toLowerCase().split(" ")[0]))?.url;
  return (
    <div className="border border-base-700 bg-base-900/30 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[10px] tabular text-ink-faint">day {String(post.day).padStart(2, "0")}</span>
        <Pill text={post.platform} tone="live" />
        <Pill text={post.format} />
        <span className="text-[10px] font-mono uppercase tracking-ui-wide text-ink-subtle">{post.pillar}</span>
        <span className="ml-auto text-[10px] font-mono text-ink-faint">{post.best_post_time_local}</span>
      </div>

      <p className="font-display italic text-base text-live leading-tight">{post.hook}</p>

      <div className="border-t border-base-700 pt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint">caption · {post.caption_chars} chars</span>
          <CopyButton text={post.caption + "\n\n" + (post.hashtags || []).join(" ")} label="copy" />
        </div>
        <p className="text-sm text-ink whitespace-pre-line">{post.caption}</p>
        {post.hashtags?.length ? (
          <p className="text-[11px] text-info font-mono mt-2">{post.hashtags.join(" ")}</p>
        ) : null}
      </div>

      {post.engagement_hook ? (
        <p className="text-[11px] text-pos border-t border-base-700 pt-2">→ {post.engagement_hook}</p>
      ) : null}

      <div className="border-t border-base-700 pt-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint">visual brief</span>
          <Pill text={post.recommended_ai_tool?.tier ?? "free"} tone={post.recommended_ai_tool?.tier === "free" ? "pos" : post.recommended_ai_tool?.tier === "paid" ? "default" : "live"} />
          {toolUrl ? (
            <a href={toolUrl} target="_blank" rel="noreferrer" className="text-[10px] font-mono uppercase tracking-ui-wide text-info hover:underline inline-flex items-center gap-1">
              open {post.recommended_ai_tool?.name} <ExternalLink size={9} />
            </a>
          ) : null}
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">{post.visual_brief}</p>
        {post.recommended_ai_tool?.why_this_tool ? (
          <p className="text-[11px] text-ink-subtle italic">{post.recommended_ai_tool.why_this_tool}</p>
        ) : null}
        {post.video_overlay_text ? (
          <p className="text-[11px] text-live font-mono">overlay: {post.video_overlay_text}</p>
        ) : null}
        <CopyButton text={post.visual_brief} label="copy visual brief" />
      </div>
    </div>
  );
}

function ToolBox({ title, tools }: { title: string; tools: typeof IMAGE_TOOLS }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint mb-2">{title}</div>
      <ul className="space-y-1 text-xs">
        {tools.map((t) => (
          <li key={t.name} className="border border-base-700 px-2 py-1.5">
            <div className="flex items-center gap-2">
              <a href={t.url} target="_blank" rel="noreferrer" className="text-info hover:underline font-medium inline-flex items-center gap-1">
                {t.name} <ExternalLink size={9} />
              </a>
              <span className="ml-auto text-[10px] font-mono uppercase tracking-ui-wide text-ink-faint">{t.cost}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
