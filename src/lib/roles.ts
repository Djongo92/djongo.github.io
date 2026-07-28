// §4 — the five named firm roles, and what each can actually do. 'owner'
// and 'member' are legacy values (every firm's auto-provisioned creator
// still gets 'owner' from the signup trigger) kept working rather than
// migrated away — 'owner' behaves as a permanent superset of 'admin',
// 'member' as an alias for 'marketing', so no existing row's access
// silently changes underneath it.
export type FirmRole = "owner" | "admin" | "marketing" | "partner" | "consultant" | "executive" | "member";

/** The roles an admin can actually pick when creating an invite link — never owner. */
export const INVITABLE_ROLES: Exclude<FirmRole, "owner" | "member">[] = [
  "admin", "marketing", "partner", "consultant", "executive",
];

export interface RolePermissions {
  label: string;
  description: string;
  canManageMembers: boolean;
  canEditFirmProfile: boolean;
  canRunAudits: boolean;
  canPublish: boolean;
  canApproveWorkflow: boolean;
  canComment: boolean;
  readOnly: boolean;
}

const ADMIN_PERMS: Omit<RolePermissions, "label" | "description"> = {
  canManageMembers: true, canEditFirmProfile: true, canRunAudits: true,
  canPublish: true, canApproveWorkflow: true, canComment: true, readOnly: false,
};

export const ROLE_PERMISSIONS: Record<FirmRole, RolePermissions> = {
  owner: { label: "Workspace Admin", description: "Full control — the firm's original account.", ...ADMIN_PERMS },
  admin: { label: "Workspace Admin", description: "Full control: manage the team, firm profile, and every audit.", ...ADMIN_PERMS },
  marketing: {
    label: "Marketing User", description: "Runs audits, uses the Workshop, edits the firm profile, publishes the score.",
    canManageMembers: false, canEditFirmProfile: true, canRunAudits: true, canPublish: true,
    canApproveWorkflow: false, canComment: true, readOnly: false,
  },
  partner: {
    label: "Partner Contributor", description: "Reviews and approves work assigned to them; doesn't run audits or edit the firm profile.",
    canManageMembers: false, canEditFirmProfile: false, canRunAudits: false, canPublish: false,
    canApproveWorkflow: true, canComment: true, readOnly: false,
  },
  consultant: {
    label: "External Consultant", description: "Scoped, time-boundable access to run audits and edit the firm profile — not team management.",
    canManageMembers: false, canEditFirmProfile: true, canRunAudits: true, canPublish: false,
    canApproveWorkflow: false, canComment: true, readOnly: false,
  },
  executive: {
    label: "Read-Only Executive", description: "Sees everything, changes nothing.",
    canManageMembers: false, canEditFirmProfile: false, canRunAudits: false, canPublish: false,
    canApproveWorkflow: false, canComment: false, readOnly: true,
  },
  member: {
    label: "Marketing User", description: "Runs audits, uses the Workshop, edits the firm profile, publishes the score.",
    canManageMembers: false, canEditFirmProfile: true, canRunAudits: true, canPublish: true,
    canApproveWorkflow: false, canComment: true, readOnly: false,
  },
};

export function can(role: string | null | undefined, permission: keyof Omit<RolePermissions, "label" | "description">): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role as FirmRole];
  return perms ? perms[permission] === true : false;
}

export function roleLabel(role: string | null | undefined): string {
  if (!role) return "Member";
  return ROLE_PERMISSIONS[role as FirmRole]?.label ?? role;
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}
