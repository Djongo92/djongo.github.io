// §5 — Firm profile: configure once, inherit everywhere. Server-persisted
// (useFirmProfile → firm_profiles), gated by role (canEditFirmProfile) —
// a read-only executive or partner contributor sees the same data but no
// inputs. This is deliberately a separate component from the lighter
// PersonalizeOnboarding wizard (practice area / firm size / primary goal,
// still localStorage-only): that one is a fast first-run nudge, this is
// the exhaustive profile every tool/audit should read from.
import { useEffect, useState } from "react";
import { Briefcase, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useFirmProfile, type CompetitorEntry, type OfficeEntry, type LawyerEntry } from "@/hooks/useFirmProfile";
import { useFirmTeam } from "@/hooks/useFirmTeam";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/roles";
import { PRACTICE_AREAS } from "@/components/PersonalizeOnboarding";

const inputClass = "w-full bg-secondary/80 border border-border text-foreground text-sm font-body px-3 py-2 rounded-sm focus:outline-none focus:border-primary disabled:opacity-60";
const labelClass = "block text-xs text-muted-foreground font-body mb-1";

const RepeatableRows = <T extends Record<string, string | undefined>>({
  rows, fields, onChange, disabled, addLabel,
}: {
  rows: T[];
  fields: { key: keyof T; placeholder: string }[];
  onChange: (rows: T[]) => void;
  disabled: boolean;
  addLabel: string;
}) => (
  <div className="space-y-2">
    {rows.map((row, i) => (
      <div key={i} className="flex items-center gap-2">
        {fields.map(({ key, placeholder }) => (
          <input
            key={String(key)}
            value={row[key] ?? ""}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: e.target.value } : r)))}
            className={inputClass}
          />
        ))}
        {!disabled && (
          <button onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    ))}
    {!disabled && (
      <button
        onClick={() => onChange([...rows, Object.fromEntries(fields.map((f) => [f.key, ""])) as T])}
        className="inline-flex items-center gap-1 text-xs text-primary hover:text-gold-light font-body"
      >
        <Plus className="w-3 h-3" /> {addLabel}
      </button>
    )}
  </div>
);

