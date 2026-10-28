// Team-only go-to-market plan: positioning, packages and pricing, the ranked
// hit list of firms, a 12-week sequence, outreach copy and risks. Nothing
// about the plan lives in this repository: the content is fetched, after a
// team password, from the team-gtm edge function, which reads it from the
// database. The page is not indexed and is not linked from the app.
import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock, Download, Printer, ChevronDown } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/team-gtm`;
const TOKEN_KEY = "team_gtm_token";
const EXPIRY_KEY = "team_gtm_expires";

interface Segment { id: string; count: number; name: string; short: string; who: string; why: string; offer: string; channel: string }
interface Pkg { id: string; name: string; price: string; billing: string; exists: string; forWhom: string; includes: string[]; role: string }
interface HitRow {
  order: number; firm: string; domain: string; segment: string; wave: number; size: string; total: number;
  pillars: { website: number; social: number; search: number; thought: number; recognition: number };
  standing: string; opportunity: number; offer: string; why: string; angle: string; who: string; check: string;
}
interface Scenario { lines: { item: string; count: number; unit: number; math: string; revenue: number }[]; total: number }
interface Plan {
  generatedAt: string; market: string;
  basis: { firmsAnalysed: number; source: string; caveats: string[] };
  summary: { headline: string; bullets: string[] };
  positioning: { oneLiner: string; whoFor: string; whyUs: string[]; whyNow: string[]; team: string[] };
  segments: Segment[];
  waves: { wave: number; label: string; focus: string; firms: number; goal: string }[];
  packages: Pkg[];
  founding: { name: string; terms: string; why: string; earlyAccess: string };
  pricingLogic: string[];
  scenarios: { note: string; conservative: Scenario; base: Scenario; stretch: Scenario };
  hitList: HitRow[];
  sequence: { weeks: string; tasks: string[] }[];
  messaging: { id: string; title: string; subject: string; body: string }[];
  discovery: string[];
  objections: { q: string; a: string }[];
  kpis: { metric: string; target: string; why: string }[];
  risks: { risk: string; mitigation: string }[];
  decisions: string[];
}

const TABS = ["Overview", "Packages & pricing", "Hit list", "12-week plan", "Messaging", "Risks & decisions"] as const;
type Tab = (typeof TABS)[number];

const eur = (n: number) => `€${n.toLocaleString("en-US")}`;

async function call(body: Record<string, unknown>) {
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

const readToken = (): string | null => {
  try {
    const exp = parseInt(sessionStorage.getItem(EXPIRY_KEY) || "0", 10);
    const tok = sessionStorage.getItem(TOKEN_KEY);
    return tok && exp > Date.now() ? tok : null;
  } catch { return null; }
};

const card = "bg-card border border-border/50 rounded-sm";
const eyebrow = "eyebrow text-[10px] text-primary mb-2";
const body = "text-sm text-foreground/90 font-body leading-relaxed";

const List = ({ items }: { items: string[] }) => (
  <ul className="space-y-1.5">
    {items.map((t, i) => (
      <li key={i} className={`${body} flex gap-2`}><span className="text-primary mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />{t}</li>
    ))}
  </ul>
);

const Gate = ({ onToken }: { onToken: (t: string) => void }) => {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true); setErr("");
    const { ok, data } = await call({ action: "login", password: pw }).catch(() => ({ ok: false, data: { error: "Couldn't reach the server." } }));
    setBusy(false);
    if (!ok || !data.token) { setErr((data as { error?: string }).error || "Couldn't sign in."); return; }
    try {
      sessionStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + (data.ttlMs ?? 8 * 3600_000)));
    } catch { /* session storage blocked: stay signed in for this view only */ }
    onToken(data.token);
  };
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <form onSubmit={submit} className={`${card} p-8 w-full max-w-sm space-y-4`}>
        <div className="flex items-center gap-2 text-primary"><Lock className="w-4 h-4" /><span className="eyebrow text-[10px]">Team only</span></div>
        <h1 className="font-display text-2xl text-foreground">Go-to-market</h1>
        <p className="text-xs text-muted-foreground font-body">This page is for the Uvid team. Enter the team password.</p>
        <input
          type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="current-password"
          aria-label="Team password" placeholder="Team password"
          className="w-full bg-secondary/80 border border-border text-foreground placeholder:text-muted-foreground text-sm font-body px-3 py-2.5 rounded-sm focus:outline-none focus:border-primary"
        />
        {err && <p className="text-xs text-destructive font-body" role="alert">{err}</p>}
        <button type="submit" disabled={!pw || busy} className="w-full bg-primary text-primary-foreground py-2.5 text-sm font-body font-medium rounded-sm disabled:opacity-40 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Continue
        </button>
      </form>
    </div>
  );
};

const Overview = ({ plan }: { plan: Plan }) => (
  <div className="space-y-8">
    <section className={`${card} p-6`}>
      <p className={eyebrow}>The plan in one paragraph</p>
      <p className="font-display text-xl text-foreground leading-snug">{plan.summary.headline}</p>
      <div className="mt-4"><List items={plan.summary.bullets} /></div>
    </section>

    <section className="grid md:grid-cols-2 gap-6">
      <div className={`${card} p-6`}>
        <p className={eyebrow}>What Uvid is</p>
        <p className={body}>{plan.positioning.oneLiner}</p>
        <p className={`${eyebrow} mt-5`}>Who it's for</p>
        <p className={body}>{plan.positioning.whoFor}</p>
      </div>
      <div className={`${card} p-6 space-y-5`}>
        <div><p className={eyebrow}>Why us</p><List items={plan.positioning.whyUs} /></div>
        <div><p className={eyebrow}>Why now</p><List items={plan.positioning.whyNow} /></div>
      </div>
    </section>

    <section className={`${card} p-6`}>
      <p className={eyebrow}>What the product does, and what the people add</p>
      <List items={plan.positioning.team} />
    </section>

    <section>
      <p className={eyebrow}>Who to go after: the segments</p>
      <div className="grid md:grid-cols-2 gap-4">
        {plan.segments.map((s) => (
          <div key={s.id} className={`${card} p-5 space-y-2`}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-lg text-foreground">{s.name}</h3>
              <span className="text-xs text-primary font-body shrink-0">{s.count} firms</span>
            </div>
            <p className="text-xs text-muted-foreground font-body">{s.who}</p>
            <p className={body}><span className="text-foreground font-medium">Why: </span>{s.why}</p>
            <p className={body}><span className="text-foreground font-medium">Sell: </span>{s.offer}</p>
            <p className={body}><span className="text-foreground font-medium">How: </span>{s.channel}</p>
          </div>
        ))}
      </div>
    </section>

    <section>
      <p className={eyebrow}>In what order: the waves</p>
      <div className="grid md:grid-cols-4 gap-4">
        {plan.waves.map((w) => (
          <div key={w.wave} className={`${card} p-4 space-y-1.5`}>
            <p className="text-xs text-primary font-body">{w.label}</p>
            <p className="font-display text-2xl text-foreground">{w.firms} <span className="text-xs text-muted-foreground font-body">firms</span></p>
            <p className="text-xs text-muted-foreground font-body">{w.focus}</p>
            <p className="text-xs text-foreground/90 font-body">{w.goal}</p>
          </div>
        ))}
      </div>
    </section>

    <section className={`${card} p-6`}>
      <p className={eyebrow}>Read this before using the numbers</p>
      <List items={plan.basis.caveats} />
      <p className="text-[11px] text-muted-foreground font-body mt-3">Basis: {plan.basis.source} Plan generated {plan.generatedAt}.</p>
    </section>
  </div>
);

const Packages = ({ plan }: { plan: Plan }) => (
  <div className="space-y-8">
    <div className="grid md:grid-cols-2 gap-4">
      {plan.packages.map((p) => (
        <div key={p.id} className={`${card} p-5 space-y-2`}>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h3 className="font-display text-lg text-foreground">{p.name}</h3>
            <span className="text-sm text-primary font-body font-medium">{p.price}</span>
          </div>
          <p className="text-xs text-muted-foreground font-body">{p.billing} · {p.exists}</p>
          <p className={body}><span className="text-foreground font-medium">For: </span>{p.forWhom}</p>
          <List items={p.includes} />
          <p className="text-xs text-muted-foreground font-body italic">{p.role}</p>
        </div>
      ))}
    </div>

    <section className={`${card} p-6 space-y-3`}>
      <p className={eyebrow}>{plan.founding.name}</p>
      <p className={body}>{plan.founding.terms}</p>
      <p className={body}>{plan.founding.why}</p>
      <p className={`${body} text-primary`}>{plan.founding.earlyAccess}</p>
    </section>

    <section className={`${card} p-6`}>
      <p className={eyebrow}>How the prices were set</p>
      <List items={plan.pricingLogic} />
    </section>

    <section className={`${card} p-6 overflow-x-auto`}>
      <p className={eyebrow}>Twelve-month arithmetic (illustrative, not a forecast)</p>
      <p className="text-xs text-muted-foreground font-body mb-4">{plan.scenarios.note}</p>
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="text-left text-[11px] text-muted-foreground">
            <th className="py-2 pr-4 font-normal">Line</th>
            <th className="py-2 pr-4 font-normal text-right">Conservative</th>
            <th className="py-2 pr-4 font-normal text-right">Base</th>
            <th className="py-2 font-normal text-right">Stretch</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {plan.scenarios.base.lines.map((l, i) => (
            <tr key={l.item}>
              <td className="py-2 pr-4 text-foreground/90">{l.item}</td>
              <td className="py-2 pr-4 text-right">{eur(plan.scenarios.conservative.lines[i].revenue)}</td>
              <td className="py-2 pr-4 text-right">{eur(l.revenue)}</td>
              <td className="py-2 text-right">{eur(plan.scenarios.stretch.lines[i].revenue)}</td>
            </tr>
          ))}
          <tr className="font-medium text-foreground">
            <td className="py-2 pr-4">Total</td>
            <td className="py-2 pr-4 text-right">{eur(plan.scenarios.conservative.total)}</td>
            <td className="py-2 pr-4 text-right">{eur(plan.scenarios.base.total)}</td>
            <td className="py-2 text-right">{eur(plan.scenarios.stretch.total)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-[11px] text-muted-foreground font-body mt-3">Base case: {plan.scenarios.base.lines.map((l) => l.math).join("; ")}.</p>
    </section>
  </div>
);

const SIZE_LABEL: Record<string, string> = { solo: "Solo", boutique_2_10: "2–10 lawyers", mid_11_50: "11–50 lawyers", large_51_200: "51–200 lawyers", unknown: "Size unknown" };

const HitList = ({ plan }: { plan: Plan }) => {
  const [wave, setWave] = useState<number | "all">("all");
  const [seg, setSeg] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const segName = useMemo(() => Object.fromEntries(plan.segments.map((s) => [s.id, s.short])), [plan.segments]);

  const rows = plan.hitList.filter((r) =>
    (wave === "all" || r.wave === wave) && (seg === "all" || r.segment === seg) &&
    (!q.trim() || `${r.firm} ${r.domain}`.toLowerCase().includes(q.trim().toLowerCase())));

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["Order", "Firm", "Domain", "Segment", "Wave", "Total /500", "Offer", "Why", "Who to approach", "Check first"];
    const lines = [head.map(esc).join(",")].concat(
      rows.map((r) => [r.order, r.firm, r.domain, segName[r.segment] ?? r.segment, r.wave, r.total, r.offer, r.why, r.who, r.check].map(esc).join(",")),
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "uvid-hit-list.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const chip = (active: boolean) => `px-2.5 py-1 rounded-sm border text-xs font-body ${active ? "border-primary bg-primary/10 text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-body">
        {plan.hitList.length} firms, in the order to approach them. Within a wave, firms are ordered by how much they have to gain and how well they can pay. Contact names are not included; find the right person yourself.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button className={chip(wave === "all")} onClick={() => setWave("all")}>All waves</button>
        {plan.waves.map((w) => <button key={w.wave} className={chip(wave === w.wave)} onClick={() => setWave(w.wave)}>Wave {w.wave} ({w.firms})</button>)}
        <select value={seg} onChange={(e) => setSeg(e.target.value)} aria-label="Segment" className="bg-background border border-border rounded-sm px-2 py-1 text-xs font-body">
          <option value="all">All segments</option>
          {plan.segments.map((s) => <option key={s.id} value={s.id}>{s.short} ({s.count})</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a firm" aria-label="Find a firm" className="bg-background border border-border rounded-sm px-2 py-1 text-xs font-body w-40" />
        <span className="flex-1" />
        <button onClick={exportCsv} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"><Download className="w-3 h-3" /> CSV ({rows.length})</button>
      </div>

      <div className={`${card} divide-y divide-border/40`}>
        {rows.length === 0 && <p className="p-5 text-sm text-muted-foreground font-body">No firms match.</p>}
        {rows.map((r) => {
          const isOpen = open === r.order;
          return (
            <div key={r.order}>
              <button onClick={() => setOpen(isOpen ? null : r.order)} aria-expanded={isOpen} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-secondary/30">
                <span className="w-7 text-xs text-muted-foreground font-body tabular-nums shrink-0">{r.order}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-foreground font-body truncate">{r.firm}</span>
                  <span className="block text-[11px] text-muted-foreground font-body truncate">{segName[r.segment] ?? r.segment} · Wave {r.wave} · {SIZE_LABEL[r.size] ?? r.size}</span>
                </span>
                <span className="text-xs text-foreground/90 font-body tabular-nums shrink-0">{r.total}/500</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pl-14 space-y-2">
                  <p className={body}><span className="text-foreground font-medium">Sell: </span>{r.offer}</p>
                  <p className={body}><span className="text-foreground font-medium">Why: </span>{r.why}</p>
                  <p className={body}><span className="text-foreground font-medium">Angle: </span>{r.angle}</p>
                  <p className={body}><span className="text-foreground font-medium">Approach: </span>{r.who}</p>
                  <p className="text-[11px] text-muted-foreground font-body">
                    Website {r.pillars.website}/50 · Social {r.pillars.social}/75 · Search {r.pillars.search}/100 · Thought leadership {r.pillars.thought}/150 · Recognition {r.pillars.recognition}/125 · {r.domain}
                  </p>
                  {r.check && <p className="text-xs text-primary font-body">Check first: {r.check}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Sequence = ({ plan }: { plan: Plan }) => (
  <div className="space-y-8">
    <div className="space-y-3">
      {plan.sequence.map((s) => (
        <div key={s.weeks} className={`${card} p-5 grid md:grid-cols-[9rem_1fr] gap-3`}>
          <p className="font-display text-lg text-foreground">{s.weeks}</p>
          <List items={s.tasks} />
        </div>
      ))}
    </div>
    <section className={`${card} p-6 overflow-x-auto`}>
      <p className={eyebrow}>What to measure</p>
      <table className="w-full text-sm font-body">
        <tbody className="divide-y divide-border/40">
          {plan.kpis.map((k) => (
            <tr key={k.metric} className="align-top">
              <td className="py-2 pr-4 text-foreground">{k.metric}</td>
              <td className="py-2 pr-4 text-primary whitespace-nowrap">{k.target}</td>
              <td className="py-2 text-muted-foreground text-xs">{k.why}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  </div>
);

const Messaging = ({ plan }: { plan: Plan }) => (
  <div className="space-y-8">
    <div className="space-y-4">
      {plan.messaging.map((m) => (
        <div key={m.id} className={`${card} p-5 space-y-2`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg text-foreground">{m.title}</h3>
            <button
              onClick={() => navigator.clipboard.writeText(`${m.subject ? `Subject: ${m.subject}\n\n` : ""}${m.body}`)}
              className="text-xs text-primary hover:text-gold-light font-body"
            >Copy</button>
          </div>
          {m.subject && <p className="text-xs text-muted-foreground font-body">Subject: {m.subject}</p>}
          <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-body leading-relaxed">{m.body}</pre>
        </div>
      ))}
    </div>
    <section className="grid md:grid-cols-2 gap-6">
      <div className={`${card} p-6`}><p className={eyebrow}>Discovery questions</p><List items={plan.discovery} /></div>
      <div className={`${card} p-6 space-y-3`}>
        <p className={eyebrow}>Objections</p>
        {plan.objections.map((o) => (
          <div key={o.q}><p className="text-sm text-foreground font-body font-medium">{o.q}</p><p className={body}>{o.a}</p></div>
        ))}
      </div>
    </section>
  </div>
);

const Risks = ({ plan }: { plan: Plan }) => (
  <div className="space-y-8">
    <div className="grid md:grid-cols-2 gap-4">
      {plan.risks.map((r) => (
        <div key={r.risk} className={`${card} p-5 space-y-1.5`}>
          <p className="text-sm text-foreground font-body font-medium">{r.risk}</p>
          <p className={body}>{r.mitigation}</p>
        </div>
      ))}
    </div>
    <section className={`${card} p-6`}>
      <p className={eyebrow}>Decisions needed from you</p>
      <List items={plan.decisions} />
    </section>
  </div>
);

const TeamGtm = () => {
  const [token, setToken] = useState<string | null>(readToken);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("Overview");

  useEffect(() => {
    document.title = "Go-to-market · Team";
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const created = !meta;
    if (!meta) { meta = document.createElement("meta"); meta.name = "robots"; document.head.appendChild(meta); }
    const previous = meta.content;
    meta.content = "noindex, nofollow";
    return () => { if (created) meta?.remove(); else if (meta) meta.content = previous; };
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setError("");
    call({ action: "plan", token })
      .then(({ ok, status, data }) => {
        if (cancelled) return;
        if (status === 401) {
          try { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(EXPIRY_KEY); } catch { /* ignore */ }
          setToken(null);
          return;
        }
        if (!ok) { setError((data as { error?: string }).error || "Couldn't load the plan."); return; }
        setPlan((data as { plan: Plan }).plan);
      })
      .catch(() => !cancelled && setError("Couldn't reach the server."));
    return () => { cancelled = true; };
  }, [token]);

  if (!token) return <Gate onToken={setToken} />;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <p className="eyebrow text-[10px] text-primary mb-1">Team only · not indexed</p>
            <h1 className="font-display text-3xl text-foreground">Go-to-market and pricing</h1>
            {plan && <p className="text-xs text-muted-foreground font-body mt-1">{plan.market} · {plan.basis.firmsAnalysed} firms analysed · generated {plan.generatedAt}</p>}
          </div>
          <div className="flex gap-3 print:hidden">
            <button onClick={() => window.print()} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"><Printer className="w-3 h-3" /> Print / save as PDF</button>
            <button
              onClick={() => { try { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(EXPIRY_KEY); } catch { /* ignore */ } setPlan(null); setToken(null); }}
              className="text-xs text-muted-foreground hover:text-foreground font-body"
            >Sign out</button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive font-body" role="alert">{error}</p>}
        {!plan && !error && <div className="flex justify-center py-24"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}

        {plan && (
          <>
            <div className="flex flex-wrap gap-1.5 mb-6 print:hidden" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-sm border text-xs font-body ${tab === t ? "border-primary bg-primary/10 text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground"}`}
                >{t}</button>
              ))}
            </div>
            {tab === "Overview" && <Overview plan={plan} />}
            {tab === "Packages & pricing" && <Packages plan={plan} />}
            {tab === "Hit list" && <HitList plan={plan} />}
            {tab === "12-week plan" && <Sequence plan={plan} />}
            {tab === "Messaging" && <Messaging plan={plan} />}
            {tab === "Risks & decisions" && <Risks plan={plan} />}
          </>
        )}
      </main>
    </div>
  );
};

export default TeamGtm;
