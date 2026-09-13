export interface MembershipGrowthPoint {
  year: number;
  members: number;
}

export interface SectorShare {
  sector: string;
  sectorSr: string;
  members: number;
}

// Illustrative trend data for the public Impact page — shaped like AmCham's
// real membership trajectory (steady growth, a pandemic-era dip), not a
// re-published internal figure.
export const membershipGrowth: MembershipGrowthPoint[] = [
  { year: 2018, members: 165 },
  { year: 2019, members: 178 },
  { year: 2020, members: 172 },
  { year: 2021, members: 190 },
  { year: 2022, members: 208 },
  { year: 2023, members: 224 },
  { year: 2024, members: 238 },
  { year: 2025, members: 251 },
  { year: 2026, members: 262 },
];

export const sectorBreakdown: SectorShare[] = [
  { sector: "Manufacturing", sectorSr: "Proizvodnja", members: 58 },
  { sector: "IT & Technology", sectorSr: "IT i tehnologija", members: 45 },
  { sector: "Financial Services", sectorSr: "Finansijske usluge", members: 38 },
  { sector: "Pharma & Healthcare", sectorSr: "Farmacija i zdravstvo", members: 32 },
  { sector: "FMCG & Retail", sectorSr: "Roba široke potrošnje i trgovina", members: 28 },
  { sector: "Professional Services", sectorSr: "Profesionalne usluge", members: 25 },
  { sector: "Energy & Utilities", sectorSr: "Energetika i komunalne usluge", members: 22 },
  { sector: "Other", sectorSr: "Ostalo", members: 12 },
];
