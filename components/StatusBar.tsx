"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getActiveProviderId, getActiveModelId, getUsage, hasAnyKeyConfigured, getProviderKey } from "@/lib/settings";
import { getProvider } from "@/lib/providers";
import { formatCost } from "@/lib/utils";
import { getProviderLimits } from "@/lib/provider-limits";
import { ProviderSwitcher } from "@/components/ProviderSwitcher";
import { getQuotaSnapshot, getProviderLimitCaps, formatCountdown, type QuotaSnapshot } from "@/lib/quota-tracker";

export function StatusBar() {
  const [info, setInfo] = useState({
    providerName: "—",
    modelLabel: "—",
    hasKey: false,
    cost: 0,
    input: 0,
    output: 0,
    time: "",
    limitSummary: "",
    limitDocsUrl: "",
    hasFreeTier: false,
    quota: null as QuotaSnapshot | null,
    rpmCap: null as number | null,
    rpdCap: null as number | null,
  });

  useEffect(() => {
    const tick = () => {
      const pid = getActiveProviderId();
      const provider = getProvider(pid);
      const modelId = pid ? getActiveModelId(pid) ?? provider?.default_model ?? "—" : "—";
      const model = provider?.models.find((m) => m.id === modelId) ?? null;
      const usage = getUsage();
      const limits = getProviderLimits(pid);
      const quota = getQuotaSnapshot(pid);
      const caps = pid ? getProviderLimitCaps(pid) : { rpm: null, rpd: null };
      setInfo({
        providerName: provider?.name ?? "no provider",
        modelLabel: model?.label?.split("—")[0]?.trim() ?? modelId,
        hasKey: pid ? Boolean(getProviderKey(pid)) : hasAnyKeyConfigured(),
        cost: usage.cost,
        input: usage.input,
        output: usage.output,
        time: new Date().toTimeString().slice(0, 8),
        limitSummary: limits?.summary ?? "",
        limitDocsUrl: limits?.docs_url ?? "",
        hasFreeTier: limits?.has_free_tier ?? false,
        quota,
        rpmCap: caps.rpm,
        rpdCap: caps.rpd,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    const h = () => tick();
    window.addEventListener("ados:usage", h);
    window.addEventListener("ados:provider-changed", h);
    window.addEventListener("ados:quota-changed", h);
    window.addEventListener("storage", h);
    return () => {
      clearInterval(id);
      window.removeEventListener("ados:usage", h);
      window.removeEventListener("ados:provider-changed", h);
      window.removeEventListener("ados:quota-changed", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  return (
    <div className="sticky bottom-0 z-20 border-t border-base-600 bg-base-950/85 backdrop-blur supports-[backdrop-filter]:bg-base-950/70">
      <div className="flex items-center gap-3 px-4 md:px-10 py-2 text-[12px] text-ink-muted flex-wrap">
        <Cell>
          <span
            className={`inline-block h-2 w-2 rounded-full ${info.hasKey ? "bg-live animate-pulse-soft" : "bg-neg"}`}
          />
          <Link href="/settings" className="hover:text-ink transition font-medium" title="Provider settings">
            {info.hasKey ? "Live" : "No key"}
          </Link>
        </Cell>
        <Cell>
          <span className="text-ink-faint">Provider</span>
          <Link href="/settings" className="text-ink hover:text-live transition font-medium">{info.providerName}</Link>
          <div className="hidden md:flex"><ProviderSwitcher variant="compact" /></div>
        </Cell>
        <Cell>
          <span className="text-ink-faint">Model</span>
          <span className="text-ink font-medium">{info.modelLabel}</span>
        </Cell>
        {info.limitSummary ? (
          <Cell>
            <span className={`text-[10px] uppercase tracking-ui-wide ${info.hasFreeTier ? "text-pos" : "text-ink-subtle"} hidden md:inline`} title={info.limitSummary + (info.limitDocsUrl ? ` · ${info.limitDocsUrl}` : "")}>
              {info.hasFreeTier ? "FREE" : "PAID"} · {info.limitSummary.split("·")[0]?.replace(/^FREE/, "").replace(/^Paid/, "").trim() || "see docs"}
            </span>
          </Cell>
        ) : null}
        {info.quota ? <QuotaCell quota={info.quota} rpmCap={info.rpmCap} rpdCap={info.rpdCap} /> : null}
        <Cell>
          <span className="text-ink-faint">Spend</span>
          <span className="text-live tabular font-medium">{formatCost(info.cost)}</span>
        </Cell>
        <Cell>
          <span className="text-ink-faint">In</span>
          <span className="text-ink tabular">{info.input.toLocaleString()}</span>
        </Cell>
        <Cell>
          <span className="text-ink-faint">Out</span>
          <span className="text-ink tabular">{info.output.toLocaleString()}</span>
        </Cell>
        <div className="flex-1" />
        <Cell>
          <span className="text-ink-faint hidden md:inline">Browser-only</span>
        </Cell>
        <Cell>
          <span className="text-ink tabular font-mono">{info.time}</span>
        </Cell>
      </div>
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-2 border-r border-base-600 last:border-r-0 first:pl-0">
      {children}
    </div>
  );
}

function QuotaCell({ quota, rpmCap, rpdCap }: { quota: QuotaSnapshot; rpmCap: number | null; rpdCap: number | null }) {
  // Highest priority: provider explicitly told us we're throttled.
  if (quota.blocked_for_seconds && quota.blocked_for_seconds > 0) {
    return (
      <Cell>
        <span className="text-[10px] uppercase tracking-ui-wide text-neg font-medium" title="Provider returned 429 with a retry-after. Wait this long before the next request will succeed.">
          ⏳ rate-limited · retry in {formatCountdown(quota.blocked_for_seconds)}
        </span>
      </Cell>
    );
  }
  // Soft display: minute counter against documented cap (RPM). Day counter
  // also shown when capped (RPD), which is rarer.
  if (!rpmCap && !rpdCap) return null;
  const minuteWarn = rpmCap && quota.minute_used >= rpmCap * 0.8;
  const dayWarn = rpdCap && quota.day_used >= rpdCap * 0.8;
  const color = minuteWarn || dayWarn ? "text-live" : "text-ink-faint";
  return (
    <Cell>
      <span className={`text-[10px] uppercase tracking-ui-wide ${color} hidden md:inline tabular`} title="Local request count vs documented per-minute / per-day caps. Resets shown when known.">
        {rpmCap ? `${quota.minute_used}/${rpmCap} min` : null}
        {rpmCap && rpdCap ? " · " : null}
        {rpdCap ? `${quota.day_used}/${rpdCap} day` : null}
        {quota.minute_resets_in_seconds && quota.minute_used >= (rpmCap ?? Infinity) * 0.5 ? ` · resets ${formatCountdown(quota.minute_resets_in_seconds)}` : ""}
      </span>
    </Cell>
  );
}
