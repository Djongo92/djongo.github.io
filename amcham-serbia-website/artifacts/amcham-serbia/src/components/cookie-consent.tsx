import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Cookie } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useShowcase } from '@/components/showcase-tour';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

// Cookie notice and settings. Optional cookies stay off until someone says
// yes; "Reject all" sits beside "Accept all" with the same weight. The demo
// sets no optional cookies either way; the choice is stored so the notice
// doesn't come back, and "Cookie settings" in the footer reopens it.

const KEY = 'amcham_cookie_choice';
const OPEN_EVENT = 'amcham:cookie-settings';
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

interface Choice { v: 1; analytics: boolean; marketing: boolean; at: string }

function readChoice(): Choice | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Choice;
    if (c.v !== 1 || Date.now() - Date.parse(c.at) > MAX_AGE_MS) return null;
    return c;
  } catch {
    return null;
  }
}

function saveChoice(analytics: boolean, marketing: boolean) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, analytics, marketing, at: new Date().toISOString() }));
  } catch {
    // Private mode: the choice holds for this visit only.
  }
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CookieConsent() {
  const { t } = useI18n();
  const { active: touring } = useShowcase();
  const [banner, setBanner] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const c = readChoice();
    if (c) { setAnalytics(c.analytics); setMarketing(c.marketing); } else setBanner(true);
    const open = () => {
      const cur = readChoice();
      setAnalytics(cur?.analytics ?? false);
      setMarketing(cur?.marketing ?? false);
      setSettings(true);
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const decide = (a: boolean, m: boolean) => {
    saveChoice(a, m);
    setAnalytics(a); setMarketing(m);
    setBanner(false); setSettings(false);
  };

  const btn = 'min-h-11 px-5 rounded-full text-sm font-semibold transition-colors';

  return (
    <>
      {banner && !touring && !settings && (
        <div role="region" aria-label={t('cookies.banner_label', 'Cookie choices')}
          className="fixed z-[80] inset-x-0 bottom-0 p-3 sm:p-4 sm:left-4 sm:right-auto sm:bottom-4 sm:max-w-md print:hidden"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-2xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Cookie className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h2 className="font-semibold text-foreground">{t('cookies.title', 'Cookies on this site')}</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-snug sm:leading-relaxed">
                  {t('cookies.text', 'We use cookies that the site needs to work. With your permission we’d also use analytics cookies to see which pages are useful.')}{' '}
                  <Link href="/cookies" className="font-semibold text-foreground underline underline-offset-2 hover:text-primary">{t('cookies.policy_link', 'Cookie policy')}</Link>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 sm:mt-4">
              <button onClick={() => decide(false, false)} className={`${btn} bg-foreground text-background hover:opacity-90`}>{t('cookies.reject', 'Reject all')}</button>
              <button onClick={() => decide(true, true)} className={`${btn} bg-foreground text-background hover:opacity-90`}>{t('cookies.accept', 'Accept all')}</button>
            </div>
            <button onClick={() => setSettings(true)} className={`${btn} w-full mt-1 text-foreground hover:bg-muted`}>{t('cookies.choose', 'Choose cookies')}</button>
          </div>
        </div>
      )}

      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent className="z-[90] w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('cookies.settings', 'Cookie settings')}</DialogTitle>
            <DialogDescription>{t('cookies.settings_desc', 'Choose which cookies we may use. You can change this at any time from the bottom of any page.')}</DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-border">
            {[
              { id: 'necessary', title: t('cookies.necessary', 'Needed for the site to work'), desc: t('cookies.necessary_desc', 'Remember your language, theme and this choice. Always on.'), on: true, set: undefined },
              { id: 'analytics', title: t('cookies.analytics', 'Analytics'), desc: t('cookies.analytics_desc', 'Count visits and show which pages are useful. Combined data only.'), on: analytics, set: setAnalytics },
              { id: 'marketing', title: t('cookies.marketing', 'Marketing'), desc: t('cookies.marketing_desc', 'Measure visits that come from our social media posts.'), on: marketing, set: setMarketing },
            ].map((c) => (
              <div key={c.id} className="py-4 flex items-start justify-between gap-4">
                <label htmlFor={`cookie-${c.id}`} className="cursor-pointer">
                  <span className="block text-sm font-semibold text-foreground">{c.title}</span>
                  <span className="block text-sm text-muted-foreground mt-0.5">{c.desc}</span>
                </label>
                <Switch id={`cookie-${c.id}`} checked={c.on} disabled={!c.set} onCheckedChange={(v) => c.set?.(v)} className="mt-0.5 shrink-0" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={() => decide(false, false)} className={`${btn} border border-border text-foreground hover:bg-muted`}>{t('cookies.reject', 'Reject all')}</button>
            <button onClick={() => decide(analytics, marketing)} className={`${btn} bg-foreground text-background hover:opacity-90`}>{t('cookies.save', 'Save choices')}</button>
          </div>
          <p className="text-xs text-muted-foreground">
            <Link href="/cookies" onClick={() => setSettings(false)} className="underline underline-offset-2 hover:text-foreground">{t('cookies.policy_link', 'Cookie policy')}</Link>
            {' · '}
            <Link href="/privacy" onClick={() => setSettings(false)} className="underline underline-offset-2 hover:text-foreground">{t('footer.privacy')}</Link>
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
