import React from 'react';
import { Link } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { LayoutDashboard, Smartphone, Layers, ArrowRight, Presentation, RotateCcw, CalendarCheck, Handshake } from 'lucide-react';
import { platformData } from '@/data/platform';
import { parseEuro, fmtEuro, cn } from '@/lib/utils';
import { CompanyMark } from '@/components/ui/company-mark';
import { SeamFlow } from './components/seam-flow';
import { useShowcase } from '@/components/showcase-tour';

export default function PlatformHub() {
  const { t } = useI18n();
  const { start: startShowcase } = useShowcase();

  return (
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={t('platform.hub.title')} description={t('platform.hub.desc')} />
      
      {/* Header */}
      <section className="bg-secondary text-secondary-foreground pt-14 pb-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-network-pattern opacity-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 md:px-8 relative z-10 max-w-5xl">
          <span className="text-xs font-bold uppercase tracking-widest text-accent block mb-4">{t('platform.hub.title')}</span>
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-5 text-balance">{t('platform.hub.choose_seat', 'Choose your seat.')}</h1>
          <p className="text-lg md:text-xl text-secondary-foreground/85 leading-relaxed max-w-2xl mb-8">{t('platform.hub.desc')}</p>
          <div className="flex flex-wrap items-center gap-4">
            <button onClick={startShowcase} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg hover:bg-primary/90 transition-all active:scale-95 inline-flex items-center gap-2">
              <Presentation className="w-4 h-4" /> {t('showcase.cta_button', 'Take the guided tour')}
            </button>
            <span className="text-sm text-secondary-foreground/80">{t('showcase.cta_body', 'A few minutes through the website, the staff console and the member portal.')}</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="-mt-16 relative z-10">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <SeatCard
              href="/platform/console"
              icon={LayoutDashboard}
              title={t('platform.hub.console_title')}
              persona={t('platform.hub.console_persona', "You're Stefan, team lead on the membership team.")}
              desc={t('platform.hub.console_desc')}
              cta={t('platform.hub.open_console')}
              preview={<ConsolePreview />}
            />
            <SeatCard
              href="/platform/portal"
              icon={Smartphone}
              title={t('platform.hub.portal_title')}
              persona={t('platform.hub.portal_persona', "You're Marko at Adriatica Grupa, a Patron member.")}
              desc={t('platform.hub.portal_desc')}
              cta={t('platform.hub.open_portal')}
              preview={<PortalPreview />}
            />
          </div>

          {/* Seam */}
          <Link href="/platform/seam" className="block bg-secondary text-secondary-foreground rounded-3xl p-8 group hover:bg-secondary/90 transition-colors relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-network-pattern opacity-10 pointer-events-none"></div>
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
              <div className="w-12 h-12 bg-secondary-foreground/10 rounded-2xl flex items-center justify-center text-secondary-foreground shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">{t('platform.hub.seam')}</h3>
                <p className="text-secondary-foreground/80">{t('platform.hub.seam_desc')}</p>
              </div>
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full border border-secondary-foreground/20 group-hover:border-secondary-foreground group-hover:bg-secondary-foreground text-secondary-foreground group-hover:text-secondary transition-all">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
            <div className="relative z-10 mt-8 pt-6 border-t border-secondary-foreground/15">
              <SeamFlow />
            </div>
          </Link>

          <div className="flex justify-end mt-6">
            <a
              href="?reset=1"
              title={t('platform.hub.reset_demo_hint', 'Forget language, theme and finished tours, then reload')}
              className="tap inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {t('platform.hub.reset_demo', 'Reset demo')}
            </a>
          </div>

        </div>
      </section>
    </div>
  );
}

function SeatCard({ href, icon: Icon, title, persona, desc, cta, preview }: { href: string; icon: React.ElementType; title: string; persona: string; desc: string; cta: string; preview: React.ReactNode }) {
  return (
    <Link href={href} className="bg-card border border-border rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 hover:border-primary/40 transition-all group flex flex-col overflow-hidden">
      <div className="bg-muted/60 border-b border-border px-5 pt-5 overflow-hidden">
        <div className="rounded-t-xl border border-b-0 border-border bg-background shadow-sm group-hover:-translate-y-1 transition-transform duration-300">
          <div className="flex gap-1.5 px-3 py-2 border-b border-border" aria-hidden="true">
            <span className="w-2 h-2 rounded-full bg-border" /><span className="w-2 h-2 rounded-full bg-border" /><span className="w-2 h-2 rounded-full bg-border" />
          </div>
          <div className="p-4 h-[184px] overflow-hidden">{preview}</div>
        </div>
      </div>
      <div className="p-7 md:p-8 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>
          <h2 className="text-2xl md:text-3xl font-serif font-bold">{title}</h2>
        </div>
        <p className="font-semibold text-foreground mb-2">{persona}</p>
        <p className="text-muted-foreground leading-relaxed mb-6">{desc}</p>
        <div className="mt-auto flex items-center gap-2 text-primary font-bold">
          {cta} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

const URGENCY_DOT: Record<string, string> = { Critical: 'bg-destructive', High: 'bg-amber-500', Medium: 'bg-sky-500', Low: 'bg-muted-foreground/50' };

function ConsolePreview() {
  const { t } = useI18n();
  const items = [...platformData.console.ritual.items].sort((a, b) => parseEuro(b.expectedValue) - parseEuro(a.expectedValue));
  const atStake = items.reduce((s, i) => s + parseEuro(i.expectedValue), 0);
  return (
    <div aria-hidden="true" className="text-left">
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-serif text-lg text-foreground">{t('platform.console.ritual', 'Priorities')}</span>
        <span className="text-[11px] font-bold text-muted-foreground tabular-nums">{items.length} {t('console_v2.open', 'Open').toLowerCase()} · {fmtEuro(atStake)}</span>
      </div>
      <div className="space-y-1.5">
        {items.slice(0, 4).map((it) => {
          const c = platformData.allMembers.find((m) => m.id === it.companyId);
          return (
            <div key={it.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-1.5">
              <CompanyMark name={c?.name} sector={c?.sector} size="xs" />
              <span className="text-xs font-bold text-foreground truncate flex-1">{c?.name}</span>
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', URGENCY_DOT[it.urgency])} />
              <span className="text-xs font-bold tabular-nums text-foreground w-12 text-right">{it.expectedValue.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PortalPreview() {
  const { t } = useI18n();
  const member = platformData.member;
  const ev = platformData.portal.events[0];
  const r = 26, circ = 2 * Math.PI * r;
  return (
    <div aria-hidden="true" className="text-left">
      <div className="flex items-center gap-3 mb-3">
        <CompanyMark name={member.name} sector={member.sector} size="sm" />
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground truncate">{member.name}</div>
          <div className="text-[11px] text-muted-foreground">{member.tier} · {t('platform.hub.member_since', 'Member since')} {member.since}</div>
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="rounded-xl border border-border bg-card p-2.5 flex items-center justify-center relative">
          <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
            <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - member.score / 100)} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground tabular-nums">{member.score}</span>
        </div>
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
            <CalendarCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground truncate">{ev.title}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
            <Handshake className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground truncate">{t('platform.hub.preview_intros', '2 introductions waiting')}</span>
          </div>
          <div className="text-[11px] text-muted-foreground px-1">{ev.date} · {ev.location}</div>
        </div>
      </div>
    </div>
  );
}
