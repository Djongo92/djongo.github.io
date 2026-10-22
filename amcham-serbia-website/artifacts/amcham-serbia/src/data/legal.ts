// Privacy and cookie policies for the redesign. Placeholder wording: the
// structure and plain-language tone are final, the legal text is for
// AmCham Serbia's own advisers to confirm. Kept here rather than in i18n.tsx
// because each policy is long-form copy in two languages.

import type { Language } from '@/lib/i18n';

export interface LegalSection {
  id: string;
  title: string;
  body?: string[];
  list?: string[];
  table?: { head: string[]; rows: string[][] };
}

export interface LegalDoc {
  title: string;
  intro: string;
  updated: string;
  placeholder: string;
  sections: LegalSection[];
}

const privacyEn: LegalDoc = {
  title: 'Privacy policy',
  intro: 'This page explains what personal data AmCham Serbia collects through this website and the member platform, why, and the choices you have. We have tried to write it so it can be read in a few minutes.',
  updated: 'Last updated: [date to be confirmed]',
  placeholder: 'Placeholder wording for the redesign. The final text will be confirmed by AmCham Serbia before launch.',
  sections: [
    {
      id: 'who',
      title: 'Who we are',
      body: [
        'The American Chamber of Commerce in Serbia ("AmCham Serbia", "we") is responsible for the personal data described here. You can reach us at Smiljanićeva 24/I, 11000 Belgrade, Serbia, or by email at info@amcham.rs.',
        'This policy is written in line with Serbia’s Law on Personal Data Protection and, where it applies, the EU General Data Protection Regulation.',
      ],
    },
    {
      id: 'what',
      title: 'What we collect',
      list: [
        'Membership enquiries and applications: your name, job title, company, email address, phone number and anything you choose to tell us in the form.',
        'Event registrations: who is attending, dietary or access needs you share with us, and whether you attended.',
        'Newsletter and updates: your email address and the topics you choose.',
        'The member platform: your company’s membership details and how your company uses AmCham (events, committees, introductions, portal and email activity). Members can see all of this on the “What AmCham sees about you” page.',
        'Website use: only if you agree to analytics cookies, which pages are visited and how the site is reached. See the cookie policy.',
      ],
    },
    {
      id: 'why',
      title: 'Why we use it',
      list: [
        'To handle your membership enquiry and run your membership (needed to provide the membership you asked for).',
        'To organise events and send you the practical details (needed to provide the service).',
        'To send newsletters and invitations (only with your consent, which you can withdraw at any time).',
        'To understand how members use AmCham, so we can be more useful to them (our legitimate interest in serving members well; never used to rank members against each other).',
        'To improve this website (only with your consent to analytics cookies).',
      ],
    },
    {
      id: 'ai',
      title: 'AI features',
      body: [
        'Some platform features use AI, for example drafting a translation for a person to check, or summarising a meeting that everyone agreed to record. Personal and member data is processed only on AmCham Serbia’s own private model. It is never sent to public AI services and never used to train them.',
        'A person reviews anything AI drafts before it is sent or published. The “How AI works here” page explains this in more detail.',
      ],
    },
    {
      id: 'share',
      title: 'Who we share it with',
      list: [
        'Service providers who run parts of our work for us, such as email delivery or event registration, under contracts that require them to protect your data and use it only on our instructions.',
        'Other members, only when you ask for or agree to an introduction, or choose to appear in the public member directory.',
        'Public authorities, only where the law requires it.',
      ],
      body: ['We never sell personal data.'],
    },
    {
      id: 'transfers',
      title: 'Data outside Serbia',
      body: [
        'Where a service provider stores data outside Serbia, we use only countries or arrangements that offer an adequate level of protection under Serbian law, such as standard contractual clauses.',
      ],
    },
    {
      id: 'keep',
      title: 'How long we keep it',
      list: [
        'Membership records: for the length of the membership, then for as long as accounting and legal rules require.',
        'Enquiries that do not lead to membership: up to [12] months.',
        'Event registrations: up to [24] months after the event.',
        'Newsletter subscriptions: until you unsubscribe.',
      ],
    },
    {
      id: 'rights',
      title: 'Your rights',
      list: [
        'See the personal data we hold about you and get a copy.',
        'Ask us to correct it, or to delete it where we no longer need it.',
        'Object to, or ask us to limit, how we use it.',
        'Take your data with you in a common format.',
        'Withdraw consent at any time, without affecting anything we did before.',
      ],
      body: [
        'To use any of these rights, email info@amcham.rs. We reply within 30 days.',
        'If you are unhappy with how we handled your data, you can also contact Serbia’s Commissioner for Information of Public Importance and Personal Data Protection (poverenik.rs).',
      ],
    },
    {
      id: 'cookies',
      title: 'Cookies',
      body: ['The cookie policy explains which cookies this site uses and how to change your choice.'],
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      body: ['If we change this policy, we will update the date at the top of this page. If a change matters for you, we will also tell you by email.'],
    },
  ],
};

