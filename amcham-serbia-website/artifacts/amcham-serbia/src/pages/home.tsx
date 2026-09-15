import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { ArrowRight, ChevronRight, Newspaper, ArrowUpRight, CheckCircle2, Compass } from 'lucide-react';
import { mockEvents, mockNews } from '@/data/mock';
import { useScroll, useTransform, motion, AnimatePresence } from 'framer-motion';
import { useGuidedTour } from '@/components/guided-tour';

export default function Home() {
  const { t, lang } = useI18n();
  const { start: startTour } = useGuidedTour();

  // Get active items
  const latestNews = mockNews.slice(0, 3);
  const newsThumbnails = ['images/real/event.jpg', 'images/event-panel.jpg', 'images/office-meeting.jpg'];
  const nextEvent = mockEvents.find(e => e.status === 'open' || e.status === 'request_pending') || mockEvents[0];

  // Hero carousel — slow crossfade, pauses for prefers-reduced-motion
  const heroImages = ['images/real/hero-2.jpg', 'images/real/hero-1.jpg', 'images/event-panel.jpg'];
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setHeroIndex((i) => (i + 1) % heroImages.length), 6000);
    return () => clearInterval(id);
  }, []);

  // Parallax Setup (Disable on mobile for performance/layout)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const parallaxRef1 = useRef(null);
  const { scrollYProgress: scrollYProgress1 } = useScroll({ target: parallaxRef1, offset: ["start end", "end start"] });
  const y1 = useTransform(scrollYProgress1, [0, 1], isMobile ? ["0%", "0%"] : ["-10%", "10%"]);

  const parallaxRef2 = useRef(null);
  const { scrollYProgress: scrollYProgress2 } = useScroll({ target: parallaxRef2, offset: ["start end", "end start"] });
  const y2 = useTransform(scrollYProgress2, [0, 1], isMobile ? ["0%", "0%"] : ["-15%", "15%"]);

  const patrons = [
    'a1.webp', 'cocacola.png', 'oracle.png', 'otp.png', 
    'raiffeisen.png', 'banca-intesa.png', 'unicredit.png', 
    'msd.png', 'eaton.png', 'pmi.png', 'aigo.png', 
    'medtronic.png', 'nlb.png', 'galenika.png'
  ];

  const team = [
    { id: 'vera', img: 'vera.jpg', name: t('team.vera.name'), role: t('team.vera.role'), bio: t('team.vera.bio') },
    { id: 'amalija', img: 'amalija.jpg', name: t('team.amalija.name'), role: t('team.amalija.role'), bio: t('team.amalija.bio') },
    { id: 'ana', img: 'ana.jpg', name: t('team.ana.name'), role: t('team.ana.role'), bio: t('team.ana.bio') },
    { id: 'slobodan', img: 'slobodan.jpg', name: t('team.slobodan.name'), role: t('team.slobodan.role'), bio: t('team.slobodan.bio') },
    { id: 'tina', img: 'tina.webp', name: t('team.tina.name'), role: t('team.tina.role'), bio: t('team.tina.bio') },
    { id: 'branislav', img: 'branislav.jpg', name: t('team.branislav.name'), role: t('team.branislav.role'), bio: t('team.branislav.bio') },
    { id: 'anita', img: 'anita.jpg', name: t('team.anita.name'), role: t('team.anita.role'), bio: t('team.anita.bio') }
  ];

  return (
    <div className="w-full flex flex-col">
      <SEO title={t('home.hero_title')} description={t('home.hero_subtitle')} />
      
      {/* 1. Hero Section */}
      <section className="relative w-full h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-secondary">
        <div className="absolute inset-0 z-0">
          <AnimatePresence>
            <motion.img
              key={heroIndex}
              src={`${import.meta.env.BASE_URL}${heroImages[heroIndex]}`}
              alt="Business Moves Serbia"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/70 via-secondary/30 to-background"></div>
        </div>
        
        {/* Soft decorative shape */}
        <img 
          src={`${import.meta.env.BASE_URL}images/real/morph-1.png`}
          alt=""
          className="absolute top-1/4 -left-32 w-[600px] opacity-20 pointer-events-none mix-blend-screen"
        />

        <div className="container mx-auto px-4 md:px-8 relative z-10 text-center max-w-4xl pt-16">
          <h1 className="text-5xl md:text-7xl font-bold font-serif leading-tight text-white mb-6 drop-shadow-lg">
            {t('home.hero_title')}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 text-balance mb-10 leading-relaxed font-medium drop-shadow">
            {t('home.hero_subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/membership" className="bg-primary text-primary-foreground px-8 py-4 rounded-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-xl hover:scale-105">
              {t('home.explore_membership')} <ArrowRight className="w-5 h-5" />
            </Link>
            <button onClick={startTour} className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-sm font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2">
              <Compass className="w-5 h-5" /> {t('guided_tour.cta')}
            </button>
          </div>
        </div>
      </section>

      {/* 2. Stats band */}
      <section className="bg-white border-b border-border z-20 relative">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12">
            {[
              { label: t('home.stats.members'), val: "260+" },
              { label: t('home.stats.revenue'), val: t('home.stats.revenue_val') },
              { label: t('home.stats.employees'), val: t('home.stats.employees_val') },
              { label: t('home.stats.investments'), val: t('home.stats.investments_val') }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center md:items-start text-center md:text-left">
                <span className="text-4xl lg:text-5xl font-serif font-bold text-secondary mb-2">{stat.val}</span>
                <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. In Focus */}
      <section className="py-24 bg-background overflow-hidden relative">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 relative group">
              <div className="aspect-[4/3] rounded-sm overflow-hidden shadow-xl">
                <img 
                  src={`${import.meta.env.BASE_URL}images/real/in-focus.jpeg`} 
                  alt="In Focus" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-background border border-border p-6 shadow-xl hidden md:flex flex-col justify-center rounded-sm">
                <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2">{t('home.in_focus')}</span>
                <span className="font-serif font-bold text-xl leading-tight">Twelfth Lap Time Survey Results</span>
              </div>
            </div>
            
            <div className="lg:col-span-5 lg:col-start-8 flex flex-col justify-center">
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6 text-foreground">
                Lap Time 2023: Business Environment Assessment
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Our annual comprehensive survey measuring investor confidence, identifying key regulatory challenges, and charting the course for structural reforms in the Serbian economy.
              </p>
              <Link href="/insights" className="inline-flex items-center gap-2 text-primary font-bold hover:underline w-fit">
                {t('home.latest_research')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. AmCham News */}
      <section className="py-24 bg-white border-t border-border">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-serif font-bold text-foreground mb-4">{t('home.amcham_news')}</h2>
            </div>
            <Link href="/news" className="hidden md:flex items-center gap-2 text-sm font-bold text-primary hover:underline">
              {t('common.view_all')} <ChevronRight className="w-4 h-4"/>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {latestNews.map((news, i) => (
              <Link key={news.id} href={`/news/${news.id}`} className="group flex flex-col h-full">
                <div className="aspect-[3/2] overflow-hidden rounded-sm bg-background mb-4">
                  <img 
                    src={`${import.meta.env.BASE_URL}${newsThumbnails[i % newsThumbnails.length]}`}
                    alt="" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  <span>{new Date(news.date).toLocaleDateString(lang === 'sr' ? 'sr-RS' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="w-1 h-1 bg-border rounded-full"></span>
                  <span className="text-primary">{lang === 'sr' ? news.topicSr : news.topic}</span>
                </div>
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-snug mb-3">
                  {lang === 'sr' ? news.titleSr : news.title}
                </h3>
                <p className="text-muted-foreground text-sm line-clamp-2 mt-auto">
                  {lang === 'sr' ? news.summarySr : news.summary}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Patron Members Logo Wall */}
      <section className="py-24 bg-background border-t border-border">
        <div className="container mx-auto px-4 md:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4">{t('home.patrons_title')}</h2>
          <p className="text-muted-foreground uppercase tracking-widest text-xs font-bold mb-16">{t('home.patrons_subtitle')}</p>
          
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 hover:opacity-100 transition-opacity duration-500 max-w-5xl mx-auto">
            {patrons.map((logo, i) => (
              <img 
                key={i} 
                src={`${import.meta.env.BASE_URL}images/patrons/${logo}`} 
                alt="Patron Member" 
                className="h-10 md:h-14 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300"
              />
            ))}
          </div>
        </div>
      </section>

      {/* 5.5 Events preview */}
      <section className="py-24 bg-white border-t border-border">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-serif font-bold text-foreground mb-4">{t('nav.events')}</h2>
            </div>
            <Link href="/events" className="hidden md:flex items-center gap-2 text-sm font-bold text-primary hover:underline">
              {t('common.view_all')} <ChevronRight className="w-4 h-4"/>
            </Link>
          </div>
          
          <div className="bg-background border border-border p-8 rounded-sm flex flex-col md:flex-row gap-8 items-center justify-between hover:border-primary/30 transition-colors group">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-sm text-xs uppercase tracking-widest">{t('home.next_event')}</span>
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{new Date(nextEvent.date).toLocaleDateString(lang === 'sr' ? 'sr-RS' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <h3 className="text-2xl font-serif font-bold mb-2 group-hover:text-primary transition-colors">
                {lang === 'sr' ? nextEvent.titleSr : nextEvent.title}
              </h3>
              <p className="text-muted-foreground">{nextEvent.topic} • {nextEvent.venue}</p>
            </div>
            <Link href={`/events/${nextEvent.id}`} className="shrink-0 bg-primary text-primary-foreground px-6 py-3 rounded-sm font-bold hover:bg-primary/90 transition-all w-full md:w-auto text-center">
              {t('common.register')}
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Members News */}
      <section className="py-24 bg-white border-t border-border relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-3xl font-serif font-bold text-foreground">{t('home.members_news')}</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-background border border-border p-8 md:p-12 rounded-sm shadow-sm">
            <div className="order-2 lg:order-1">
              <span className="text-xs font-bold uppercase tracking-widest text-primary mb-4 block">Spotlight</span>
              <h3 className="text-2xl md:text-3xl font-serif font-bold mb-6 text-foreground leading-tight">
                {t('home.spotlight_title')}
              </h3>
              <p className="text-lg text-muted-foreground mb-8 font-serif italic border-l-2 border-primary/30 pl-4">
                {t('home.spotlight_quote')}
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold font-serif">M</div>
                <div>
                  <p className="font-bold font-serif text-lg">Milan Jovanović</p>
                  <p className="text-sm text-muted-foreground">Managing Director, Automotive Sector</p>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="aspect-[4/3] relative rounded-sm overflow-hidden shadow-md group">
                <img 
                  src={`${import.meta.env.BASE_URL}images/member-story-1.jpg`} 
                  alt="Member Story" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Parallax Feature Band */}
      <section ref={parallaxRef1} className="relative h-[60vh] min-h-[400px] overflow-hidden flex items-center justify-center">
        <motion.div style={{ y: y1 }} className="absolute inset-0 -top-[20%] h-[140%] z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/real/hero-1.jpg`} 
            alt="AmCham Serbia" 
            className="w-full h-full object-cover"
          />
        </motion.div>
        <div className="absolute inset-0 bg-secondary/70 z-10 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 to-transparent z-10"></div>
        
        <div className="container mx-auto px-4 md:px-8 relative z-20">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight mb-8">
              {t('home.modernity_statement')}
            </h2>
            <Link href="/advocacy" className="bg-primary text-primary-foreground px-8 py-4 rounded-sm font-semibold hover:bg-primary/90 transition-all inline-flex items-center gap-2 shadow-lg">
              Explore Our Advocacy <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Meet the Executive Team */}
      <section className="py-24 bg-background overflow-hidden relative">
        <img 
          src={`${import.meta.env.BASE_URL}images/real/morph-2.png`}
          alt=""
          className="absolute -right-32 bottom-0 w-[500px] opacity-10 pointer-events-none mix-blend-multiply"
        />
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">{t('home.meet_team')}</h2>
              <p className="text-lg text-muted-foreground max-w-xl">Dedicated professionals working to advance the interests of our members and the Serbian economy.</p>
            </div>
            <Link href="/about" className="flex items-center gap-2 text-sm font-bold text-primary hover:underline shrink-0">
              {t('common.view_all')} <ChevronRight className="w-4 h-4"/>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.slice(0, 4).map((member, i) => (
              <Link key={member.id} href="/about" className={`group block ${i % 2 === 1 ? 'md:translate-y-0 lg:translate-y-8' : ''}`}>
                <div className="aspect-[3/4] overflow-hidden rounded-sm bg-white mb-4 relative shadow-sm group-hover:shadow-md transition-all">
                  <img 
                    src={`${import.meta.env.BASE_URL}images/team/${member.img}`} 
                    alt={member.name} 
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 grayscale group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-secondary/0 group-hover:bg-secondary/10 transition-colors"></div>
                  <div className="absolute bottom-4 right-4 bg-primary text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="font-serif font-bold text-lg text-foreground group-hover:text-primary transition-colors">{member.name}</h3>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mt-1">{member.role}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Join Band */}
      <section ref={parallaxRef2} className="relative py-32 overflow-hidden flex items-center justify-center">
        <motion.div style={{ y: y2 }} className="absolute inset-0 -top-[20%] h-[140%] z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/real/join-us.jpg`} 
            alt="Join AmCham" 
            className="w-full h-full object-cover"
          />
        </motion.div>
        <div className="absolute inset-0 bg-secondary/80 z-10"></div>
        
        <div className="container mx-auto px-4 md:px-8 relative z-20 text-center max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">Ready to shape the future?</h2>
          <p className="text-xl text-white/80 mb-10 leading-relaxed">Join the most influential network of international and local businesses in Serbia.</p>
          <Link href="/membership" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-4 rounded-sm font-bold text-lg hover:bg-primary/90 transition-colors shadow-xl">
            {t('nav.join')} <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* 11. Diagnostic Scorecard */}
      <section className="py-24 bg-secondary text-secondary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-network-pattern opacity-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="max-w-2xl mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-accent mb-4 block">{t('home.scorecard.eyebrow')}</span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">{t('home.scorecard.title')}</h2>
            <p className="text-lg text-white/70 leading-relaxed">{t('home.scorecard.desc')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white/5 border border-white/10 rounded-sm p-8">
              <span className="text-xs font-bold uppercase tracking-widest text-white/50 mb-6 block">{t('home.scorecard.old_label')}</span>
              <div className="flex gap-10">
                <div>
                  <div className="text-4xl font-serif font-bold text-white/70">8<span className="text-xl text-white/40">/12</span></div>
                  <div className="text-xs font-bold uppercase tracking-widest text-white/40 mt-2">{t('home.scorecard.findability_label')}</div>
                </div>
                <div>
                  <div className="text-4xl font-serif font-bold text-white/70">4<span className="text-xl text-white/40">/6</span></div>
                  <div className="text-xs font-bold uppercase tracking-widest text-white/40 mt-2">{t('home.scorecard.visual_label')}</div>
                </div>
              </div>
            </div>
            <div className="bg-primary/10 border border-primary/40 rounded-sm p-8 relative">
              <span className="text-xs font-bold uppercase tracking-widest text-primary mb-6 block">{t('home.scorecard.new_label')}</span>
              <div className="flex gap-10">
                <div>
                  <div className="text-4xl font-serif font-bold text-white">11<span className="text-xl text-white/50">/12</span></div>
                  <div className="text-xs font-bold uppercase tracking-widest text-white/50 mt-2">{t('home.scorecard.findability_label')}</div>
                </div>
                <div>
                  <div className="text-4xl font-serif font-bold text-white">5<span className="text-xl text-white/50">/6</span></div>
                  <div className="text-xs font-bold uppercase tracking-widest text-white/50 mt-2">{t('home.scorecard.visual_label')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-sm p-8 mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-white/50 mb-5 block">{t('home.scorecard.journeys_label')}</span>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                t('home.scorecard.journey_1'),
                t('home.scorecard.journey_2'),
                t('home.scorecard.journey_3'),
                t('home.scorecard.journey_4'),
                t('home.scorecard.journey_5'),
              ].map((journey, i) => (
                <div key={i} className="flex items-center gap-2 text-sm font-medium text-white/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  {journey}
                </div>
              ))}
            </div>
          </div>

          <Link href="/blueprint/diagnostic" className="inline-flex items-center gap-2 text-accent font-bold hover:underline">
            {t('home.scorecard.cta')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

    </div>
  );
}
