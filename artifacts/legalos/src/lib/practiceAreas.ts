// Practice-area code labels for Chambers and Legal 500 ranked tables — see
// CLAUDE.md's "Codes" section. The two directories don't use identical code
// sets (Chambers has PR, Legal 500 has PE and RE instead), so this is a
// merged lookup covering both rather than two separate maps.
export const PRACTICE_AREA_LABELS: Record<string, string> = {
  BF: "Banking & Finance",
  CO: "Competition / Antitrust",
  CC: "Corporate / M&A",
  DR: "Dispute Resolution",
  EM: "Employment",
  IP: "IP & Technology",
  PR: "Projects / Infrastructure / Energy",
  PE: "Projects & Energy",
  RE: "Real Estate & Construction",
};

export const practiceAreaLabel = (code: string): string => PRACTICE_AREA_LABELS[code] ?? code;
