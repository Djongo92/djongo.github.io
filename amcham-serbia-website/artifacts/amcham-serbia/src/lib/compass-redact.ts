import { platformData } from '@/data/platform';

// Pseudonymisation for the cloud tier: company names, staff and contact names
// and euro amounts become placeholders before a request leaves the browser,
// and are put back into the answer when it returns. The cloud model never
// sees who or how much a question is about.

interface Term { text: string; kind: 'COMPANY' | 'PERSON' }

function knownTerms(): Term[] {
  const terms: Term[] = [];
  const add = (text: string | undefined, kind: Term['kind']) => { if (text && text.length > 2) terms.push({ text, kind }); };
  const c = platformData.console as any;
  for (const m of platformData.allMembers) add(m.name, 'COMPANY');
  for (const d of c.departedMembers ?? []) add(d.name, 'COMPANY');
  // A distinctive first word ("Adriatica") is how people actually type a name.
  const firstWords = platformData.allMembers.map((m) => m.name.split(' ')[0]);
  for (const m of platformData.allMembers) {
    const first = m.name.split(' ')[0];
    if (first !== m.name && first.length >= 6 && firstWords.filter((w) => w === first).length === 1) add(first, 'COMPANY');
  }
  const people = new Set<string>();
  for (const m of platformData.allMembers) people.add(m.manager);
  for (const s of c.team ?? []) people.add(s.name);
  for (const r of c.ritual?.items ?? []) people.add(r.owner);
  for (const r of c.retention ?? []) people.add(r.owner);
  for (const p of people) add(p, 'PERSON');
  // Longest first, so "Adriatica Grupa" wins over "Adriatica".
  return terms.sort((a, b) => b.text.length - a.text.length);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface Redactor {
  redact: (s: string) => string;
  restore: (s: string) => string;
  count: () => number;
}

export function createRedactor(): Redactor {
  const terms = knownTerms();
  const toToken = new Map<string, string>();
  const fromToken = new Map<string, string>();
  const counters = { COMPANY: 0, PERSON: 0, AMOUNT: 0 };
  const tokenFor = (text: string, kind: keyof typeof counters) => {
    let tok = toToken.get(text);
    if (!tok) {
      tok = `[${kind}_${++counters[kind]}]`;
      toToken.set(text, tok);
      fromToken.set(tok, text);
    }
    return tok;
  };
  const pattern = new RegExp(terms.map((t) => escape(t.text)).join('|'), 'g');
  const kindOf = new Map(terms.map((t) => [t.text, t.kind]));

  return {
    redact: (s) =>
      s
        .replace(pattern, (m) => tokenFor(m, kindOf.get(m) ?? 'COMPANY'))
        // Contacts addressed by first name in drafts ("Dear Marko,").
        .replace(/\b(Dear|Hi|Hello) (\p{Lu}\p{Ll}+)/gu, (_m, greet, name) => `${greet} ${tokenFor(name, 'PERSON')}`)
        .replace(/€\s?\d[\d.,]*\s?k?/g, (m) => tokenFor(m.trim(), 'AMOUNT')),
    restore: (s) => s.replace(/\[(COMPANY|PERSON|AMOUNT)_\d+\]/g, (tok) => fromToken.get(tok) ?? tok),
    count: () => toToken.size,
  };
}
