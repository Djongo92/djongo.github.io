import React from 'react';
import { Link } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { openCookieSettings } from '@/components/cookie-consent';
import { Linkedin, Twitter, Youtube } from 'lucide-react';

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-secondary text-secondary-foreground pt-16 pb-8 border-t-4 border-primary print:hidden">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          <div className="flex flex-col gap-6">
            <img 
              src={`${import.meta.env.BASE_URL}brand/amcham-logo-white.png`} 
              alt="AmCham Serbia" 
              className="h-12 w-auto object-contain self-start"
            />
            <p className="text-sm text-muted-foreground max-w-xs font-serif italic">
              {t('home.hero_subtitle').substring(0, 100)}...
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-6 font-serif border-b border-border/20 pb-2 inline-block">{t('footer.contact')}</h2>
            <address className="not-italic flex flex-col gap-3 text-sm text-muted-foreground">
              <p>{t('footer.address')}</p>
              <p>{t('footer.phone')}</p>
              <a href={`mailto:${t('footer.email')}`} className="tap hover:text-secondary-foreground transition-colors">{t('footer.email')}</a>
            </address>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-6 font-serif border-b border-border/20 pb-2 inline-block">{t('footer.navigation')}</h2>
            <div className="flex flex-col md:gap-3 text-sm text-muted-foreground [&>a]:py-3 md:[&>a]:py-0">
              <Link href="/membership" className="hover:text-secondary-foreground transition-colors">{t('nav.membership')}</Link>
              <Link href="/events" className="hover:text-secondary-foreground transition-colors">{t('nav.events')}</Link>
              <Link href="/insights" className="hover:text-secondary-foreground transition-colors">{t('nav.insights')}</Link>
              <Link href="/advocacy" className="hover:text-secondary-foreground transition-colors">{t('nav.advocacy')}</Link>
              <Link href="/news" className="hover:text-secondary-foreground transition-colors">{t('nav.news')}</Link>
              <Link href="/impact" className="hover:text-secondary-foreground transition-colors">{t('impact.title')}</Link>
              <Link href="/about#press" className="hover:text-secondary-foreground transition-colors">{t('about.press')}</Link>
              <Link href="/platform" className="text-[#ff7a7c] hover:text-secondary-foreground font-bold transition-colors">{t('platform.nav')}</Link>
              <Link href="/blueprint" className="hover:text-accent text-accent transition-colors">{t('nav.blueprint')} →</Link>
              <Link href="/ai" className="hover:text-accent text-accent transition-colors">{t('footer.proposal', 'How AI works here')} →</Link>
            </div>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-6 font-serif border-b border-border/20 pb-2 inline-block">{t('footer.follow')}</h2>
            <div className="flex gap-4">
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
          </div>
        </div>
      </div>
    </footer>
  );
}
