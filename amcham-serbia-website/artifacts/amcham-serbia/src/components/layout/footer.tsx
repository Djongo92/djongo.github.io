import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { openCookieSettings } from '@/components/cookie-consent';
import { useShowcase } from '@/components/showcase-tour';
import { Linkedin, Twitter, Youtube } from 'lucide-react';

// Set by the demo's sign-in screen (Cloudflare); absent elsewhere.
function signedInEmail(): string | null {
  const m = document.cookie.match(/(?:^|;\s*)amcham_demo_email=([^;]+)/);
  try { return m ? decodeURIComponent(m[1]) : null; } catch { return null; }
}

const HEADING = 'font-bold text-lg mb-6 font-serif border-b border-border/20 pb-2 inline-block';
const LIST = 'flex flex-col items-start md:gap-3 text-sm text-muted-foreground [&>*]:py-3 md:[&>*]:py-0';
const LINK = 'hover:text-secondary-foreground transition-colors';

export function Footer() {
  const { t } = useI18n();
  const { start: startTour } = useShowcase();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => setEmail(signedInEmail()), []);

  return (
    <footer className="bg-secondary text-secondary-foreground pt-16 pb-8 border-t-4 border-primary print:hidden">
      <div className="container mx-auto px-4 md:px-8">
        {/* The logo, then four columns: contact, AmCham's own pages, the pages
            about this redesign, and social links. On smaller screens the short
            columns (contact, social) pair up first, then the two link lists. */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-12 mb-12">

          <div className="col-span-2 md:col-span-4 lg:col-span-1 flex flex-col gap-6">
            <img 
              src={`${import.meta.env.BASE_URL}brand/amcham-logo-white.png`} 
              alt="AmCham Serbia" 
              className="h-12 w-auto object-contain self-start"
            />
            <p className="text-sm text-muted-foreground max-w-xs font-serif italic">{t('footer.tagline', 'The leading independent business association in Serbia.')}</p>
          </div>

          <div>
            <h2 className={HEADING}>{t('footer.contact')}</h2>
            <address className="not-italic flex flex-col gap-3 text-sm text-muted-foreground">
              <p>{t('footer.address')}</p>
              <p>{t('footer.phone')}</p>
              <a href={`mailto:${t('footer.email')}`} className="tap hover:text-secondary-foreground transition-colors self-start">{t('footer.email')}</a>
            </address>
          </div>

          <nav aria-label={t('footer.explore', 'Explore')} className="order-2 lg:order-none">
            <h2 className={HEADING}>{t('footer.explore', 'Explore')}</h2>
            <div className={LIST}>
              <Link href="/membership" className={LINK}>{t('nav.membership')}</Link>
              <Link href="/events" className={LINK}>{t('nav.events')}</Link>
              <Link href="/members" className={LINK}>{t('nav.members')}</Link>
              <Link href="/insights" className={LINK}>{t('nav.insights')}</Link>
              <Link href="/advocacy" className={LINK}>{t('nav.advocacy')}</Link>
              <Link href="/news" className={LINK}>{t('nav.news')}</Link>
              <Link href="/impact" className={LINK}>{t('impact.title')}</Link>
              <Link href="/about" className={LINK}>{t('nav.about')}</Link>
            </div>
          </nav>

          <nav aria-label={t('footer.redesign', 'The redesign')} className="order-2 lg:order-none">
            <h2 className={HEADING}>{t('footer.redesign', 'The redesign')}</h2>
            <div className={LIST}>
              <Link href="/platform" className="text-[#ff7a7c] hover:text-secondary-foreground font-bold transition-colors">{t('platform.nav')}</Link>
              <button onClick={startTour} className={`${LINK} text-left`}>{t('showcase.cta_button', 'Take the guided tour')}</button>
              <Link href="/ai" className={LINK}>{t('footer.proposal', 'How AI works here')}</Link>
              <Link href="/blueprint/diagnostic" className={LINK}>{t('home.behind.diagnostic', 'Read the analysis')}</Link>
              <Link href="/blueprint" className={LINK}>{t('nav.blueprint')}</Link>
            </div>
          </nav>

          <div className="order-1 lg:order-none">
            <h2 className={HEADING}>{t('footer.follow')}</h2>
            <div className="flex flex-wrap gap-3">
              <a href="https://www.linkedin.com/company/2668493/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-11 h-11 rounded-full bg-secondary-foreground/5 flex items-center justify-center hover:bg-primary transition-colors text-secondary-foreground">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/amchamserbia" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="w-11 h-11 rounded-full bg-secondary-foreground/5 flex items-center justify-center hover:bg-primary transition-colors text-secondary-foreground">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://www.youtube.com/user/AmChamSerbia" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-11 h-11 rounded-full bg-secondary-foreground/5 flex items-center justify-center hover:bg-primary transition-colors text-secondary-foreground">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-border/20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>{t('footer.rights')}</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 items-center">
            <Link href="/privacy" className="py-3 md:py-1 hover:text-secondary-foreground transition-colors">{t('footer.privacy')}</Link>
            <Link href="/cookies" className="py-3 md:py-1 hover:text-secondary-foreground transition-colors">{t('footer.cookies', 'Cookie policy')}</Link>
            <button onClick={openCookieSettings} className="py-3 md:py-1 hover:text-secondary-foreground transition-colors">{t('cookies.settings', 'Cookie settings')}</button>
            {email && (
              <span className="py-3 md:py-1">
                {t('footer.signed_in_as', 'Signed in as')} {email} · <a href="/__auth/signout" className="underline underline-offset-2 hover:text-secondary-foreground">{t('footer.sign_out', 'Sign out')}</a>
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
