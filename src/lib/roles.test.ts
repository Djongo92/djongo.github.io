import { describe, it, expect } from "vitest";
import { can, roleLabel, isAdminRole, INVITABLE_ROLES } from "./roles";

describe("can", () => {
  it("gives admin and owner full permissions", () => {
    expect(can("owner", "canManageMembers")).toBe(true);
    expect(can("admin", "canManageMembers")).toBe(true);
    expect(can("owner", "readOnly")).toBe(false);
  });

  it("a read-only executive can't do anything but read", () => {
    expect(can("executive", "canRunAudits")).toBe(false);
    expect(can("executive", "canComment")).toBe(false);
    expect(can("executive", "readOnly")).toBe(true);
  });

  it("a partner contributor can approve workflow but not run audits or manage members", () => {
    expect(can("partner", "canApproveWorkflow")).toBe(true);
    expect(can("partner", "canRunAudits")).toBe(false);
    expect(can("partner", "canManageMembers")).toBe(false);
  });

  it("a marketing user can run audits and edit the firm profile but not manage members", () => {
    expect(can("marketing", "canRunAudits")).toBe(true);
    expect(can("marketing", "canEditFirmProfile")).toBe(true);
    expect(can("marketing", "canManageMembers")).toBe(false);
  });

  it("legacy 'member' behaves like marketing, not like read-only", () => {
    expect(can("member", "canRunAudits")).toBe(true);
    expect(can("member", "readOnly")).toBe(false);
  });

  it("returns false for an unknown or missing role rather than throwing", () => {
    expect(can(undefined, "canRunAudits")).toBe(false);
    expect(can("nonsense", "canRunAudits")).toBe(false);
  });
});

describe("roleLabel", () => {
  it("labels owner and admin identically as Workspace Admin", () => {
    expect(roleLabel("owner")).toBe("Workspace Admin");
    expect(roleLabel("admin")).toBe("Workspace Admin");
  });
});

describe("isAdminRole", () => {
  it("is true only for owner/admin", () => {
    expect(isAdminRole("owner")).toBe(true);
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("marketing")).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});

describe("INVITABLE_ROLES", () => {
  it("never includes owner — an admin invite must be an explicit, separate role", () => {
    expect(INVITABLE_ROLES).not.toContain("owner");
    expect(INVITABLE_ROLES).not.toContain("member");
  });
});
