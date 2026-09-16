import { twMerge } from 'tailwind-merge';

import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Shared money helpers for the console's mock EUR figures (e.g. "€18k", "€500").
export function parseEuro(v: string): number {
  return parseFloat(v.replace(/[€k]/g, '')) * (v.includes('k') ? 1000 : 1);
}

export function fmtEuro(v: number): string {
  return v >= 1000 ? `€${Number((v / 1000).toFixed(1)).toString()}k` : `€${Math.round(v)}`;
}
