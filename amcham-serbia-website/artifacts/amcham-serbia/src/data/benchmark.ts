// AmCham network website benchmark, October 2026: every full member of
// AmChams in Europe with a public site, scored on twelve checks
// (2 meets, 1 partly, 0 doesn't, U couldn't check, N/A not applicable).
// PSI = Google PageSpeed Insights, home page, Performance / Accessibility.
// Transcribed from the benchmark's Appendix A.

export type Score = '2' | '1' | '0' | 'U' | 'N/A';

export interface BenchmarkRow {
  name: string;
  url: string;
  scores: Score[];
  /** C9 slider present but motion not confirmed. */
  starC9: boolean;
  total: string;
  rank: number | null;
  psiMobile: string;
  psiDesktop: string;
}

export const BENCHMARK_ROWS: BenchmarkRow[] = [
  { name: "AmCham Serbia", url: "amcham.rs", scores: ["2", "1", "1", "1", "2", "1", "1", "1", "0", "1", "1", "1"], starC9: false, total: "13/24 (54%)", rank: 35, psiMobile: "53 / 84", psiDesktop: "73 / 83" },
  { name: "AmCham Albania", url: "amcham.com.al", scores: ["2", "2", "1", "1", "2", "1", "2", "1", "0", "1", "2", "2"], starC9: false, total: "17/24 (71%)", rank: 6, psiMobile: "55 / 88", psiDesktop: "63 / 87" },
  { name: "AmCham Armenia", url: "amcham.am", scores: ["2", "2", "1", "1", "0", "1", "U", "2", "1", "2", "2", "1"], starC9: false, total: "15/22 (68%)", rank: 13, psiMobile: "56 / 88", psiDesktop: "75 / 92" },
  { name: "AmCham Austria", url: "amcham.at", scores: ["2", "1", "1", "1", "0", "2", "1", "U", "1", "2", "2", "1"], starC9: false, total: "14/22 (64%)", rank: 18, psiMobile: "66 / 88", psiDesktop: "55 / 93" },
  { name: "AmCham Azerbaijan", url: "amcham.az", scores: ["2", "2", "1", "1", "2", "2", "1", "1", "1", "2", "2", "U"], starC9: false, total: "17/22 (77%)", rank: 1, psiMobile: "52 / 84", psiDesktop: "65 / 80" },
  { name: "AmCham Belgium", url: "amcham.be", scores: ["1", "1", "1", "1", "0", "2", "1", "0", "1", "2", "2", "2"], starC9: false, total: "14/24 (58%)", rank: 29, psiMobile: "66 / 84", psiDesktop: "94 / 85" },
  { name: "AmCham BiH (Bosnia and Herzegovina)", url: "amcham.ba", scores: ["2", "2", "0", "0", "2", "1", "1", "2", "1", "1", "1", "0"], starC9: false, total: "13/24 (54%)", rank: 35, psiMobile: "34 / 78", psiDesktop: "49 / 74" },
  { name: "AmCham Bulgaria", url: "amcham.bg", scores: ["2", "2", "0", "1", "0", "2", "1", "2", "2", "2", "1", "2"], starC9: false, total: "17/24 (71%)", rank: 6, psiMobile: "43 / 82", psiDesktop: "80 / 83" },
  { name: "AmCham Croatia", url: "amcham.hr", scores: ["2", "1", "1", "1", "2", "2", "2", "2", "2", "2", "1", "0"], starC9: true, total: "18/24 (75%)", rank: 2, psiMobile: "54 / 92", psiDesktop: "49 / 85" },
  { name: "AmCham Cyprus", url: "amcham.cy", scores: ["2", "1", "1", "0", "0", "1", "0", "U", "1", "2", "2", "2"], starC9: false, total: "12/22 (55%)", rank: 32, psiMobile: "57 / 79", psiDesktop: "74 / 79" },
  { name: "AmCham Czech Republic", url: "amcham.cz", scores: ["1", "2", "1", "2", "0", "2", "0", "1", "1", "1", "1", "U"], starC9: false, total: "12/22 (55%)", rank: 32, psiMobile: "51 / 93", psiDesktop: "65 / 97" },
  { name: "AmCham Denmark", url: "amcham.dk", scores: ["2", "2", "1", "1", "0", "1", "1", "1", "2", "2", "1", "U"], starC9: false, total: "14/22 (64%)", rank: 18, psiMobile: "64 / 82", psiDesktop: "74 / 84" },
  { name: "AmCham EU (Brussels)", url: "amchameu.eu", scores: ["2", "2", "1", "2", "N/A", "2", "1", "1", "2", "1", "1", "0"], starC9: false, total: "15/22 (68%)", rank: 13, psiMobile: "68 / 95", psiDesktop: "89 / 98" },
  { name: "AmCham Estonia", url: "amcham.ee", scores: ["2", "1", "0", "2", "0", "1", "1", "2", "1", "2", "2", "U"], starC9: false, total: "14/22 (64%)", rank: 18, psiMobile: "47 / 93", psiDesktop: "49 / 96" },
  { name: "AmCham Finland", url: "amcham.fi", scores: ["2", "2", "1", "1", "0", "1", "2", "2", "1", "2", "1", "2"], starC9: false, total: "17/24 (71%)", rank: 6, psiMobile: "62 / 92", psiDesktop: "88 / 92" },
  { name: "AmCham France", url: "amchamfrance.org", scores: ["1", "2", "1", "1", "0", "1", "1", "1", "2", "1", "1", "0"], starC9: false, total: "12/24 (50%)", rank: 39, psiMobile: "57 / 96", psiDesktop: "73 / 96" },
  { name: "AmCham Georgia", url: "amcham.ge", scores: ["1", "0", "1", "0", "0", "1", "0", "1", "2", "1", "1", "0"], starC9: false, total: "8/24 (33%)", rank: 42, psiMobile: "81 / 59", psiDesktop: "74 / 59" },
  { name: "AmCham Germany", url: "amcham.de", scores: ["2", "2", "1", "1", "0", "2", "1", "2", "2", "1", "1", "2"], starC9: false, total: "17/24 (71%)", rank: 6, psiMobile: "66 / 91", psiDesktop: "84 / 91" },
  { name: "AmCham Gibraltar", url: "amcham.gi", scores: ["1", "2", "2", "2", "2", "1", "0", "1", "2", "1", "1", "0"], starC9: false, total: "15/24 (63%)", rank: 22, psiMobile: "96 / 94", psiDesktop: "100 / 94" },
  { name: "AmCham Greece", url: "amcham.gr", scores: ["2", "1", "1", "1", "0", "2", "1", "1", "1", "1", "1", "2"], starC9: false, total: "14/24 (58%)", rank: 29, psiMobile: "54 / 80", psiDesktop: "34 / 82" },
  { name: "AmCham Hungary", url: "amcham.hu", scores: ["2", "2", "1", "1", "0", "2", "1", "2", "1", "2", "2", "U"], starC9: false, total: "16/22 (73%)", rank: 4, psiMobile: "66 / 93", psiDesktop: "64 / 86" },
  { name: "AmCham Ireland", url: "amcham.ie", scores: ["1", "2", "1", "1", "2", "1", "1", "0", "1", "2", "1", "0"], starC9: false, total: "13/24 (54%)", rank: 35, psiMobile: "56 / 82", psiDesktop: "61 / 83" },
  { name: "AmCham Italy", url: "amcham.it", scores: ["2", "2", "1", "0", "2", "1", "2", "1", "1", "1", "2", "0"], starC9: false, total: "15/24 (63%)", rank: 22, psiMobile: "51 / 79", psiDesktop: "61 / 68" },
  { name: "AmCham Kosovo", url: "amcham.network", scores: ["1", "1", "1", "1", "1", "1", "1", "1", "2", "1", "1", "2"], starC9: false, total: "14/24 (58%)", rank: 29, psiMobile: "60 / 87", psiDesktop: "84 / 88" },
  { name: "AmCham Latvia", url: "amcham.lv", scores: ["2", "2", "1", "1", "0", "2", "1", "2", "2", "2", "2", "0"], starC9: false, total: "17/24 (71%)", rank: 6, psiMobile: "68 / 92", psiDesktop: "61 / 84" },
  { name: "AmCham Lithuania", url: "amcham.lt", scores: ["1", "2", "0", "1", "0", "2", "1", "U", "0", "2", "2", "2"], starC9: false, total: "13/22 (59%)", rank: 27, psiMobile: "20 / 88", psiDesktop: "48 / 89" },
  { name: "AmCham Moldova", url: "amcham.md", scores: ["2", "2", "1", "0", "0", "2", "1", "2", "0", "1", "1", "U"], starC9: false, total: "12/22 (55%)", rank: 32, psiMobile: "57 / 75", psiDesktop: "83 / 73" },
  { name: "AmCham Montenegro", url: "amcham.me", scores: ["2", "1", "1", "1", "2", "U", "1", "1", "2", "1", "2", "0"], starC9: false, total: "14/22 (64%)", rank: 18, psiMobile: "66 / 89", psiDesktop: "83 / 94" },
  { name: "AmCham Netherlands", url: "amcham.nl", scores: ["1", "2", "1", "1", "0", "2", "2", "0", "2", "1", "1", "U"], starC9: false, total: "13/22 (59%)", rank: 27, psiMobile: "74 / 89", psiDesktop: "92 / 91" },
  { name: "AmCham North Macedonia", url: "amcham.mk", scores: ["2", "1", "1", "0", "2", "2", "1", "1", "1", "2", "1", "2"], starC9: false, total: "16/24 (67%)", rank: 16, psiMobile: "53 / 73", psiDesktop: "64 / 73" },
  { name: "AmCham Norway", url: "amcham.no", scores: ["2", "2", "1", "2", "0", "2", "2", "1", "2", "1", "1", "2"], starC9: false, total: "18/24 (75%)", rank: 2, psiMobile: "57 / 96", psiDesktop: "90 / 93" },
  { name: "AmCham Poland", url: "amcham.pl", scores: ["2", "2", "1", "0", "0", "2", "2", "1", "0", "1", "2", "2"], starC9: false, total: "15/24 (63%)", rank: 22, psiMobile: "54 / 68", psiDesktop: "78 / 83" },
  { name: "AmCham Portugal", url: "amchamportugal.pt", scores: ["2", "1", "1", "1", "1", "2", "1", "2", "2", "2", "2", "0"], starC9: false, total: "17/24 (71%)", rank: 6, psiMobile: "80 / 92", psiDesktop: "99 / 92" },
  { name: "AmCham Romania", url: "amcham.ro", scores: ["2", "1", "0", "0", "0", "2", "1", "2", "1", "1", "1", "U"], starC9: false, total: "11/22 (50%)", rank: 39, psiMobile: "48 / 71", psiDesktop: "71 / 78" },
  { name: "AmCham Slovakia", url: "amcham.sk", scores: ["2", "1", "0", "0", "0", "2", "0", "2", "2", "2", "2", "2"], starC9: true, total: "15/24 (63%)", rank: 22, psiMobile: "46 / 72", psiDesktop: "91 / 69" },
  { name: "AmCham Slovenia", url: "amcham.si", scores: ["1", "2", "1", "1", "2", "2", "1", "2", "2", "1", "1", "U"], starC9: true, total: "16/22 (73%)", rank: 4, psiMobile: "65 / 87", psiDesktop: "92 / 87" },
  { name: "AmChamSpain", url: "amchamspain.com", scores: ["2", "2", "2", "1", "2", "0", "1", "2", "1", "2", "2", "0"], starC9: false, total: "17/24 (71%)", rank: 6, psiMobile: "98 / 87", psiDesktop: "99 / 91" },
  { name: "AmCham Sweden", url: "amcham.se", scores: ["2", "2", "1", "1", "0", "1", "2", "1", "1", "2", "2", "U"], starC9: false, total: "15/22 (68%)", rank: 13, psiMobile: "60 / 96", psiDesktop: "54 / 96" },
  { name: "Swiss AmCham (Switzerland)", url: "amcham.ch", scores: ["1", "1", "0", "1", "0", "2", "1", "1", "2", "1", "2", "0"], starC9: false, total: "12/24 (50%)", rank: 39, psiMobile: "49 / 86", psiDesktop: "96 / 86" },
  { name: "AmCham Türkiye (ABFT)", url: "amchamturkey.com", scores: ["2", "2", "1", "1", "1", "1", "1", "1", "0", "1", "1", "1"], starC9: false, total: "13/24 (54%)", rank: 35, psiMobile: "53 / 88", psiDesktop: "55 / 88" },
  { name: "TABA-AmCham (Türkiye)", url: "amcham.org", scores: ["U", "1", "0", "0", "U", "U", "U", "U", "1", "2", "U", "U"], starC9: false, total: "4/10 (40%)", rank: null, psiMobile: "29 / 75", psiDesktop: "45 / 79" },
  { name: "AmCham Ukraine", url: "chamber.ua", scores: ["2", "1", "1", "0", "2", "2", "1", "1", "1", "1", "2", "2"], starC9: false, total: "16/24 (67%)", rank: 16, psiMobile: "60 / 75", psiDesktop: "56 / 80" },
  { name: "BritishAmerican Business (United Kingdom)", url: "babinc.org", scores: ["1", "1", "1", "1", "2", "2", "1", "0", "2", "2", "1", "1"], starC9: false, total: "15/24 (63%)", rank: 22, psiMobile: "55 / 86", psiDesktop: "76 / 80" },
];