const FirmProfileSettings = () => {
  const { user } = useAuth();
  const { team } = useFirmTeam();
  const { profile, loading, saving, save } = useFirmProfile();
  const myRole = team?.members.find((m) => m.user_id === user?.id)?.role;
  const canEdit = can(myRole, "canEditFirmProfile");

  const [website, setWebsite] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [jurisdictions, setJurisdictions] = useState("");
  const [practiceAreas, setPracticeAreas] = useState<string[]>([]);
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [preferTerms, setPreferTerms] = useState("");
  const [avoidTerms, setAvoidTerms] = useState("");
  const [competitors, setCompetitors] = useState<CompetitorEntry[]>([]);
  const [offices, setOffices] = useState<OfficeEntry[]>([]);
  const [roster, setRoster] = useState<LawyerEntry[]>([]);
  const [chambersUrl, setChambersUrl] = useState("");
  const [legal500Url, setLegal500Url] = useState("");
  const [iflr1000Url, setIflr1000Url] = useState("");
  const [brandRules, setBrandRules] = useState("");
  const [clientRestrictions, setClientRestrictions] = useState("");

  useEffect(() => {
    if (!profile) return;
    setWebsite(profile.website ?? "");
    setLinkedinUrl(profile.linkedin_url ?? "");
    setJurisdictions((profile.jurisdictions ?? []).join(", "));
    setPracticeAreas(profile.practice_areas ?? []);
    setToneOfVoice(profile.tone_of_voice ?? "");
    setPreferTerms((profile.preferred_terminology?.prefer ?? []).join(", "));
    setAvoidTerms((profile.preferred_terminology?.avoid ?? []).join(", "));
    setCompetitors(profile.competitor_set ?? []);
    setOffices(profile.offices ?? []);
    setRoster(profile.lawyer_roster ?? []);
    setChambersUrl(profile.directory_profiles?.chambers ?? "");
    setLegal500Url(profile.directory_profiles?.legal500 ?? "");
    setIflr1000Url(profile.directory_profiles?.iflr1000 ?? "");
    setBrandRules(profile.brand_rules ?? "");
    setClientRestrictions(profile.client_restrictions ?? "");
  }, [profile]);

  const togglePracticeArea = (area: string) => {
    setPracticeAreas((prev) => (prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]));
  };

  const handleSave = async () => {
    const result = await save({
      website: website.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      jurisdictions: jurisdictions.split(",").map((s) => s.trim()).filter(Boolean),
      practice_areas: practiceAreas,
      tone_of_voice: toneOfVoice.trim() || null,
      preferred_terminology: {
        prefer: preferTerms.split(",").map((s) => s.trim()).filter(Boolean),
        avoid: avoidTerms.split(",").map((s) => s.trim()).filter(Boolean),
      },
      competitor_set: competitors.filter((c) => c.name || c.domain),
      offices: offices.filter((o) => o.city || o.country),
      lawyer_roster: roster.filter((l) => l.name || l.title),
      directory_profiles: {
        chambers: chambersUrl.trim() || undefined,
        legal500: legal500Url.trim() || undefined,
        iflr1000: iflr1000Url.trim() || undefined,
      },
      brand_rules: brandRules.trim() || null,
      client_restrictions: clientRestrictions.trim() || null,
    });
    if ("error" in result) toast.error(result.error);
    else toast.success("Firm profile saved — every tool and audit now reads from this.");
  };

  if (!user) return null;

  return (
    <div className="bg-card border border-border/50 rounded-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" />
          <h2 className="font-display text-lg text-foreground">Firm Profile</h2>
        </div>
        {!canEdit && (
          <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-body">Read-only</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground font-body mb-4">
        Configure once — every Workshop tool and every audit reads from this instead of asking again.
      </p>

      {loading ? (
        <p className="text-xs text-muted-foreground font-body">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Website</label>
              <input value={website} disabled={!canEdit} onChange={(e) => setWebsite(e.target.value)} className={inputClass} placeholder="https://yourfirm.com" />
            </div>
            <div>
              <label className={labelClass}>LinkedIn</label>
              <input value={linkedinUrl} disabled={!canEdit} onChange={(e) => setLinkedinUrl(e.target.value)} className={inputClass} placeholder="https://linkedin.com/company/..." />
            </div>
          </div>

          <div>
            <label className={labelClass}>Jurisdictions (comma-separated)</label>
            <input value={jurisdictions} disabled={!canEdit} onChange={(e) => setJurisdictions(e.target.value)} className={inputClass} placeholder="Serbia, Croatia, ..." />
          </div>

          <div>
            <label className={labelClass}>Practice areas</label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRACTICE_AREAS.map((area) => (
                <label key={area} className="flex items-center gap-2 text-xs font-body text-secondary-foreground/80">
                  <input type="checkbox" disabled={!canEdit} checked={practiceAreas.includes(area)} onChange={() => togglePracticeArea(area)} />
                  {area}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Tone of voice</label>
            <input value={toneOfVoice} disabled={!canEdit} onChange={(e) => setToneOfVoice(e.target.value)} className={inputClass} placeholder="Confident, direct, no legalese" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Preferred terms (comma-separated)</label>
              <input value={preferTerms} disabled={!canEdit} onChange={(e) => setPreferTerms(e.target.value)} className={inputClass} placeholder="clients, matters" />
            </div>
            <div>
              <label className={labelClass}>Terms to avoid</label>
              <input value={avoidTerms} disabled={!canEdit} onChange={(e) => setAvoidTerms(e.target.value)} className={inputClass} placeholder="customers, cases" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Competitor set</label>
            <RepeatableRows
              rows={competitors}
              fields={[{ key: "name", placeholder: "Competitor name" }, { key: "domain", placeholder: "domain.com" }]}
              onChange={setCompetitors}
              disabled={!canEdit}
              addLabel="Add competitor"
            />
          </div>

          <div>
            <label className={labelClass}>Offices</label>
            <RepeatableRows
              rows={offices}
              fields={[{ key: "city", placeholder: "City" }, { key: "country", placeholder: "Country" }]}
              onChange={setOffices}
              disabled={!canEdit}
              addLabel="Add office"
            />
          </div>

          <div>
            <label className={labelClass}>Lawyer roster</label>
            <RepeatableRows
              rows={roster}
              fields={[{ key: "name", placeholder: "Name" }, { key: "title", placeholder: "Title" }]}
              onChange={setRoster}
              disabled={!canEdit}
              addLabel="Add lawyer"
            />
          </div>

          <div>
            <label className={labelClass}>Directory profiles</label>
            <div className="space-y-2">
              <input value={chambersUrl} disabled={!canEdit} onChange={(e) => setChambersUrl(e.target.value)} className={inputClass} placeholder="Chambers profile URL" />
              <input value={legal500Url} disabled={!canEdit} onChange={(e) => setLegal500Url(e.target.value)} className={inputClass} placeholder="Legal 500 profile URL" />
              <input value={iflr1000Url} disabled={!canEdit} onChange={(e) => setIflr1000Url(e.target.value)} className={inputClass} placeholder="IFLR1000 profile URL" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Brand rules</label>
            <textarea value={brandRules} disabled={!canEdit} onChange={(e) => setBrandRules(e.target.value)} rows={3} className={inputClass} placeholder="Logo usage, required disclaimers, tagline, ..." />
          </div>

          <div>
            <label className={labelClass}>Client restrictions</label>
            <textarea value={clientRestrictions} disabled={!canEdit} onChange={(e) => setClientRestrictions(e.target.value)} rows={2} className={inputClass} placeholder="Clients/matters that can never be named publicly" />
          </div>

          {profile && profile.approved_content.length > 0 && (
            <div>
              <label className={labelClass}>Previously approved content ({profile.approved_content.length})</label>
              <div className="space-y-1.5">
                {profile.approved_content.map((c, i) => (
                  <div key={i} className="text-xs font-body bg-secondary/50 rounded-sm px-3 py-2">
                    <p className="text-foreground">{c.title}</p>
                    <p className="text-muted-foreground text-[10px]">Approved by {c.approvedBy} · {new Date(c.approvedAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-sm font-body text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {saving ? "Saving…" : "Save firm profile"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FirmProfileSettings;
