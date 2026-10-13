import React, { useState } from 'react';
import { Eye, Download, ShieldCheck, Check, FileText, Building2, Activity, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { platformData } from '@/data/platform';

// Everything the AmCham team can see about the member's company, on one
// page, with the controls next to it. The engagement number is the same one
// staff see; nothing is hidden and members are never ranked against each other.
export default function SeenView({ t, showToast, member }: any) {
  const k = (key: string, fb: string) => t(`portal_seen_${key}`, fb);
  const factors = (platformData.console as any).intelligence?.scoreFactors?.[member?.id];
  const [prefs, setPrefs] = useState({ intros: true, digest: true, ai: true, directory: true });

  const status = member?.lifecycle === 'at-risk'
    ? k('status_attention', 'We would like to see you more often. We noticed fewer events and no committee work this year, and your account manager will be in touch.')
    : member?.lifecycle === 'renewing'
      ? k('status_renewing', 'Your renewal is coming up. Your account manager will send a short summary of the year first.')
      : k('status_active', 'Active and well connected. Nothing for you to do.');

  const notes = [
    { title: k('note1', 'Call with your team: renewal and committee seat'), date: '2 Sep 2026' },
    { title: k('note2', 'Event follow-up: ESG roundtable'), date: '18 Jun 2026' },
    { title: k('note3', 'Introduction request handled'), date: '4 May 2026' },
  ];

  const controls: { id: keyof typeof prefs; title: string; desc: string }[] = [
    { id: 'intros', title: k('c_intros', 'Suggest introductions for us'), desc: k('c_intros_d', 'Uses your sector, events and committees to suggest other members to meet. Both sides always agree first.') },
    { id: 'digest', title: k('c_digest', 'Send us the monthly digest'), desc: k('c_digest_d', 'One email a month, put together from what is relevant to your company.') },
    { id: 'ai', title: k('c_ai', 'Let AI features use our data'), desc: k('c_ai_d', 'Only on AmCham’s private model. Your data never goes to public AI services and is never used to train them.') },
    { id: 'directory', title: k('c_directory', 'Show us in the public member directory'), desc: k('c_directory_d', 'Your name, logo, sector and website on amcham.rs.') },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="ink bg-foreground text-background rounded-[32px] p-8 md:p-12">
        <div className="text-[11px] uppercase font-bold text-[#40D9F1] tracking-widest mb-4 flex items-center gap-2"><Eye className="w-3.5 h-3.5" />{k('eyebrow', 'Full transparency')}</div>
        <h2 className="text-3xl md:text-5xl font-serif font-light mb-4">{k('title', 'What AmCham sees about you')}</h2>
        <p className="text-background/80 max-w-2xl leading-relaxed">{k('desc', 'No hidden ratings. Everything the AmCham team can see about your company is on this page, and you decide how it is used.')}</p>
        <button onClick={() => showToast(k('download_toast', 'Your data export is being prepared. We will email it within a day.'))} className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#40D9F1] text-foreground text-sm font-bold hover:bg-[#40D9F1]/90">
          <Download className="w-4 h-4" />{k('download', 'Download everything we hold')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground"><Building2 className="w-4 h-4" />{k('record', 'Your company record')}</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted-foreground">{k('company', 'Company')}</dt><dd className="text-foreground font-medium">{member?.name}</dd>
            <dt className="text-muted-foreground">{k('sector', 'Sector')}</dt><dd className="text-foreground">{member?.sector}</dd>
            <dt className="text-muted-foreground">{k('tier', 'Membership')}</dt><dd className="text-foreground">{member?.tier}</dd>
            <dt className="text-muted-foreground">{k('since', 'Member since')}</dt><dd className="text-foreground">{member?.since}</dd>
            <dt className="text-muted-foreground">{k('manager', 'Your account manager')}</dt><dd className="text-foreground">{member?.manager}</dd>
          </dl>
          <div className="rounded-xl bg-muted/50 p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{k('status', 'How our team describes your account')}</div>
            <p className="text-sm text-foreground leading-relaxed">{status}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground"><Activity className="w-4 h-4" />{k('engagement', 'Your engagement, exactly as staff see it')}</h3>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-serif font-light tabular-nums text-foreground">{factors?.total ?? member?.score}</span>
            <span className="text-muted-foreground mb-1.5">/ 100</span>
          </div>
          <p className="text-xs text-muted-foreground">{k('engagement_note', 'A measure of how much your company uses its membership. It is never compared with other members.')}</p>
          {factors?.factors && (
            <div className="space-y-3">
              {factors.factors.map((f: any) => (
                <div key={f.name}>
                  <div className="flex justify-between text-sm"><span className="text-foreground">{f.name}</span><span className="tabular-nums text-muted-foreground">{f.value}/{f.max}</span></div>
                  <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden"><div className="h-full rounded-full bg-foreground/70" style={{ width: `${(f.value / f.max) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground"><FileText className="w-4 h-4" />{k('notes', 'Notes our team keeps')}</h3>
          <ul className="divide-y divide-border">
            {notes.map(n => <li key={n.title} className="py-3 flex justify-between gap-4 text-sm"><span className="text-foreground">{n.title}</span><span className="text-muted-foreground whitespace-nowrap">{n.date}</span></li>)}
          </ul>
          <button onClick={() => showToast(k('ask_toast', 'Request sent. Your account manager will share the full notes.'))} className="text-sm font-semibold text-primary hover:underline">{k('ask', 'Ask to read the full notes')}</button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground"><Ban className="w-4 h-4" />{k('never', 'What we never keep')}</h3>
          <ul className="space-y-2 text-sm text-foreground">
            {[k('never1', 'Your individual survey answers (only combined results)'), k('never2', 'Anything about employees’ private lives'), k('never3', 'Your company’s financial data, unless you send it to us'), k('never4', 'Rankings of your company against other members')].map(x => (
              <li key={x} className="flex gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />{x}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <h3 className="font-semibold text-foreground mb-1">{k('controls', 'You decide how it is used')}</h3>
        <p className="text-sm text-muted-foreground mb-5">{k('controls_d', 'Changes apply straight away. Turning something off never affects your rights as a member.')}</p>
        <div className="divide-y divide-border">
          {controls.map(c => (
            <label key={c.id} htmlFor={`seen-${c.id}`} className="py-4 flex items-start justify-between gap-6 cursor-pointer">
              <span>
                <span className="block text-sm font-semibold text-foreground">{c.title}</span>
                <span className="block text-sm text-muted-foreground mt-0.5">{c.desc}</span>
              </span>
              <button id={`seen-${c.id}`} role="switch" aria-checked={prefs[c.id]} onClick={() => { setPrefs(p => ({ ...p, [c.id]: !p[c.id] })); showToast(k('saved', 'Preference saved.')); }}
                className={cn('relative w-11 h-6 rounded-full shrink-0 transition-colors', prefs[c.id] ? 'bg-emerald-500' : 'bg-muted-foreground/30')}>
                <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all flex items-center justify-center', prefs[c.id] ? 'left-[22px]' : 'left-0.5')}>{prefs[c.id] && <Check className="w-3 h-3 text-emerald-600" />}</span>
              </button>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
