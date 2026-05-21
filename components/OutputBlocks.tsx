"use client";

import { CharBadge } from "./CharBadge";
import { CopyButton } from "./CopyButton";

export function Section({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-base-600 bg-base-900/40 p-5">
      <div className="flex items-center justify-between mb-3 border-b border-base-700 pb-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-ink">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Kv({ k, v, pos }: { k: string; v: string | number; pos?: boolean }) {
  return (
    <div className="flex items-center gap-2 border border-base-700 bg-base-900/30 px-2 py-1.5">
      <span className="text-ink-faint uppercase tracking-ui-mega text-[10px] font-mono">{k}</span>
      <span className="flex-1" />
      <span className={`${pos === undefined ? "text-ink" : pos ? "text-pos" : "text-neg"} font-mono text-xs tabular`}>
        {v}
      </span>
    </div>
  );
}

export function Pill({
  text,
  tone = "default",
  label,
}: {
  text: string;
  tone?: "default" | "live" | "pos" | "neg" | "info";
  label?: string;
}) {
  const toneMap: Record<string, string> = {
    default: "border-base-600 text-ink",
    live: "border-live/40 text-live",
    pos: "border-pos/40 text-pos",
    neg: "border-neg/40 text-neg",
    info: "border-info/40 text-info",
  };
  // Color-only state is invisible to color-blind users. When the pill carries
  // state via tone (not just decoration), expose the semantic via aria-label
  // so screen readers + assistive tech announce "warning: kill", "good: scale"
  // etc. — not just "kill".
  const toneAnnounce: Record<string, string> = {
    default: "",
    live: "active: ",
    pos: "good: ",
    neg: "warning: ",
    info: "info: ",
  };
  const announce = toneAnnounce[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 border bg-base-900/30 px-2 py-1 text-[11px] ${toneMap[tone]}`}
      aria-label={announce ? `${announce}${label ? `${label} ` : ""}${text}` : undefined}
    >
      {label ? <span className="font-mono uppercase tracking-ui-mega text-[9px] text-ink-faint">{label}</span> : null}
      {text}
    </span>
  );
}

export function LineItem({
  count,
  max,
  angle,
  text,
  trimmedAlt,
  status,
}: {
  count: number;
  max: number;
  angle?: string;
  text: string;
  trimmedAlt?: string | null;
  status?: "ok" | "over" | string;
}) {
  return (
    <li className="flex items-center gap-2 py-1.5">
      <CharBadge count={count} max={max} />
      {angle ? <span className="w-20 text-[9px] font-mono uppercase tracking-ui-mega text-ink-faint">{angle}</span> : null}
      <span className={`text-sm flex-1 truncate ${status === "over" ? "line-through text-ink-subtle" : "text-ink"}`}>
        {text}
      </span>
      {trimmedAlt ? <span className="text-[10px] text-pos font-mono">→ {trimmedAlt}</span> : null}
      <CopyButton text={trimmedAlt || text} label="" />
    </li>
  );
}

export function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const tone = score >= 7 ? "bg-pos" : score >= 4 ? "bg-live" : "bg-neg";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <span className="font-mono text-xs tabular text-ink w-8">{score}/{max}</span>
      <div className="flex-1 h-1.5 bg-base-700 relative overflow-hidden">
        <div className={`absolute inset-y-0 left-0 ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
