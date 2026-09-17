import React from 'react';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { Mail, Phone, MapPin, Building, Globe, Award, Users, ArrowRight, BarChart3, Newspaper } from 'lucide-react';
import { Link } from 'wouter';
import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';

export default function About() {
  const { t } = useI18n();

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
    <div className="w-full bg-background min-h-screen pb-24">
      <SEO title={t('about.title')} description={t('about.subtitle')} />
      
      {/* Header */}
      <section className="bg-secondary text-secondary-foreground py-20 pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-network-pattern opacity-10 pointer-events-none"></div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">{t('about.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            {t('about.subtitle')}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 -mt-16 relative z-20">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            <div className="lg:col-span-8 space-y-16">
              
              {/* Mission */}
              <div className="bg-card border border-border p-8 md:p-12 shadow-xl rounded-sm">
                <div className="flex items-center gap-4 mb-8 pb-4 border-b border-border">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-3xl font-serif font-bold">{t('about.mission')}</h2>
                </div>
                <div className="prose prose-stone max-w-none text-lg leading-relaxed text-foreground space-y-6">
                  <p className="font-medium text-xl text-foreground mb-8">
                    {t('about.mission_p1')}
                  </p>
                  <p>
                    {t('about.mission_p2')}
                  </p>
                  <p>
                    {t('about.mission_p3')}
                  </p>
                </div>
                <Link href="/impact" className="mt-8 flex items-center justify-between gap-4 bg-background border border-border hover:border-primary/50 rounded-sm p-6 group transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground group-hover:text-primary transition-colors">{t('about.impact_cta')}</div>
                      <div className="text-sm text-muted-foreground">{t('about.impact_cta_desc')}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Executive Team */}
              <div id="team">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-3xl font-serif font-bold">{t('team.title')}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {team.map((member) => (
                    <div key={member.id} className="bg-card border border-border p-6 rounded-sm flex gap-6 hover:shadow-md transition-shadow group">
                      <div className="w-24 h-24 shrink-0 relative rounded-sm overflow-hidden bg-background">
                        <ImageWithSkeleton
                          src={`${import.meta.env.BASE_URL}images/team/${member.img}`}
                          alt={member.name}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl mb-1 group-hover:text-primary transition-colors">{member.name}</h3>
                        <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">{member.role}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-3">
                          "{member.bio}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Board */}
              <div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-3xl font-serif font-bold">{t('about.board')}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Board Members */}
                  <div className="bg-card border border-border p-8 rounded-sm hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-xl mb-1">Stefan Lazarević</h3>
                    <p className="text-primary text-xs font-bold uppercase tracking-widest mb-4">President</p>
                    <p className="text-muted-foreground text-sm font-medium">Vice President, NCR Atleos</p>
                  </div>
                  <div className="bg-card border border-border p-8 rounded-sm hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-xl mb-1">Ronald Seeliger</h3>
                    <p className="text-primary text-xs font-bold uppercase tracking-widest mb-4">First Vice President</p>
                    <p className="text-muted-foreground text-sm font-medium">CEO, Hemofarm</p>
                  </div>
                  <div className="bg-card border border-border p-8 rounded-sm hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-xl mb-1">Ksenija Karić</h3>
                    <p className="text-primary text-xs font-bold uppercase tracking-widest mb-4">Second Vice President</p>
                    <p className="text-muted-foreground text-sm font-medium">Country General Manager, Schneider Electric</p>
                  </div>
                  <div className="bg-card border border-border p-8 rounded-sm hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-xl mb-1">Bojan Vračević</h3>
                    <p className="text-primary text-xs font-bold uppercase tracking-widest mb-4">Secretary Treasurer</p>
                    <p className="text-muted-foreground text-sm font-medium">CEO, S-Leasing</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Contact */}
            <div className="lg:col-span-4">
              <div className="bg-secondary text-secondary-foreground p-8 md:p-10 rounded-sm sticky top-24 shadow-2xl">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-secondary-foreground/10">
                  <Building className="w-6 h-6 text-secondary-foreground" />
                  <h3 className="text-2xl font-serif font-bold text-secondary-foreground">{t('about.contact')}</h3>
                </div>

                <div className="space-y-8">
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 bg-secondary-foreground/5 rounded-full flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors text-secondary-foreground">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-widest text-secondary-foreground/50 mb-2">Address</h4>
                      <p className="text-secondary-foreground text-sm font-medium">{t('footer.address')}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 bg-secondary-foreground/5 rounded-full flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors text-secondary-foreground">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-widest text-secondary-foreground/50 mb-2">Phone</h4>
                      <p className="text-secondary-foreground text-sm font-medium">{t('footer.phone')}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 bg-secondary-foreground/5 rounded-full flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors text-secondary-foreground">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-widest text-secondary-foreground/50 mb-2">Email</h4>
                      <a href={`mailto:${t('footer.email')}`} className="text-secondary-foreground text-sm font-medium hover:text-primary transition-colors">{t('footer.email')}</a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Press & Media */}
              <div id="press" className="bg-card border border-border p-8 rounded-sm mt-8 shadow-md scroll-mt-24">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <Newspaper className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-serif font-bold">{t('about.press')}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t('about.press_desc')}</p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 shrink-0 relative rounded-full overflow-hidden bg-muted">
                    <ImageWithSkeleton src={`${import.meta.env.BASE_URL}images/team/ana.jpg`} alt={t('team.ana.name')} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">{t('team.ana.name')}</div>
                    <div className="text-xs text-muted-foreground">{t('about.press_contact_role')}</div>
                  </div>
                </div>
                <a href="mailto:press@amcham.rs" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline mb-4">
                  <Mail className="w-4 h-4" /> press@amcham.rs
                </a>
                <p className="text-xs text-muted-foreground border-t border-border pt-4">{t('about.press_note')}</p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
