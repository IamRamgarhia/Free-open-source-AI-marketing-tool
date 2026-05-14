"use client";

import { GeneratorShell } from "@/components/GeneratorShell";
import { Section, Pill, Kv } from "@/components/OutputBlocks";
import { getCurrency } from "@/lib/currency";
import { buildBudgetPlannerPrompt, type BudgetPlannerInput } from "@/lib/prompts/budget-planner";
import type { GeneratorConfig } from "@/lib/generator-config";

const config: GeneratorConfig<BudgetPlannerInput & Record<string, unknown>> = {
  title: "Ad Budget Planner",
  subtitle: "Platform + funnel split with daily amounts, volume projection, break-even, and what NOT to spend on.",
  platform: "google",
  campaign_type: "Budget Plan",
  maxTokens: 3500,
  fields: [
    { name: "total_monthly", label: "Total monthly budget", kind: "text", required: true, placeholder: "5000", hint: "Your selected currency (see Settings)." },
    { name: "goal", label: "Goal", kind: "text", required: true, placeholder: "trial signups / sales / leads" },
    { name: "business_type", label: "Business type", kind: "text", required: true, placeholder: "B2B SaaS / ecommerce / local service" },
    { name: "current_aov_or_ltv", label: "AOV / LTV", kind: "text", placeholder: "120 LTV", hint: "Your selected currency." },
    { name: "current_cvr", label: "Site CVR (%)", kind: "text", placeholder: "2.4" },
    { name: "has_organic", label: "Organic traffic?", kind: "text", placeholder: "10k/mo SEO" },
    { name: "geo", label: "Geo", kind: "text", placeholder: "US + Canada", span: 2 },
  ],
  initial: { total_monthly: "", goal: "", business_type: "", current_aov_or_ltv: "", current_cvr: "", has_organic: "", geo: "" } as any,
  buildPrompt: (input) => buildBudgetPlannerPrompt(input as unknown as BudgetPlannerInput),
  buildTitle: (i: any) => `Budget Plan · ${i.total_monthly}/mo`,
  expectJson: true,
  renderJson: (json) => <PlannerOutput json={json} />,
};

export default function Page() {
  return <GeneratorShell config={config} scope="optimize/budget-planner" />;
}

function PlannerOutput({ json }: { json: any }) {
  // Currency symbol from user setting — the AI's field names end in _usd but
  // the user's input was typed in their currency, so we display in that currency.
  const sym = getCurrency().symbol;
  return (
    <div className="space-y-4 stagger">
      {json?.platform_split?.length ? (
        <Section title="Platform split">
          <ul className="space-y-1.5">
            {json.platform_split.map((p: any, i: number) => (
              <li key={i} className="border border-base-700 px-2 py-2 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-live w-12 tabular text-base">{p.pct}%</span>
                  <span className="text-ink font-medium w-32">{p.platform}</span>
                  <span className="text-pos font-mono tabular">{sym}{p.monthly_usd?.toLocaleString()}/mo</span>
                  <span className="text-ink-faint">·</span>
                  <span className="text-ink-muted font-mono tabular">{sym}{p.daily_usd?.toFixed(2)}/day</span>
                </div>
                <p className="text-ink-muted leading-relaxed">{p.rationale}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {json?.funnel_split_overall?.length ? (
        <Section title="Funnel split">
          <div className="grid grid-cols-3 gap-2">
            {json.funnel_split_overall.map((f: any, i: number) => (
              <div key={i} className="border border-base-700 p-3">
                <div className="text-[10px] font-mono uppercase tracking-ui-mega text-ink-faint">{f.stage}</div>
                <div className="font-display italic text-2xl text-ink mt-1 tabular">{f.pct}%</div>
                <div className="text-[11px] text-pos font-mono tabular">{sym}{f.monthly_usd?.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {json?.campaign_breakout?.length ? (
        <Section title="Campaign breakout">
          <ul className="space-y-1">
            {json.campaign_breakout.map((c: any, i: number) => (
              <li key={i} className="flex items-center gap-2 border border-base-700 px-2 py-1.5 text-xs">
                <span className="text-ink font-medium flex-1">{c.campaign_name}</span>
                <Pill text={c.platform} />
                <Pill text={c.funnel_stage} tone="live" />
                <span className="font-mono tabular text-pos w-16 text-right">{sym}{c.daily_usd?.toFixed(2)}/d</span>
                <span className="font-mono tabular text-ink-subtle w-20 text-right">{sym}{c.monthly_usd?.toLocaleString()}/mo</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {json?.volume_projection ? (
        <Section title="Volume projection">
          <div className="grid md:grid-cols-3 gap-2">
            <Kv k="impressions" v={(json.volume_projection.impressions ?? 0).toLocaleString()} />
            <Kv k="clicks" v={(json.volume_projection.clicks ?? 0).toLocaleString()} />
            <Kv k="conversions" v={(json.volume_projection.conversions ?? 0).toLocaleString()} />
            <Kv k="cpa" v={`${sym}${json.volume_projection.cpa_usd ?? 0}`} />
            <Kv k="revenue" v={`${sym}${(json.volume_projection.revenue_usd ?? 0).toLocaleString()}`} pos />
            <Kv k="roas" v={`${json.volume_projection.roas ?? 0}×`} pos />
          </div>
          <p className="text-[11px] text-ink-muted mt-3 leading-relaxed">{json.volume_projection.directional_note}</p>
        </Section>
      ) : null}

      {json?.break_even ? (
        <Section title="Break-even">
          <Kv k="cpa break-even" v={`${sym}${json.break_even.cpa_break_even_usd ?? 0}`} />
          {json.break_even.saturation_flags?.length ? (
            <div className="mt-3">
              <div className="text-[10px] font-mono uppercase tracking-ui-mega text-neg mb-1">saturation flags</div>
              <ul className="text-xs text-ink space-y-0.5">{json.break_even.saturation_flags.map((s: any, i: number) => (
                <li key={i}>{s.platform} saturates above <span className="text-neg font-mono tabular">{sym}{s.saturates_above_usd_per_day}/day</span></li>
              ))}</ul>
            </div>
          ) : null}
        </Section>
      ) : null}

      {json?.reserve ? (
        <Section title="Reserve">
          <Kv k="reserve" v={`${json.reserve.pct ?? 0}% · ${sym}${json.reserve.monthly_usd?.toLocaleString() ?? 0}`} pos />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {json.reserve.uses?.map((u: string, i: number) => <Pill key={i} text={u} />)}
          </div>
        </Section>
      ) : null}

      {json?.no_go_list?.length ? (
        <Section title="No-go list">
          <ul className="space-y-1 text-sm text-neg">{json.no_go_list.map((n: string, i: number) => <li key={i}>✕ {n}</li>)}</ul>
        </Section>
      ) : null}
    </div>
  );
}
