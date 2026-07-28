// §11 — Consultant layer: switches which client workspace the app acts as.
// Only renders once the signed-in user actually belongs to more than one
// firm — a solo account or a single-firm team member never sees this.
import { Building2 } from "lucide-react";
import { useConsultantWorkspaces } from "@/hooks/useConsultantWorkspaces";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";

const WorkspaceSwitcher = () => {
  const { workspaces, loading } = useConsultantWorkspaces();
  const { activeFirmId, setActiveFirmId } = useActiveWorkspace();

  if (loading || workspaces.length < 2) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-secondary/40 border border-border/40 rounded-sm">
      <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
      <select
        value={activeFirmId ?? workspaces[0].firmId}
        onChange={(e) => setActiveFirmId(e.target.value)}
        className="flex-1 bg-transparent text-xs font-body text-foreground focus:outline-none"
      >
        {workspaces.map((w) => (
          <option key={w.firmId} value={w.firmId}>{w.firmName} · {w.role}</option>
        ))}
      </select>
    </div>
  );
};

export default WorkspaceSwitcher;
