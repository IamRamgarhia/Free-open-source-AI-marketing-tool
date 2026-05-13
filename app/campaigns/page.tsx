"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, FolderOpen, Loader2, Download } from "lucide-react";
import { ApiKeyGate } from "@/components/ApiKeyGate";
import { PageHeader } from "@/components/PageHeader";
import { Section, Pill } from "@/components/OutputBlocks";
import { listCampaigns, saveCampaign, deleteCampaign, listAds, type Campaign, type GeneratedAd } from "@/lib/storage";
import { getActiveBrainId } from "@/lib/settings";
import { showUndoToast } from "@/components/UndoToast";

const STATUS_TONE: Record<Campaign["status"], "live" | "pos" | "default" | "neg"> = {
  planning: "default",
  live: "live",
  paused: "default",
  done: "pos",
};

export default function CampaignsPage() {
  return (
    <ApiKeyGate>
      <Inner />
    </ApiKeyGate>
  );
}

function Inner() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ads, setAds] = useState<GeneratedAd[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const id = getActiveBrainId();
    setActiveBrandId(id);
    const [c, a] = await Promise.all([listCampaigns(id ?? undefined), listAds({ brand_id: id ?? undefined })]);
    setCampaigns(c);
    setAds(a);
  }

  useEffect(() => {
    refresh();
    const h = () => refresh();
    window.addEventListener("ados:brains-changed", h);
    return () => window.removeEventListener("ados:brains-changed", h);
  }, []);

  async function create() {
    if (!name.trim() || !activeBrandId) return;
    setSaving(true);
    await saveCampaign({
      id: crypto.randomUUID(),
      brand_id: activeBrandId,
      name: name.trim(),
      goal: goal.trim(),
      status: "planning",
      created_at: Date.now(),
    });
    setName("");
    setGoal("");
    setCreating(false);
    setSaving(false);
    refresh();
  }

  function adsFor(campaign_id: string) {
    return ads.filter((a) => a.campaign_id === campaign_id);
  }

  function exportCampaign(c: Campaign) {
    const items = adsFor(c.id);
    if (!items.length) return;
    const created = new Date(c.created_at).toLocaleString();
    const lines: string[] = [
      `# ${c.name}`,
      ``,
      `**Status:** ${c.status} · **Goal:** ${c.goal || "—"} · **Created:** ${created}`,
      c.notes ? `\n${c.notes}\n` : "",
      `---`,
      ``,
    ];
    for (const a of items) {
      lines.push(`## ${a.title}`);
      lines.push(``);
      lines.push(`> ${a.platform} · ${a.campaign_type} · ${a.status} · ${new Date(a.created_at).toLocaleDateString()} · $${(a.cost_usd ?? 0).toFixed(4)}`);
      lines.push(``);
      if (a.notes) lines.push(`_${a.notes}_\n`);
      lines.push("```");
      lines.push(a.output_text);
      lines.push("```");
      lines.push(``);
      lines.push(`---`);
      lines.push(``);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${c.name.replace(/[^a-z0-9-_ ]/gi, "_")}-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        scope="campaigns"
        title="Campaigns"
        subtitle="Group ads into named campaigns. Track planning → live → done. Scoped to active brand."
      />

      {!activeBrandId ? (
        <div className="border border-live/30 bg-live/5 text-live text-sm px-4 py-3 mb-4">
          No active brand. <Link href="/brand" className="underline">Set one</Link> first.
        </div>
      ) : null}

      <div className="mb-4">
        {creating ? (
          <div className="border border-base-600 bg-base-900/40 p-4 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="label">Campaign name *</label>
                <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="Q3 trial blitz" autoFocus />
              </div>
              <div>
                <label className="label">Goal</label>
                <input className="input-base" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="1,000 trial signups" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={create} disabled={saving || !name.trim()} className="btn-primary">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                Create
              </button>
              <button onClick={() => { setCreating(false); setName(""); setGoal(""); }} className="btn-ghost">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} disabled={!activeBrandId} className="btn-primary">
            <Plus size={11} /> New campaign
          </button>
        )}
      </div>

      {campaigns.length === 0 ? (
        <div className="border border-base-600 bg-base-900/40 px-4 py-3 text-sm text-ink-muted">
          No campaigns yet. Create one above, then assign ads to it from the History page.
        </div>
      ) : (
        <div className="space-y-2 stagger">
          {campaigns.map((c) => {
            const items = adsFor(c.id);
            return (
              <div key={c.id} className="border border-base-600 bg-base-900/40 p-4">
                <div className="flex items-start gap-3">
                  <FolderOpen size={16} className="text-live mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display italic text-xl text-ink">{c.name}</span>
                      <Pill text={c.status} tone={STATUS_TONE[c.status]} />
                      <span className="text-[11px] text-ink-faint">created {new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    {c.goal ? <p className="text-sm text-ink-muted mt-1">{c.goal}</p> : null}
                    <div className="text-[12px] text-ink-muted mt-2">
                      {items.length === 0 ? "No ads assigned yet." : `${items.length} ad${items.length === 1 ? "" : "s"} grouped`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {(["planning", "live", "paused", "done"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => saveCampaign({ ...c, status: s }).then(refresh)}
                        className={`border px-2 py-0.5 text-[10px] uppercase tracking-wider ${c.status === s ? "border-live text-live bg-live/10" : "border-base-700 text-ink-muted hover:text-ink"}`}
                      >
                        {s}
                      </button>
                    ))}
                    <button
                      onClick={() => exportCampaign(c)}
                      disabled={items.length === 0}
                      className="btn-ghost disabled:opacity-30"
                      title={items.length ? `Download all ${items.length} assets as one markdown file` : "No assets to export"}
                    >
                      <Download size={11} />
                    </button>
                    <button
                      onClick={async () => {
                        await deleteCampaign(c.id);
                        refresh();
                        showUndoToast({
                          message: `Deleted "${c.name}"`,
                          undo: async () => {
                            await saveCampaign({ ...c, deleted_at: undefined } as any);
                            refresh();
                          },
                        });
                      }}
                      className="btn-ghost hover:text-neg"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
