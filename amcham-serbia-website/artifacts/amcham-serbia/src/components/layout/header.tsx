import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Search, Menu, X, Globe, ChevronDown, LayoutDashboard, Map, Presentation } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useShowcase } from '@/components/showcase-tour';

export function Header() {
  const { lang, setLang, t } = useI18n();
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const showcaseRef = React.useRef<HTMLDivElement>(null);
  const { start: startShowcase } = useShowcase();

  // The demo surfaces (platform mock, redesign blueprint, guided walkthrough)
  // live under one menu so they don't crowd the real site navigation.
  const showcaseLinks = [
    { href: '/platform', icon: LayoutDashboard, label: t('nav.showcase_platform', 'Member Platform'), desc: t('nav.showcase_platform_desc', 'Staff console and member portal') },
    { href: '/blueprint', icon: Map, label: t('nav.blueprint'), desc: t('nav.showcase_blueprint_desc', 'Why the site is built this way, and the roadmap') },
  ];

  useEffect(() => {
    if (!showcaseOpen) return;
    const onDown = (e: MouseEvent) => { if (!showcaseRef.current?.contains(e.target as Node)) setShowcaseOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowcaseOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [showcaseOpen]);
  useEffect(() => setShowcaseOpen(false), [location]);

  const navLinks = [
    { href: '/membership', label: t('nav.membership') },
    { href: '/events', label: t('nav.events') },
    { href: '/advocacy', label: t('nav.advocacy') },
    { href: '/insights', label: t('nav.insights') },
    { href: '/members', label: t('nav.members') },
    { href: '/news', label: t('nav.news') },
    { href: '/about', label: t('nav.about') },
  ];

  // Handle keyboard shortcut (Cmd+K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (((e.metaKey || e.ctrlKey) && e.key === 'k') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault();
        navigate('/search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-md border-b border-border transition-colors duration-300 print:hidden">
      <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 z-50 shrink-0">
          <img 
            src={`${import.meta.env.BASE_URL}brand/amcham-logo.png`} 
            alt="AmCham Serbia" 
            className="h-10 md:h-12 w-auto object-contain dark:hidden"
          />
          <img 
            src={`${import.meta.env.BASE_URL}brand/amcham-logo-white.png`} 
            alt="AmCham Serbia" 
            className="h-7 md:h-[33px] w-auto object-contain hidden dark:block"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6 flex-1 justify-center min-w-0">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary whitespace-nowrap ${
                location.startsWith(link.href) && link.href !== '/' ? 'text-primary' : 'text-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-3 xl:gap-4 shrink-0">

          <div className="relative" ref={showcaseRef}>
            <button
              onClick={() => setShowcaseOpen((o) => !o)}
              aria-expanded={showcaseOpen}
              aria-haspopup="menu"
              className="text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-sm transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0"></span>
              {t('nav.showcase', 'Showcase')}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showcaseOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showcaseOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl p-2 z-50"
                >
                  {showcaseLinks.map(({ href, icon: Icon, label, desc }) => (
                    <Link key={href} href={href} role="menuitem" className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted transition-colors">
                      <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>
                        <span className="block text-sm font-bold text-foreground">{label}</span>
                        <span className="block text-xs text-muted-foreground">{desc}</span>
                      </span>
                    </Link>
                  ))}
                  <button role="menuitem" onClick={() => { setShowcaseOpen(false); startShowcase(); }} className="w-full flex items-start gap-3 rounded-lg p-3 hover:bg-muted transition-colors text-left border-t border-border mt-1">
                    <Presentation className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>
                      <span className="block text-sm font-bold text-foreground">{t('showcase.cta_button', 'Start Showcase')}</span>
                      <span className="block text-xs text-muted-foreground">{t('nav.showcase_tour_desc', 'A scripted walk through the strongest moments')}</span>
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search (collapsed icon — expands via /search, matches mobile) */}
          <button
            onClick={() => navigate('/search')}
            aria-label={t('search.placeholder') || 'Search'}
            title={`${t('search.placeholder') || 'Search'} (⌘K)`}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shrink-0"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => setLang(lang === 'en' ? 'sr' : 'en')}
            className="flex items-center gap-1 text-sm font-bold text-foreground hover:text-primary transition-colors shrink-0"
          >
            <Globe className="w-4 h-4" />
            {lang.toUpperCase()}
          </button>

          <ThemeToggle className="w-9 h-9" />

          <Link
            href="/membership"
            className="bg-primary text-primary-foreground px-4 xl:px-5 py-2.5 rounded-sm font-semibold text-sm hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap shrink-0"
          >
            {t('nav.join')}
          </Link>
        </div>

        {/* Mobile Toggle & Mobile Search Icon */}
        <div className="flex items-center gap-4 lg:hidden">
          <button 
            className="z-50 text-foreground"
            onClick={() => {
              if (!isMobileMenuOpen) {
                navigate('/search');
              } else {
                setIsMobileMenuOpen(false);
              }
            }}
          >
            <Search className="w-5 h-5" />
          </button>

          <button 
            className="z-50 text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-20 left-0 w-full bg-background border-b border-border shadow-lg lg:hidden overflow-hidden"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
              <form onSubmit={handleSearchSubmit} className="relative mb-2">
                <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder={t('search.placeholder') || "Search..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-secondary/5 border border-border rounded-full pl-10 pr-4 py-3 text-base focus:outline-none focus:border-primary"
                />
              </form>

              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-medium text-foreground py-2 border-b border-border/50"
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="pt-4 flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>{t('nav.showcase', 'Showcase')}</span>
                {showcaseLinks.map(({ href, label }) => (
                  <Link key={href} href={href} onClick={() => setIsMobileMenuOpen(false)} className="text-base font-bold text-foreground py-1.5">{label}</Link>
                ))}
              </div>

              <div className="flex items-center justify-end pt-4">

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setLang(lang === 'en' ? 'sr' : 'en'); setIsMobileMenuOpen(false); }}
                    className="flex items-center gap-2 text-sm font-bold"
                  >
                    <Globe className="w-5 h-5" />
                    {lang === 'en' ? 'Srpski' : 'English'}
                  </button>
                  <ThemeToggle className="w-9 h-9" />
                </div>

                <Link
                  href="/membership"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="bg-primary text-primary-foreground px-5 py-2.5 rounded-sm font-semibold text-sm text-center"
                >
                  {t('nav.join')}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