const privacySr: LegalDoc = {
  title: 'Politika privatnosti',
  intro: 'Na ovoj stranici objašnjavamo koje lične podatke AmCham Srbija prikuplja putem ovog sajta i platforme za članove, zašto, i koje izbore imate. Trudili smo se da se može pročitati za nekoliko minuta.',
  updated: 'Poslednja izmena: [datum će biti potvrđen]',
  placeholder: 'Privremeni tekst za redizajn. Konačnu verziju će potvrditi AmCham Srbija pre objavljivanja.',
  sections: [
    {
      id: 'who',
      title: 'Ko smo mi',
      body: [
        'Američka privredna komora u Srbiji („AmCham Srbija”, „mi”) odgovorna je za lične podatke opisane ovde. Možete nas kontaktirati na adresi Smiljanićeva 24/I, 11000 Beograd, Srbija, ili putem emaila info@amcham.rs.',
        'Ova politika je napisana u skladu sa Zakonom o zaštiti podataka o ličnosti Republike Srbije i, gde se primenjuje, Opštom uredbom EU o zaštiti podataka (GDPR).',
      ],
    },
    {
      id: 'what',
      title: 'Šta prikupljamo',
      list: [
        'Upiti i prijave za članstvo: vaše ime, funkcija, kompanija, email adresa, broj telefona i sve što odlučite da nam napišete u formularu.',
        'Prijave za događaje: ko dolazi, posebne potrebe (ishrana, pristupačnost) koje nam saopštite i da li ste prisustvovali.',
        'Bilten i obaveštenja: vaša email adresa i teme koje izaberete.',
        'Platforma za članove: podaci o članstvu vaše kompanije i način na koji kompanija koristi AmCham (događaji, odbori, upoznavanja, portal i email). Članovi sve ovo mogu da vide na stranici „Šta AmCham vidi o vama”.',
        'Korišćenje sajta: samo ako pristanete na analitičke kolačiće, koje stranice se posećuju i kako se dolazi do sajta. Pogledajte politiku kolačića.',
      ],
    },
    {
      id: 'why',
      title: 'Zašto ih koristimo',
      list: [
        'Da obradimo vaš upit i vodimo vaše članstvo (neophodno za članstvo koje ste tražili).',
        'Da organizujemo događaje i pošaljemo vam praktične informacije (neophodno za uslugu).',
        'Da šaljemo bilten i pozivnice (samo uz vaš pristanak, koji možete povući u bilo kom trenutku).',
        'Da razumemo kako članovi koriste AmCham, kako bismo im bili korisniji (naš legitimni interes da dobro služimo članovima; nikada za rangiranje članova jednih u odnosu na druge).',
        'Da unapredimo ovaj sajt (samo uz vaš pristanak na analitičke kolačiće).',
      ],
    },
    {
      id: 'ai',
      title: 'AI funkcije',
      body: [
        'Neke funkcije platforme koriste AI, na primer nacrt prevoda koji proverava čovek, ili sažetak sastanka koji su svi učesnici pristali da se snima. Lični podaci i podaci o članovima obrađuju se isključivo na privatnom modelu AmCham Srbije. Nikada se ne šalju javnim AI servisima i nikada se ne koriste za njihovo treniranje.',
        'Čovek pregleda sve što AI pripremi pre slanja ili objavljivanja. Stranica „Kako ovde radi AI” to objašnjava detaljnije.',
      ],
    },
    {
      id: 'share',
      title: 'S kim ih delimo',
      list: [
        'Pružaoci usluga koji za nas obavljaju deo posla, kao što su slanje emailova ili prijave za događaje, po ugovorima koji ih obavezuju da štite vaše podatke i koriste ih samo po našim uputstvima.',
        'Drugi članovi, samo kada tražite ili prihvatite upoznavanje, ili kada izaberete da budete u javnom imeniku članova.',
        'Državni organi, samo kada to zakon zahteva.',
      ],
      body: ['Nikada ne prodajemo lične podatke.'],
    },
    {
      id: 'transfers',
      title: 'Podaci van Srbije',
      body: [
        'Kada pružalac usluga čuva podatke van Srbije, koristimo samo zemlje ili mehanizme koji obezbeđuju odgovarajući nivo zaštite prema srpskom zakonu, kao što su standardne ugovorne klauzule.',
      ],
    },
    {
      id: 'keep',
      title: 'Koliko dugo ih čuvamo',
      list: [
        'Podaci o članstvu: dok traje članstvo, a zatim onoliko koliko zahtevaju računovodstveni i pravni propisi.',
        'Upiti koji ne dovedu do članstva: do [12] meseci.',
        'Prijave za događaje: do [24] meseca nakon događaja.',
        'Pretplata na bilten: dok se ne odjavite.',
      ],
    },
    {
      id: 'rights',
      title: 'Vaša prava',
      list: [
        'Da vidite lične podatke koje čuvamo o vama i dobijete kopiju.',
        'Da tražite ispravku, ili brisanje kada nam više nisu potrebni.',
        'Da uložite prigovor ili tražite ograničenje obrade.',
        'Da preuzmete svoje podatke u uobičajenom formatu.',
        'Da povučete pristanak u bilo kom trenutku, bez uticaja na ono što je urađeno ranije.',
      ],
      body: [
        'Za ostvarivanje bilo kog od ovih prava pišite na info@amcham.rs. Odgovaramo u roku od 30 dana.',
        'Ako niste zadovoljni načinom na koji smo postupili sa vašim podacima, možete se obratiti i Povereniku za informacije od javnog značaja i zaštitu podataka o ličnosti (poverenik.rs).',
      ],
    },
    {
      id: 'cookies',
      title: 'Kolačići',
      body: ['Politika kolačića objašnjava koje kolačiće ovaj sajt koristi i kako da promenite svoj izbor.'],
    },
    {
      id: 'changes',
      title: 'Izmene ove politike',
      body: ['Ako izmenimo ovu politiku, ažuriraćemo datum na vrhu stranice. Ako je izmena važna za vas, obavestićemo vas i emailom.'],
    },
  ],
};

