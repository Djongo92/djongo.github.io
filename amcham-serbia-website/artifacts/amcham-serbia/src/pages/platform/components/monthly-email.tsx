import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mail, X } from 'lucide-react';
import { DIGEST_PREVIEWS } from '../console/newsroom-data';

// The member's side of the monthly digest: the one email AmCham sends them,
// so they get the value without logging in. ?email=open opens the preview.
export function MonthlyEmailCard({ t, member }: { t: (k: string, fb?: string) => string; member: any }) {
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).get('email') === 'open');
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const preview = DIGEST_PREVIEWS[member?.id] ?? {
    company: member?.name, person: 'there', sector: member?.sector,
    sections: [
      { heading: t('portal_email_sector', 'For your sector'), lines: [t('portal_email_generic1', 'Two policy updates that affect your sector, summarised in a paragraph each.')] },
      { heading: t('portal_email_events', 'Events picked for you'), lines: [t('portal_email_generic2', 'Annual General Meeting, 15 Nov')] },
    ],
  };

  return (
    <>
      <div className="rounded-[28px] border border-border bg-card px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Mail className="w-5 h-5" /></span>
          <div>
            <div className="font-semibold text-foreground">{t('portal_email_title', 'Your October email is ready')}</div>
            <div className="text-sm text-muted-foreground">{t('portal_email_desc', 'Everything in this portal that matters to you, in one email a month. No login needed.')}</div>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="self-start sm:self-auto px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90">{t('portal_email_preview', 'Preview')}</button>
      </div>
      {open && createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('portal_email_title', 'Your October email is ready')}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl bg-background border border-border shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="text-sm">
                <div className="text-muted-foreground">{t('portal_email_from', 'From')}: <span className="text-foreground font-medium">AmCham Serbia</span></div>
                <div className="text-muted-foreground">{t('portal_email_subject', 'Subject')}: <span className="text-foreground font-medium">{t('portal_email_subject_line', 'Your AmCham month')} · {preview.sector}</span></div>
              </div>
              <button onClick={() => setOpen(false)} aria-label={t('portal_email_close', 'Close')} className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-foreground">{t('portal_email_hello', 'Hello')} {preview.person},</p>
              {preview.sections.map((s: any) => (
                <div key={s.heading}>
                  <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">{s.heading}</div>
                  <ul className="text-sm text-foreground/85 space-y-1">{s.lines.map((l: string) => <li key={l}>{l}</li>)}</ul>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-4 border-t border-border">{t('portal_email_footer', 'You get this because your company is an AmCham member. Change or stop it any time under “What AmCham sees”.')}</p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
