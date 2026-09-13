import React, { useState } from 'react';
import { usePortalState } from '../portal-state';
import { Settings, Shield, User, Globe, History, CheckCircle2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function SeamView({ t, showToast }: any) {
  const { seamProfile, setSeamProfile } = usePortalState();
  const [localProfile, setLocalProfile] = useState(seamProfile);
  const [hasChanges, setHasChanges] = useState(false);

  const toggle = (key: keyof typeof localProfile) => {
    setLocalProfile((p: any) => ({ ...p, [key]: !p[key] }));
    setHasChanges(true);
  };

  const save = () => {
    const action = t('portal_updated_preferences', 'Updated sharing preferences');
    const updated = {
      ...localProfile,
      history: [{ date: new Date().toLocaleDateString(), action }, ...localProfile.history]
    };
    setSeamProfile(updated);
    setLocalProfile(updated);
    setHasChanges(false);
    showToast(t('portal_prefs_saved', 'Preferences saved'));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="bg-card border border-border rounded-[40px] p-8 md:p-12 shadow-sm flex flex-col xl:flex-row gap-12">
        
        <div className="flex-1 space-y-12">
          <div>
            <h2 className="text-3xl font-serif font-light mb-3">{t('portal_privacy_center', 'Privacy & Sharing Center')}</h2>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              {t('portal_privacy_desc', 'Control exactly what parts of your membership profile are visible to other AmCham members in the directory.')}
            </p>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('portal_field_sharing', 'Field-Level Sharing')}</h3>
            
            <div className="space-y-4">
              <ToggleRow 
                title={t('portal_share_committees', 'Share Committees')}
                desc={t('portal_share_committees_desc', 'Show which committees your team participates in.')}
                value={localProfile.shareCommittees}
                onToggle={() => toggle('shareCommittees')}
              />
              <ToggleRow 
                title={t('portal_show_directory', 'Show in Directory')}
                desc={t('portal_show_directory_desc', 'Allow other members to find you and request intros.')}
                value={localProfile.shareDirectory}
                onToggle={() => toggle('shareDirectory')}
              />
              <ToggleRow 
                title={t('portal_share_score', 'Share Value Score')}
                desc={t('portal_share_score_desc', 'Display your aggregated engagement level. (Not recommended)')}
                value={localProfile.shareScore}
                onToggle={() => toggle('shareScore')}
              />
            </div>
          </div>
          
          <div className="pt-6 border-t border-border flex items-center justify-between">
            <button onClick={() => { setLocalProfile(seamProfile); setHasChanges(false); }} className="text-sm font-bold text-muted-foreground hover:text-foreground" disabled={!hasChanges}>{t('portal_cancel', 'Cancel')}</button>
            <button onClick={save} disabled={!hasChanges} className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-bold text-sm disabled:opacity-50 transition-all shadow-sm">{t('portal_save_changes', 'Save Changes')}</button>
          </div>
        </div>

        <div className="xl:w-[400px] shrink-0 flex flex-col gap-6">
          <div className="bg-muted/30 border border-border rounded-[32px] p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />
             <div className="flex items-center justify-between mb-6 relative z-10">
               <div className="flex items-center gap-2">
                 <Globe className="w-5 h-5 text-primary" />
                 <h3 className="font-serif text-xl font-medium">{t('portal_public_preview', 'Public Preview')}</h3>
               </div>
               <span className="text-[10px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-full">{t('portal_live', 'Live')}</span>
             </div>
             
             <div className="bg-card border border-border shadow-md p-6 rounded-[24px] relative z-10 transition-all duration-500">
               <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-4">A</div>
               <h4 className="text-lg font-serif font-medium mb-1">Adriatica Grupa</h4>
               <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-4">Manufacturing</div>
               
               <div className="space-y-3 pt-4 border-t border-border">
                 {localProfile.shareCommittees ? (
                   <div className="flex items-center gap-2 text-xs text-foreground bg-green-500/5 p-2 rounded-lg border border-green-500/10"><CheckCircle2 className="w-3.5 h-3.5 text-green-500"/> Digital Economy Committee</div>
                 ) : (
                   <div className="flex items-center gap-2 text-xs text-muted-foreground italic bg-muted/50 p-2 rounded-lg"><EyeOff className="w-3.5 h-3.5"/> Committees hidden</div>
                 )}
                 
                 {localProfile.shareScore ? (
                   <div className="flex items-center gap-2 text-xs text-foreground bg-primary/5 p-2 rounded-lg border border-primary/10"><Shield className="w-3.5 h-3.5 text-primary"/> Engagement Score: 62</div>
                 ) : (
                   <div className="flex items-center gap-2 text-xs text-muted-foreground italic bg-muted/50 p-2 rounded-lg"><EyeOff className="w-3.5 h-3.5"/> Score hidden</div>
                 )}
               </div>
             </div>
             
             {!localProfile.shareDirectory && (
               <div className="mt-4 p-3 bg-destructive/10 text-destructive text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2 relative z-10 border border-destructive/20">
                 <AlertTriangle className="w-4 h-4"/> {t('portal_profile_hidden', 'Profile is hidden from directory.')}
               </div>
             )}
          </div>

          <div className="bg-card border border-border rounded-[32px] p-6 shadow-sm">
             <div className="flex items-center gap-2 mb-6">
               <History className="w-5 h-5 text-muted-foreground" />
               <h3 className="font-serif text-lg font-medium">{t('portal_consent_history', 'Consent History')}</h3>
             </div>
             <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[5px] before:-translate-x-px before:h-full before:w-0.5 before:bg-border pl-6">
               {localProfile.history.slice(0,4).map((h:any, i:number) => (
                 <div key={i} className="relative">
                   <div className="absolute -left-[29px] top-1.5 w-2.5 h-2.5 rounded-full bg-background border-2 border-primary z-10"/>
                   <div className="text-xs font-bold text-foreground mb-0.5">{h.action}</div>
                   <div className="text-[10px] text-muted-foreground font-medium">{h.date}</div>
                 </div>
               ))}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ToggleRow({ title, desc, value, onToggle }: any) {
  return (
    <div className="flex justify-between items-center p-5 bg-card hover:bg-muted/30 border border-border rounded-3xl transition-colors cursor-pointer" onClick={onToggle}>
      <div className="pr-4">
        <div className="text-sm font-bold text-foreground mb-1">{title}</div>
        <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
      </div>
      <div 
        className={cn("w-12 h-6 rounded-full transition-colors relative shrink-0", value ? "bg-primary" : "bg-muted-foreground/30")}
      >
        <motion.div 
          animate={{ x: value ? 24 : 2 }} 
          className="w-5 h-5 bg-background rounded-full shadow-sm absolute top-0.5"
        />
      </div>
    </div>
  );
}
