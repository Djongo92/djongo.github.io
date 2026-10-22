import React from 'react';
import { Link } from 'wouter';
import { Info, SlidersHorizontal } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { LEGAL } from '@/data/legal';
import { openCookieSettings } from '@/components/cookie-consent';

// The privacy and cookie policies share one layout: a short intro, a
// "jump to" list, then plain sections. Tables scroll on their own on phones.
function LegalPage({ kind }: { kind: 'privacy' | 'cookies' }) {
  const { lang, t } = useI18n();
  const doc = LEGAL[kind][lang];
  const other = kind === 'privacy' ? 'cookies' : 'privacy';

  return (
    <div className="bg-background">
      <SEO title={doc.title} description={doc.intro} />
      <header className="bg-secondary text-secondary-foreground pt-32 pb-14">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-5 text-balance">{doc.title}</h1>
          <p className="text-lg text-secondary-foreground/85 leading-relaxed">{doc.intro}</p>
          <p className="mt-5 text-sm text-secondary-foreground/70">{doc.updated}</p>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-8 max-w-3xl py-12 md:py-16">
        <p className="flex gap-3 items-start rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground mb-10">
          <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          {doc.placeholder}
        </p>

        <nav aria-label={t('legal.contents', 'On this page')} className="mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{t('legal.contents', 'On this page')}</h2>
          <ul className="grid sm:grid-cols-2 gap-x-6">
            {doc.sections.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} className="block py-2 text-sm font-semibold text-foreground hover:text-primary">{s.title}</a></li>
            ))}
          </ul>
        </nav>

        <div className="space-y-10">
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="text-2xl font-serif font-bold mb-4 text-foreground">{s.title}</h2>
              {s.list && (
                <ul className="space-y-2.5 mb-4 list-disc pl-5 marker:text-primary">
                  {s.list.map((x) => <li key={x} className="text-foreground/85 leading-relaxed">{x}</li>)}
                </ul>
              )}
              {s.body?.map((x) => <p key={x} className="text-foreground/85 leading-relaxed mb-3">{x}</p>)}
              {s.table && (
                <>
                  {/* Phones: one card per cookie instead of a table that scrolls sideways. */}
                  <dl className="sm:hidden mt-4 space-y-3">
                    {s.table.rows.map((r) => (
                      <div key={r[0]} className="rounded-xl border border-border p-4">
                        <dt className="font-mono text-xs text-foreground break-words">{r[0]}</dt>
                        {r.slice(1).map((c, i) => (
                          <dd key={i} className="mt-2 text-sm text-foreground/85"><span className="text-muted-foreground">{s.table!.head[i + 1]}: </span>{c}</dd>
                        ))}
                      </div>
                    ))}
                  </dl>
                  <div className="hidden sm:block overflow-x-auto rounded-xl border border-border mt-4">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-left">
                        <tr>{s.table.head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {s.table.rows.map((r) => (
                          <tr key={r[0]}>{r.map((c, i) => <td key={i} className={i === 0 ? 'px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap' : 'px-4 py-3 text-foreground/85'}>{c}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {s.id === 'choices' && (
                <button onClick={openCookieSettings} className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors">
                  <SlidersHorizontal className="w-4 h-4" aria-hidden="true" /> {t('cookies.settings', 'Cookie settings')}
                </button>
              )}
              {(s.id === 'cookies' || s.id === 'more') && (
                <Link href={`/${other}`} className="inline-flex py-2 text-sm font-bold text-primary hover:underline">
                  {LEGAL[other][lang].title} →
                </Link>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PrivacyPage() { return <LegalPage kind="privacy" />; }
export function CookiesPage() { return <LegalPage kind="cookies" />; }
