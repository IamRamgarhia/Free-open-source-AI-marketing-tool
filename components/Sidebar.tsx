"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-config";

export function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of NAV_GROUPS) init[g.title] = g.defaultOpen ?? false;
    return init;
  });

  return (
    <aside className="hidden md:flex w-[268px] shrink-0 flex-col border-r border-base-600 bg-base-950/70 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-base-600">
        <Link href="/" className="flex items-center gap-2 group" aria-label="AdForge dashboard">
          <div className="h-9 w-9 bg-live grid place-items-center text-base-950 font-bold font-display italic text-xl">
            A
          </div>
          <div className="leading-tight">
            <div className="font-display italic text-2xl text-ink group-hover:text-live transition">AdForge</div>
            <div className="text-[11px] text-ink-subtle">ai ads · byok · local</div>
          </div>
        </Link>
        <Link
          href="/about"
          className="ml-auto text-[11px] text-live hover:underline shrink-0 font-medium"
          aria-label="About Dicecodes"
        >
          by Dicecodes
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-2">
        {NAV_GROUPS.map((g) => (
          <div key={g.title}>
            <button
              onClick={() => setOpen((s) => ({ ...s, [g.title]: !s[g.title] }))}
              className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted hover:text-ink transition"
            >
              <span>{g.title}</span>
              {open[g.title] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {open[g.title] ? (
              <div className="mt-1 space-y-0.5">
                {g.items.map((item) => {
                  const active = path === item.href || (item.href !== "/" && path?.startsWith(item.href));
                  const href = item.query ? `${item.href}?${item.query}` : item.href;
                  // Tools repeated across platform groups need a stable React key.
                  const linkKey = `${g.title}::${item.href}::${item.query ?? ""}`;
                  return (
                    <Link
                      key={linkKey}
                      href={href}
                      className={cn(
                        "group flex items-center gap-2 px-3 py-2 text-sm transition border-l-2",
                        active
                          ? "bg-base-800/80 text-ink border-live font-medium"
                          : "text-ink-muted hover:text-ink hover:bg-base-800/40 border-transparent hover:border-base-500"
                      )}
                    >
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        ))}
      </nav>

      <div className="border-t border-base-600 px-4 py-3 text-[11px] text-ink-muted leading-relaxed">
        Zero backend · zero telemetry
        <br />
        <span className="text-ink-subtle">Your key · your data</span>
      </div>
    </aside>
  );
}
