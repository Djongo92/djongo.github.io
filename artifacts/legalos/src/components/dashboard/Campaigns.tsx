// Senior-PM idea: a light "what are we working on" layer — a named
// planned/live/done window that groups existing Workshop outputs together,
// deliberately NOT a real CRM/PM tool (out of scope for this build). See
// useCampaigns.ts / the campaigns migration for the data model, and
// campaignScoreDelta.ts for why the tie-back only ever covers Thought
// Leadership and Social — the two categories built on time-stamped,
// independently-measured signals, not a vague "score went up" claim.
import { useState } from "react";
import { Plus, X, Trash2, Link2, TrendingUp, TrendingDown } from "lucide-react";
import { useCampaigns, type CampaignStatus, type Campaign } from "@/hooks/useCampaigns";
import { useWorkshopHistory } from "@/hooks/useWorkshopHistory";
import { computeCampaignDelta } from "@/lib/campaignScoreDelta";
import type { HistoryRow } from "@/components/dashboard/CommandCenter";

interface Props {
  market: string;
  auditedDomain: string;
  history: HistoryRow[];
}

const STATUS_LABEL: Record<CampaignStatus, string> = { planned: "Planned", live: "Live", done: "Done" };
const STATUS_CLASS: Record<CampaignStatus, string> = {
  planned: "border-border/40 text-muted-foreground",
  live: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  done: "border-primary/40 bg-primary/10 text-primary",
};

interface CampaignRowProps {
  campaign: Campaign;
  history: HistoryRow[];
  save: ReturnType<typeof useCampaigns>["save"];
  remove: ReturnType<typeof useCampaigns>["remove"];
}

const CampaignRow = ({ campaign, history, save, remove }: CampaignRowProps) => {
  const { runs } = useWorkshopHistory();
  const [expanded, setExpanded] = useState(false);
  const [attaching, setAttaching] = useState(false);

  const delta = computeCampaignDelta(history, campaign);
  const linkedIds = new Set(campaign.linked_runs.map((r) => r.runId));
  const attachable = runs.filter((r) => !linkedIds.has(r.id)).slice(0, 8);

  const cycleStatus = async () => {
    const order: CampaignStatus[] = ["planned", "live", "done"];
    const next = order[(order.indexOf(campaign.status) + 1) % order.length];
    const patch: Parameters<typeof save>[0] = { id: campaign.id, name: campaign.name, status: next };
    if (next === "live" && !campaign.started_at) patch.startedAt = new Date().toISOString();
    if (next === "done" && !campaign.ended_at) patch.endedAt = new Date().toISOString();
    await save(patch);
  };

  const attachRun = async (runId: string) => {
    const run = runs.find((r) => r.id === runId);
    if (!run) return;
    await save({
      id: campaign.id,
      name: campaign.name,
      linkedRuns: [...campaign.linked_runs, { runId: run.id, toolId: run.toolId, toolLabel: run.toolLabel, title: run.title, preview: run.preview }],
    });
    setAttaching(false);
  };

  return (
    <div className="border border-border/40 rounded-sm p-3">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setExpanded((v) => !v)} className="text-left min-w-0 flex-1">
          <p className="text-sm font-body text-foreground truncate">{campaign.name}</p>
          <p className="text-[10px] text-muted-foreground font-body">{campaign.linked_runs.length} attached</p>
        </button>
        <button
          onClick={cycleStatus}
          className={`text-[10px] font-body px-2 py-1 rounded-full border shrink-0 ${STATUS_CLASS[campaign.status]}`}
        >
          {STATUS_LABEL[campaign.status]}
        </button>
        <button onClick={() => remove(campaign.id)} className="text-muted-foreground hover:text-destructive shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {delta && (
        <p className="text-[11px] font-body mt-2 text-secondary-foreground/80">
          While this ran: Thought Leadership{" "}
          <span className={delta.thoughtLeadershipDelta >= 0 ? "text-emerald-500" : "text-destructive"}>
            {delta.thoughtLeadershipDelta > 0 ? "+" : ""}{delta.thoughtLeadershipDelta}
          </span>{" "}
          · Social{" "}
          <span className={delta.socialDelta >= 0 ? "text-emerald-500" : "text-destructive"}>
            {delta.socialDelta > 0 ? "+" : ""}{delta.socialDelta}
          </span>
          {delta.thoughtLeadershipDelta > 0 || delta.socialDelta > 0 ? (
            <TrendingUp className="w-3 h-3 inline ml-1 text-emerald-500" />
          ) : (
            <TrendingDown className="w-3 h-3 inline ml-1 text-muted-foreground" />
          )}
        </p>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
          {campaign.linked_runs.map((r) => (
            <div key={r.runId} className="text-[11px] font-body text-secondary-foreground/80 flex items-center gap-1.5">
              <Link2 className="w-3 h-3 text-primary/60 shrink-0" /> {r.toolLabel}: {r.title}
            </div>
          ))}
          {attaching ? (
            <div className="space-y-1">
              {attachable.length === 0 && <p className="text-[11px] text-muted-foreground font-body italic">Nothing left to attach.</p>}
              {attachable.map((r) => (
                <button
                  key={r.id}
                  onClick={() => attachRun(r.id)}
                  className="w-full text-left text-[11px] font-body px-2 py-1.5 rounded-sm border border-border/40 text-secondary-foreground/80 hover:border-primary/40 hover:text-foreground"
                >
                  {r.toolLabel}: {r.title}
                </button>
              ))}
              <button onClick={() => setAttaching(false)} className="text-[10px] text-muted-foreground hover:text-foreground font-body">
                Done
              </button>
            </div>
          ) : (
            <button onClick={() => setAttaching(true)} className="text-[11px] text-primary hover:text-gold-light font-body inline-flex items-center gap-1">
              <Plus className="w-3 h-3" /> Attach a run
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const Campaigns = ({ market, auditedDomain, history }: Props) => {
  const { campaigns, save, remove, enabled } = useCampaigns();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  if (!enabled) return null;

  const create = async () => {
    if (!name.trim()) return;
    await save({ name: name.trim(), market, auditedDomain });
    setName("");
    setCreating(false);
  };

  return (
    <div className="bg-card/40 border border-border/30 rounded-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-base text-foreground">Campaigns</h2>
        {!creating && (
          <button onClick={() => setCreating(true)} className="text-muted-foreground hover:text-primary">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-3 flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="E.g. Q3 referral push"
            autoFocus
            className="flex-1 bg-card border border-border rounded-sm px-2.5 py-1.5 text-xs font-body focus:outline-none focus:border-primary"
          />
          <button onClick={create} className="text-xs bg-primary text-primary-foreground px-2.5 py-1.5 rounded-sm font-body">
            Add
          </button>
          <button onClick={() => setCreating(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {campaigns.length === 0 ? (
        <p className="text-xs text-muted-foreground font-body">
          Nothing in flight — group a few Workshop outputs under a named campaign to track what's actually being worked on.
        </p>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => (
            <CampaignRow key={c.id} campaign={c} history={history} save={save} remove={remove} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Campaigns;
