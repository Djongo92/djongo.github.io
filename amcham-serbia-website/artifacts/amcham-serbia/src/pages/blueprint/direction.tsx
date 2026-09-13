import React from 'react';
import { BlueprintLayout } from '@/components/blueprint-layout';
import { useI18n } from '@/lib/i18n';
import { BookOpen, Users, Activity, Settings2, ShieldCheck, Maximize } from 'lucide-react';

export default function BlueprintDirection() {
  const { t } = useI18n();

  return (
    <BlueprintLayout title={t('blueprint.nav.direction')}>
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Creative Direction */}
        <div className="mb-16">
          <h2 className="text-3xl font-serif font-bold mb-8">The Creative Direction</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-secondary text-secondary-foreground border-2 border-primary p-8 rounded-sm shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-sm">Chosen Lead</div>
              <BookOpen className="w-8 h-8 text-primary mb-6" />
              <h3 className="text-xl font-bold mb-3">Editorial authority</h3>
              <p className="text-sm text-white/70 mb-6">Restrained navy / warm white / red; large headlines; generous spacing; real local photography; identity from people, language and evidence.</p>
              <div className="mt-auto pt-4 border-t border-white/10">
                <span className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">Risk</span>
                <p className="text-xs text-white/50">Feels generic without distinctive photography and disciplined editorial programme.</p>
              </div>
            </div>

            <div className="bg-white border border-border p-8 rounded-sm shadow-sm flex flex-col">
              <Users className="w-8 h-8 text-muted-foreground mb-6" />
              <h3 className="text-xl font-bold mb-3">People & connections</h3>
              <p className="text-sm text-muted-foreground mb-6">Member stories with a specific challenge, participation and result; consented portraits; conversational headlines.</p>
              <div className="mt-auto pt-4 border-t border-border">
                <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">Risk</span>
                <p className="text-xs text-muted-foreground">Requires sustained story supply.</p>
              </div>
            </div>

            <div className="bg-white border border-border p-8 rounded-sm shadow-sm flex flex-col">
              <Activity className="w-8 h-8 text-muted-foreground mb-6" />
              <h3 className="text-xl font-bold mb-3">Evidence & signal</h3>
              <p className="text-sm text-muted-foreground mb-6">Question-led explainers; labelled charts with source, unit, period; topic/year filters.</p>
              <div className="mt-auto pt-4 border-t border-border">
                <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">Risk</span>
                <p className="text-xs text-muted-foreground">Can become abstract; balance with member voices.</p>
              </div>
            </div>
          </div>
          <p className="mt-8 text-lg text-foreground max-w-4xl leading-relaxed bg-primary/5 p-6 border-l-4 border-primary">
            <strong>Coolness = visual character:</strong> clear opening message, disciplined typography, real member stories, good local photography, well-presented evidence. It does not require more animation, an app, or an AI feature. The site must remain fully useful with motion off.
          </p>
        </div>

        {/* 7 Principles & IA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Settings2 className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-serif font-bold">Design principles</h3>
            </div>
            <ol className="space-y-4 list-decimal list-inside text-foreground bg-white border border-border p-8 rounded-sm shadow-sm marker:text-primary marker:font-bold">
              <li className="pl-2 pb-2 border-b border-border/50">One primary action per page section.</li>
              <li className="pl-2 pb-2 border-b border-border/50">Useful content before decoration.</li>
              <li className="pl-2 pb-2 border-b border-border/50">Dates and conditions wherever they affect a decision.</li>
              <li className="pl-2 pb-2 border-b border-border/50">Member value expressed through concrete examples.</li>
              <li className="pl-2 pb-2 border-b border-border/50">Real public evidence separated from promotional claims.</li>
              <li className="pl-2 pb-2 border-b border-border/50">Consistent patterns across Serbian and English.</li>
              <li className="pl-2">Site-wide search and help always visible and accessible.</li>
            </ol>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-serif font-bold mb-6">Information architecture</h3>
              <div className="bg-white border border-border p-6 rounded-sm shadow-sm text-sm">
                <ul className="space-y-4 text-muted-foreground">
                  <li><strong className="text-foreground">Primary:</strong> Membership · Events · Advocacy · Insights · About</li>
                  <li><strong className="text-foreground">Global utilities:</strong> visible Search, EN/SR switch, Join action</li>
                  <li><strong className="text-foreground">Content relationships:</strong> an event belongs to topics; a research edition owns its summary, methodology and PDFs; member profiles use consistent sectors.</li>
                </ul>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-background border border-border p-6 rounded-sm">
                <ShieldCheck className="w-6 h-6 text-primary mb-4" />
                <h4 className="font-bold mb-2">Accessibility Target</h4>
                <p className="text-sm text-muted-foreground">WCAG 2.2 AA for the agreed scope, verified by manual + automated audit (keyboard, focus, zoom, reflow, screen reader).</p>
              </div>
              <div className="bg-background border border-border p-6 rounded-sm">
                <Maximize className="w-6 h-6 text-primary mb-4" />
                <h4 className="font-bold mb-2">Responsive & Motion</h4>
                <p className="text-sm text-muted-foreground">Build from 320px minimum. Transitions ~150–250ms. Respect prefers-reduced-motion. No zero-to-total counters.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Living Design Tokens */}
        <div className="mb-16">
          <h2 className="text-3xl font-serif font-bold mb-8">Living Design Tokens</h2>
          
          <div className="bg-white border border-border p-8 md:p-12 shadow-sm rounded-sm">
            
            <h3 className="text-lg font-bold mb-6 border-b border-border pb-2">1. Color Palette</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
              <div className="space-y-2">
                <div className="h-24 rounded-sm border border-border/50 bg-[#0B1221] shadow-inner"></div>
                <div className="text-xs">
                  <p className="font-bold text-foreground">Deep Ink Navy</p>
                  <p className="text-muted-foreground font-mono">var(--secondary)</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-sm border border-border/50 bg-[#F8F7F5] shadow-inner"></div>
                <div className="text-xs">
                  <p className="font-bold text-foreground">Warm Off-White</p>
                  <p className="text-muted-foreground font-mono">var(--background)</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-sm border border-border/50 bg-[#EB1E23] shadow-inner"></div>
                <div className="text-xs">
                  <p className="font-bold text-foreground">AmCham Red</p>
                  <p className="text-muted-foreground font-mono">var(--primary)</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-sm border border-border/50 bg-[#40D9F1] shadow-inner"></div>
                <div className="text-xs">
                  <p className="font-bold text-foreground">Bright Cyan</p>
                  <p className="text-muted-foreground font-mono">var(--accent)</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-sm border border-border/50 bg-white shadow-inner"></div>
                <div className="text-xs">
                  <p className="font-bold text-foreground">Pure White</p>
                  <p className="text-muted-foreground font-mono">var(--card)</p>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-6 border-b border-border pb-2">2. Typography</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Display / Headings</p>
                <div className="font-serif text-5xl mb-2 text-foreground">Playfair Display</div>
                <p className="text-lg font-serif text-muted-foreground mb-4">Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj</p>
                <div className="bg-background p-4 border border-border rounded-sm">
                  <h1 className="text-3xl font-serif font-bold mb-2">Heading 1</h1>
                  <h2 className="text-2xl font-serif font-bold mb-2">Heading 2</h2>
                  <h3 className="text-xl font-serif font-bold">Heading 3</h3>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">UI / Body / Data</p>
                <div className="font-sans text-4xl font-bold mb-3 text-foreground">Plus Jakarta Sans</div>
                <p className="text-base font-sans text-muted-foreground mb-4">Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj 0123456789</p>
                <div className="bg-background p-4 border border-border rounded-sm space-y-3">
                  <p className="text-base font-medium">Standard body text for readability.</p>
                  <p className="text-sm text-muted-foreground">Secondary text for descriptions.</p>
                  <p className="text-xs font-bold tracking-widest uppercase text-primary">Micro UI Labels</p>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-6 border-b border-border pb-2">3. Interactive Components</h3>
            <div className="flex flex-wrap gap-8 items-end">
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase">Primary Action</p>
                <button className="bg-primary text-primary-foreground px-6 py-3 rounded-sm font-semibold hover:bg-primary/90 transition-all shadow-sm">
                  Explore Membership
                </button>
              </div>
              
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase">Secondary Action</p>
                <button className="bg-white border-2 border-border text-foreground px-6 py-3 rounded-sm font-semibold hover:border-primary hover:text-primary transition-all">
                  View Upcoming Events
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase">Status Badge</p>
                <span className="px-3 py-1.5 bg-green-100 text-green-800 text-xs font-bold uppercase rounded-sm inline-block">
                  Registration Open
                </span>
              </div>
              
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase">Data Input</p>
                <input 
                  type="text" 
                  placeholder="Focus state..." 
                  className="w-48 border border-border p-3 rounded-sm bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                  readOnly
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </BlueprintLayout>
  );
}