const cookiesEn: LegalDoc = {
  title: 'Cookie policy',
  intro: 'Cookies are small files a website saves in your browser. This site uses as few as it can. The ones it needs to work are always on; everything else is off until you say yes.',
  updated: 'Last updated: [date to be confirmed]',
  placeholder: 'Placeholder wording for the redesign. The final list of cookies will be confirmed once the live analytics setup is chosen.',
  sections: [
    {
      id: 'choices',
      title: 'Your choice',
      body: [
        'When you first visit, we ask whether you accept optional cookies. “Reject all” is as easy as “Accept all”, and the site works the same either way. You can change your mind at any time with “Cookie settings” at the bottom of every page.',
      ],
    },
    {
      id: 'necessary',
      title: 'Needed for the site to work (always on)',
      body: ['These remember the choices you make on the site. They contain nothing that identifies you.'],
      table: {
        head: ['Name', 'What it does', 'How long'],
        rows: [
          ['amcham_lang', 'Remembers English or Serbian during your visit', 'Until you close the tab'],
          ['theme', 'Remembers light or dark mode', 'Until you clear it'],
          ['amcham_cookie_choice', 'Remembers your cookie choice', '12 months'],
        ],
      },
    },
    {
      id: 'analytics',
      title: 'Analytics (only if you agree)',
      body: ['These count visits and show which pages are useful, so we can improve the site. The data is combined and never used to identify you.'],
      table: {
        head: ['Name', 'What it does', 'How long'],
        rows: [
          ['[analytics tool, e.g. _ga]', 'Counts visits and pages viewed', '[up to 13 months]'],
        ],
      },
    },
    {
      id: 'marketing',
      title: 'Marketing (only if you agree)',
      body: ['These would let us measure our posts and adverts on social networks. None are set unless you switch this on.'],
      table: {
        head: ['Name', 'What it does', 'How long'],
        rows: [
          ['[social network pixel]', 'Measures visits that come from our social posts', '[up to 3 months]'],
        ],
      },
    },
    {
      id: 'browser',
      title: 'Cookies and your browser',
      body: ['You can also block or delete cookies in your browser settings. If you block the ones the site needs, it will simply forget your language and theme each time.'],
    },
    {
      id: 'more',
      title: 'More about your data',
      body: ['The privacy policy explains what personal data we hold, why, and your rights.'],
    },
  ],
};

