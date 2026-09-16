import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Globe, CheckCircle2, RefreshCw, Linkedin, Calendar, MessageCircle, MapPin, Mail, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Integration {
  id: string;
  name: string;
  desc: string;
  icon: React.ElementType;
  connected: boolean;
  lastSynced: string;
}

const INITIAL: Integration[] = [
  { id: 'linkedin', name: 'LinkedIn', desc: 'Company page follower counts and post engagement for Social Presence scoring.', icon: Linkedin, connected: true, lastSynced: '4 hours ago' },
  { id: 'gcal', name: 'Google Calendar', desc: 'Syncs committee meetings and events into your staff calendar.', icon: Calendar, connected: true, lastSynced: '11 minutes ago' },
  { id: 'slack', name: 'Slack', desc: 'Posts Ritual queue alerts and renewal-risk flags into #membership-team.', icon: MessageCircle, connected: true, lastSynced: '2 hours ago' },
  { id: 'places', name: 'Google Places', desc: 'Business profile presence checks for the directory.', icon: MapPin, connected: true, lastSynced: '1 day ago' },
  { id: 'mailchimp', name: 'Mailchimp', desc: 'Outreach queue sync for email campaign follow-ups.', icon: Mail, connected: false, lastSynced: '—' },
  { id: 'ga', name: 'Google Analytics', desc: 'Member-site traffic signals feeding Market Signals scoring.', icon: BarChart3, connected: true, lastSynced: '38 minutes ago' },
];

export function IntegrationsView({ showToast }: { showToast: (m: string) => void }) {
  const [integrations, setIntegrations] = useState(INITIAL);

  const toggle = (id: string) => {
    setIntegrations(prev => prev.map(i => {
      if (i.id !== id) return i;
      const connected = !i.connected;
      showToast(connected ? `Connected to ${i.name}` : `Disconnected from ${i.name}`);
      return { ...i, connected, lastSynced: connected ? 'Just now' : '—' };
    }));
  };

  const connectedCount = integrations.filter(i => i.connected).length;

  return (
    <div className="max-w-4xl mx-auto font-sans pb-20">
      <div className="mb-12 border-b border-border pb-6">
        <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2 flex items-center gap-3"><Globe className="w-8 h-8 text-primary" /> Integrations</h2>
        <p className="text-sm font-medium text-muted-foreground max-w-2xl">Connected data sources feeding the platform's scoring and outreach tools. {connectedCount} of {integrations.length} active.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map(i => (
          <div key={i.id} className="bg-card border border-border rounded-[32px] p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", i.connected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  <i.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-foreground">{i.name}</div>
                  {i.connected ? (
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1 mt-0.5"><CheckCircle2 className="w-3 h-3" /> Connected</div>
                  ) : (
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Not connected</div>
                  )}
                </div>
              </div>
              <Switch checked={i.connected} onCheckedChange={() => toggle(i.id)} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{i.desc}</p>
            <div className="pt-3 border-t border-border/50 flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <RefreshCw className="w-3 h-3" /> Last synced: {i.lastSynced}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