const cookiesSr: LegalDoc = {
  title: 'Politika kolačića',
  intro: 'Kolačići su male datoteke koje sajt čuva u vašem pretraživaču. Ovaj sajt koristi što manje kolačića. Oni koji su potrebni za rad sajta uvek su uključeni; sve ostalo je isključeno dok ne pristanete.',
  updated: 'Poslednja izmena: [datum će biti potvrđen]',
  placeholder: 'Privremeni tekst za redizajn. Konačna lista kolačića biće potvrđena kada se izabere alat za analitiku.',
  sections: [
    {
      id: 'choices',
      title: 'Vaš izbor',
      body: [
        'Pri prvoj poseti pitamo vas da li prihvatate opcione kolačiće. „Odbij sve” je jednako lako kao „Prihvati sve”, a sajt radi isto u oba slučaja. Izbor možete promeniti u bilo kom trenutku preko „Podešavanja kolačića” na dnu svake stranice.',
      ],
    },
    {
      id: 'necessary',
      title: 'Potrebni za rad sajta (uvek uključeni)',
      body: ['Pamte izbore koje napravite na sajtu. Ne sadrže ništa po čemu se možete identifikovati.'],
      table: {
        head: ['Naziv', 'Čemu služi', 'Trajanje'],
        rows: [
          ['amcham_lang', 'Pamti srpski ili engleski tokom posete', 'Dok ne zatvorite karticu'],
          ['theme', 'Pamti svetli ili tamni režim', 'Dok ga ne obrišete'],
          ['amcham_cookie_choice', 'Pamti vaš izbor kolačića', '12 meseci'],
        ],
      },
    },
    {
      id: 'analytics',
      title: 'Analitika (samo uz vaš pristanak)',
      body: ['Broje posete i pokazuju koje stranice su korisne, kako bismo unapredili sajt. Podaci su zbirni i nikada se ne koriste za vašu identifikaciju.'],
      table: {
        head: ['Naziv', 'Čemu služi', 'Trajanje'],
        rows: [
          ['[alat za analitiku, npr. _ga]', 'Broji posete i pregledane stranice', '[do 13 meseci]'],
        ],
      },
    },
    {
      id: 'marketing',
      title: 'Marketing (samo uz vaš pristanak)',
      body: ['Omogućili bi nam da merimo objave i oglase na društvenim mrežama. Ništa se ne postavlja dok ovo ne uključite.'],
      table: {
        head: ['Naziv', 'Čemu služi', 'Trajanje'],
        rows: [
          ['[piksel društvene mreže]', 'Meri posete koje dolaze sa naših objava', '[do 3 meseca]'],
        ],
      },
    },
    {
      id: 'browser',
      title: 'Kolačići i vaš pretraživač',
      body: ['Kolačiće možete blokirati ili obrisati i u podešavanjima pretraživača. Ako blokirate one koji su potrebni sajtu, on će jednostavno svaki put zaboraviti vaš jezik i režim prikaza.'],
    },
    {
      id: 'more',
      title: 'Više o vašim podacima',
      body: ['Politika privatnosti objašnjava koje lične podatke čuvamo, zašto, i koja su vaša prava.'],
    },
  ],
};

export const LEGAL: Record<'privacy' | 'cookies', Record<Language, LegalDoc>> = {
  privacy: { en: privacyEn, sr: privacySr },
  cookies: { en: cookiesEn, sr: cookiesSr },
};
