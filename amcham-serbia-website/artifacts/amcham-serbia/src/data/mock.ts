import { companies as platformCompanies } from './platform';

export interface Event {
  id: string;
  title: string;
  titleSr: string;
  date: string;
  timezone: string;
  venue: string;
  audience: string;
  priceRule: string;
  status: 'open' | 'request_pending' | 'full' | 'past';
  topic: string;
  topicSr: string;
  agenda: { time: string; description: string; descriptionSr: string }[];
  speakers: { name: string; title: string; titleSr: string; company: string }[];
}

export interface Member {
  id: string;
  name: string;
  sector: string;
  sectorSr: string;
  summary: string;
  summarySr: string;
  website: string;
  category: 'Patron' | 'Corporate' | 'Business' | 'Non-Profit';
  reviewDate: string;
}

export interface Insight {
  id: string;
  title: string;
  titleSr: string;
  type: 'Survey' | 'Report' | 'Policy Brief' | 'Explainer';
  typeSr: string;
  year: number;
  date: string;
  summary: string;
  summarySr: string;
  keyFindings: { metric: string; description: string; descriptionSr: string }[];
  methodology: string;
  methodologySr: string;
  fileSize?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  titleSr: string;
  date: string;
  topic: string;
  topicSr: string;
  summary: string;
  summarySr: string;
  content: string;
  contentSr: string;
}

export interface PolicyWin {
  id: string;
  date: string;
  committee: string;
  committeeSr: string;
  title: string;
  titleSr: string;
  outcome: string;
  outcomeSr: string;
}

export const mockEvents: Event[] = [
  {
    id: "evt-01",
    title: "Annual General Meeting 2026",
    titleSr: "Godišnja Skupština 2026",
    date: "2026-11-15T18:00:00Z",
    timezone: "CET (Belgrade)",
    venue: "Hotel Metropol Palace",
    audience: "Members Only (C-Level)",
    priceRule: "Free for members",
    status: "open",
    topic: "Networking",
    topicSr: "Umrežavanje",
    agenda: [
      { time: "18:00 - 18:30", description: "Registration & Welcome Drink", descriptionSr: "Registracija i piće dobrodošlice" },
      { time: "18:30 - 19:30", description: "Official Proceedings & Voting", descriptionSr: "Zvanični deo i glasanje" },
      { time: "19:30 - 22:00", description: "Gala Dinner & Networking", descriptionSr: "Gala večera i umrežavanje" }
    ],
    speakers: [
      { name: "Stefan Lazarević", title: "President", titleSr: "Predsednik", company: "AmCham Serbia" }
    ]
  },
  {
    id: "evt-02",
    title: "Digital Economy Committee Session",
    titleSr: "Sednica Odbora za digitalnu ekonomiju",
    date: "2026-10-22T10:00:00Z",
    timezone: "CET (Belgrade)",
    venue: "AmCham Office, Smiljanićeva 24",
    audience: "Committee Members",
    priceRule: "Included in membership",
    status: "full",
    topic: "Digital Economy",
    topicSr: "Digitalna ekonomija",
    agenda: [
      { time: "10:00 - 11:30", description: "Discussion on AI regulations", descriptionSr: "Diskusija o regulaciji veštačke inteligencije" }
    ],
    speakers: []
  },
  {
    id: "evt-03",
    title: "Lap Time 2026 Presentation",
    titleSr: "Prezentacija Prolaznog vremena 2026",
    date: "2026-09-10T11:00:00Z",
    timezone: "CET (Belgrade)",
    venue: "Hyatt Regency Belgrade",
    audience: "Open to Public",
    priceRule: "Free Registration",
    status: "past",
    topic: "Economy",
    topicSr: "Ekonomija",
    agenda: [
      { time: "11:00 - 12:00", description: "Presentation of survey results", descriptionSr: "Prezentacija rezultata istraživanja" },
      { time: "12:00 - 13:00", description: "Panel Discussion", descriptionSr: "Panel diskusija" }
    ],
    speakers: [
      { name: "Vera Nikolić Dimić", title: "Executive Director", titleSr: "Izvršni direktor", company: "AmCham Serbia" }
    ]
  },
  {
    id: "evt-04",
    title: "ESG Integration in Supply Chains",
    titleSr: "ESG integracija u lancima snabdevanja",
    date: "2026-12-05T09:00:00Z",
    timezone: "CET (Belgrade)",
    venue: "Crown Plaza Belgrade",
    audience: "Corporate Members",
    priceRule: "150 EUR for non-members",
    status: "request_pending",
    topic: "Sustainability",
    topicSr: "Održivost",
    agenda: [
      { time: "09:00 - 10:00", description: "Keynote on EU CBAM", descriptionSr: "Uvodno izlaganje o EU CBAM" },
      { time: "10:00 - 12:00", description: "Workshops", descriptionSr: "Radionice" }
    ],
    speakers: []
  },
  {
    id: "evt-05",
    title: "Healthcare Policy Briefing",
    titleSr: "Sastanak o zdravstvenoj politici",
    date: "2026-08-15T10:00:00Z",
    timezone: "CET (Belgrade)",
    venue: "AmCham Office",
    audience: "Healthcare Committee",
    priceRule: "Members Only",
    status: "past",
    topic: "Healthcare",
    topicSr: "Zdravstvo",
    agenda: [
      { time: "10:00 - 11:30", description: "Briefing on new pharma laws", descriptionSr: "Izveštaj o novim farmaceutskim zakonima" }
    ],
    speakers: []
  },
  {
    id: "evt-06",
    title: "Tax & Finance Focus Group",
    titleSr: "Fokus grupa za poreze i finansije",
    date: "2026-11-01T14:00:00Z",
    timezone: "CET (Belgrade)",
    venue: "Online / Zoom",
    audience: "All Members",
    priceRule: "Free",
    status: "open",
    topic: "Finance",
    topicSr: "Finansije",
    agenda: [
      { time: "14:00 - 15:00", description: "Changes to Corporate Income Tax", descriptionSr: "Izmene zakona o porezu na dobit pravnih lica" }
    ],
    speakers: []
  },
  {
    id: "evt-07",
    title: "AmChamps Mentoring Kick-off",
    titleSr: "Početak AmChamps mentorskog programa",
    date: "2026-12-12T17:00:00Z",
    timezone: "CET (Belgrade)",
    venue: "Belgrade Youth Center",
    audience: "AmChamps Participants",
    priceRule: "Program fee applies",
    status: "full",
    topic: "Education",
    topicSr: "Edukacija",
    agenda: [
      { time: "17:00 - 18:00", description: "Introduction of Mentors", descriptionSr: "Predstavljanje mentora" },
      { time: "18:00 - 20:00", description: "Speed Networking", descriptionSr: "Brzo umrežavanje" }
    ],
    speakers: []
  },
  {
    id: "evt-08",
    title: "Labor Law Roundtable",
    titleSr: "Okrugli sto o zakonu o radu",
    date: "2026-11-20T10:00:00Z",
    timezone: "CET (Belgrade)",
    venue: "Hilton Belgrade",
    audience: "HR Professionals",
    priceRule: "Free for members",
    status: "open",
    topic: "Human Resources",
    topicSr: "Ljudski resursi",
    agenda: [
      { time: "10:00 - 13:00", description: "Roundtable discussions", descriptionSr: "Diskusije za okruglim stolom" }
    ],
    speakers: []
  }
];

// Derived from platform.ts's companies so the public directory and the staff
// console/portal always agree on who a member is — same id, same name, same
// sector, same description, just projected into the public-facing shape.
export const mockMembers: Member[] = platformCompanies.map((c): Member => ({
  id: c.id,
  name: c.name,
  sector: c.sector,
  sectorSr: c.sectorSr,
  summary: c.description,
  summarySr: c.descriptionSr,
  website: c.website,
  category: c.tier as Member['category'],
  reviewDate: c.reviewDate
}));

export const mockInsights: Insight[] = [
  {
    id: "ins-01",
    title: "15th Lap Time Survey: Caution Today, Growth Tomorrow",
    titleSr: "15. Prolazno vreme: Oprez danas, rast sutra",
    type: "Survey",
    typeSr: "Istraživanje",
    year: 2026,
    date: "2026-09-10",
    summary: "The annual business climate survey reveals member perspectives on macroeconomic stability, labor availability, and regulatory frameworks.",
    summarySr: "Godišnje istraživanje poslovne klime otkriva perspektive članica o makroekonomskoj stabilnosti, dostupnosti radne snage i regulatornim okvirima.",
    keyFindings: [
      { metric: "68%", description: "Expect business growth in 2027", descriptionSr: "Očekuju poslovni rast u 2027." },
      { metric: "Top 3", description: "Challenges: Labor shortage, inflation, rule of law", descriptionSr: "Izazovi: Nedostatak radne snage, inflacija, vladavina prava" }
    ],
    methodology: "Fieldwork conducted June-August 2026. Sample size: 142 member companies, representing a mix of SMEs and large corporations.",
    methodologySr: "Terenski rad sproveden jun-avgust 2026. Veličina uzorka: 142 kompanije članice, koje predstavljaju miks MSP i velikih korporacija.",
    fileSize: "4.2 MB"
  },
  {
    id: "ins-02",
    title: "Digital Economy Policy Brief",
    titleSr: "Predlog praktične politike u digitalnoj ekonomiji",
    type: "Policy Brief",
    typeSr: "Predlog politike",
    year: 2026,
    date: "2026-05-15",
    summary: "Recommendations for accelerating e-government services and modernizing data protection regulations.",
    summarySr: "Preporuke za ubrzanje usluga e-uprave i modernizaciju propisa o zaštiti podataka.",
    keyFindings: [
      { metric: "5", description: "Key legislative acts requiring updates", descriptionSr: "Ključnih zakonodavnih akata koji zahtevaju ažuriranje" }
    ],
    methodology: "Developed by the AmCham Digital Economy Committee through stakeholder consultations over a 6-month period.",
    methodologySr: "Razvijeno od strane AmCham Odbora za digitalnu ekonomiju kroz konsultacije sa zainteresovanim stranama tokom 6 meseci.",
    fileSize: "1.1 MB"
  },
  {
    id: "ins-03",
    title: "Labor Market Analysis 2026",
    titleSr: "Analiza tržišta rada 2026",
    type: "Report",
    typeSr: "Izveštaj",
    year: 2026,
    date: "2026-03-20",
    summary: "A deep dive into the evolving labor market, focusing on remote work policies, retention strategies, and skill gaps in the tech sector.",
    summarySr: "Dubinska analiza tržišta rada u razvoju, sa fokusom na politike rada na daljinu, strategije zadržavanja radnika i nedostatak veština u tehnološkom sektoru.",
    keyFindings: [
      { metric: "45%", description: "Report severe IT skill shortages", descriptionSr: "Prijavljuju ozbiljan nedostatak IT veština" },
      { metric: "2.5x", description: "Increase in remote work adoption since 2022", descriptionSr: "Povećanje usvajanja rada na daljinu od 2022." }
    ],
    methodology: "Quantitative survey of 85 HR directors from member companies, plus 12 qualitative interviews.",
    methodologySr: "Kvantitativna anketa 85 HR direktora iz kompanija članica, plus 12 kvalitativnih intervjua.",
    fileSize: "3.5 MB"
  },
  {
    id: "ins-04",
    title: "ESG Compliance Readiness Explainer",
    titleSr: "Vodič za spremnost na ESG usklađenost",
    type: "Explainer",
    typeSr: "Vodič",
    year: 2025,
    date: "2025-11-10",
    summary: "A practical guide for Serbian businesses adapting to European Union supply chain sustainability requirements.",
    summarySr: "Praktični vodič za srpska preduzeća koja se prilagođavaju zahtevima Evropske unije za održivost lanca snabdevanja.",
    keyFindings: [
      { metric: "1 Jan", description: "Upcoming deadline for CBAM reporting", descriptionSr: "Predstojeći rok za CBAM izveštavanje" }
    ],
    methodology: "Legal analysis by the AmCham ESG & Environment Committee based on EU directives.",
    methodologySr: "Pravna analiza od strane AmCham Odbora za ESG i životnu sredinu na osnovu EU direktiva.",
    fileSize: "2.0 MB"
  },
  {
    id: "ins-05",
    title: "Healthcare System Efficiency Report",
    titleSr: "Izveštaj o efikasnosti zdravstvenog sistema",
    type: "Report",
    typeSr: "Izveštaj",
    year: 2025,
    date: "2025-08-05",
    summary: "Analyzing the speed of innovative drug approvals and proposing models for value-based healthcare financing.",
    summarySr: "Analiza brzine odobravanja inovativnih lekova i predlaganje modela za finansiranje zdravstvene zaštite zasnovane na vrednosti.",
    keyFindings: [
      { metric: "400+", description: "Days average wait time for new drug listing", descriptionSr: "Dana prosečno vreme čekanja za listiranje novog leka" }
    ],
    methodology: "Comparative study benchmarking Serbia against 5 regional peers using publicly available health data.",
    methodologySr: "Komparativna studija koja upoređuje Srbiju sa 5 regionalnih zemalja koristeći javno dostupne zdravstvene podatke.",
    fileSize: "5.8 MB"
  },
  {
    id: "ins-06",
    title: "Foreign Direct Investment Impact 2020-2025",
    titleSr: "Uticaj stranih direktnih investicija 2020-2025",
    type: "Survey",
    typeSr: "Istraživanje",
    year: 2025,
    date: "2025-02-12",
    summary: "Assessing the multiplier effect of FDI on local SME development and regional infrastructure.",
    summarySr: "Procena multiplikativnog efekta SDI na lokalni razvoj MSP i regionalnu infrastrukturu.",
    keyFindings: [
      { metric: "3.2", description: "Local jobs created for every direct FDI role", descriptionSr: "Lokalnih poslova stvoreno za svaku direktnu SDI ulogu" }
    ],
    methodology: "Econometric modeling performed in partnership with the Institute for Economic Studies. Data from 50 major investors.",
    methodologySr: "Ekonometrijsko modeliranje sprovedeno u partnerstvu sa Institutom za ekonomske studije. Podaci od 50 velikih investitora.",
    fileSize: "6.1 MB"
  }
];

export const mockNews: NewsItem[] = [
  {
    id: "news-01",
    title: "AmCham Serbia Celebrates 25 Years of Impact",
    titleSr: "AmCham Srbija slavi 25 godina uticaja",
    date: "2026-09-05",
    topic: "Association News",
    topicSr: "Vesti udruženja",
    summary: "Marking a quarter-century of fostering transatlantic economic ties and driving reforms in the Serbian business ecosystem.",
    summarySr: "Obeležavanje četvrt veka negovanja transatlantskih ekonomskih veza i podsticanja reformi u srpskom poslovnom ekosistemu.",
    content: "AmCham Serbia proudly celebrated its 25th anniversary with a gala event attended by over 400 distinguished guests, including government officials, international diplomats, and business leaders. The milestone reflects decades of commitment to improving the business climate...",
    contentSr: "AmCham Srbija je sa ponosom proslavio svoju 25. godišnjicu gala događajem kome je prisustvovalo preko 400 uglednih gostiju, uključujući državne zvaničnike, međunarodne diplomate i poslovne lidere. Ova prekretnica odražava decenije posvećenosti poboljšanju poslovne klime..."
  },
  {
    id: "news-02",
    title: "New Policy Recommendations on AI Regulation Handed to the Ministry",
    titleSr: "Nove preporuke za regulaciju AI predate Ministarstvu",
    date: "2026-08-22",
    topic: "Advocacy",
    topicSr: "Zastupanje",
    summary: "The Digital Economy Committee has finalized and delivered a comprehensive set of proposals ensuring innovation-friendly AI governance.",
    summarySr: "Odbor za digitalnu ekonomiju je završio i predao sveobuhvatan set predloga koji osiguravaju upravljanje veštačkom inteligencijom na način koji podstiče inovacije.",
    content: "In a meeting with the Ministry of Information and Telecommunications, AmCham representatives presented the new AI Policy Brief. The document outlines a risk-based approach to regulating artificial intelligence, heavily inspired by the EU AI Act but tailored to accommodate the fast-growing Serbian tech sector...",
    contentSr: "Na sastanku sa Ministarstvom informisanja i telekomunikacija, predstavnici AmCham-a su predstavili novi Predlog politike za AI. Dokument naglašava pristup zasnovan na riziku za regulisanje veštačke inteligencije, inspirisan EU Zakonom o AI, ali prilagođen brzorastućem srpskom tehnološkom sektoru..."
  },
  {
    id: "news-03",
    title: "AmChamps Mentoring Program Opens Applications for 13th Generation",
    titleSr: "AmChamps mentorski program otvara prijave za 13. generaciju",
    date: "2026-08-10",
    topic: "Programs",
    topicSr: "Programi",
    summary: "Young professionals and students are invited to apply for the premier leadership development program in Serbia.",
    summarySr: "Mladi profesionalci i studenti pozvani su da se prijave za vodeći program razvoja liderstva u Srbiji.",
    content: "The AmChamps program, our flagship educational initiative, is officially accepting applications for its 13th cohort. Designed to bridge the gap between academic knowledge and practical corporate leadership, the program pairs promising university students with successful young managers from member companies...",
    contentSr: "Program AmChamps, naša vodeća obrazovna inicijativa, zvanično prima prijave za svoju 13. generaciju. Dizajniran da premosti jaz između akademskog znanja i praktičnog korporativnog liderstva, program spaja perspektivne studente sa uspešnim mladim menadžerima iz kompanija članica..."
  },
  {
    id: "news-04",
    title: "Joint Statement: Urgent Action Needed on Cross-Border Trade Delays",
    titleSr: "Zajedničko saopštenje: Hitno potrebna akcija povodom zastoja u prekograničnoj trgovini",
    date: "2026-07-28",
    topic: "Trade",
    topicSr: "Trgovina",
    summary: "AmCham alongside three other bilateral chambers calls for immediate digitalization of customs procedures.",
    summarySr: "AmCham zajedno sa još tri bilateralne komore poziva na hitnu digitalizaciju carinskih procedura.",
    content: "Citing increased waiting times at key border crossings, AmCham Serbia has issued a joint statement urging the Customs Administration to accelerate the implementation of paperless clearance systems. The delays are currently costing the transport sector millions in lost productivity...",
    contentSr: "Pozivajući se na produženo vreme čekanja na ključnim graničnim prelazima, AmCham Srbija je izdao zajedničko saopštenje u kojem poziva Upravu carina da ubrza primenu sistema bezpapirnog carinjenja. Zastoji trenutno koštaju transportni sektor milione zbog izgubljene produktivnosti..."
  },
  {
    id: "news-05",
    title: "Welcome to Our Newest Members",
    titleSr: "Dobrodošlica našim najnovijim članovima",
    date: "2026-07-15",
    topic: "Community",
    topicSr: "Zajednica",
    summary: "We are thrilled to welcome five new member companies to the AmCham network this quarter.",
    summarySr: "Sa oduševljenjem želimo dobrodošlicu za pet novih kompanija članica u AmCham mrežu ovog kvartala.",
    content: "The AmCham community continues to grow. This quarter, we welcome Danubius Health, Vanguard Media Group, EkoBuild Construction, and two others to our robust network. Their expertise across healthcare, media, and green building will further enrich our committee work...",
    contentSr: "AmCham zajednica nastavlja da raste. Ovog kvartala, želimo dobrodošlicu kompanijama Danubius Health, Vanguard Media Group, EkoBuild Construction, i još dve u našu snažnu mrežu. Njihova stručnost u zdravstvu, medijima i zelenoj gradnji dodatno će obogatiti rad naših odbora..."
  },
  {
    id: "news-06",
    title: "Macroeconomic Briefing with the National Bank Governor",
    titleSr: "Makroekonomski brifing sa Guvernerom Narodne banke",
    date: "2026-06-30",
    topic: "Events",
    topicSr: "Događaji",
    summary: "Members gathered to hear the latest projections on inflation, interest rates, and currency stability.",
    summarySr: "Članovi su se okupili kako bi čuli najnovije projekcije o inflaciji, kamatnim stopama i stabilnosti valute.",
    content: "At our latest high-level briefing, the Governor of the National Bank of Serbia addressed AmCham members, outlining the central bank's strategy to maintain stability amid global financial turbulence. The Q&A session focused heavily on the cost of borrowing for future investments...",
    contentSr: "Na našem poslednjem brifingu na visokom nivou, Guverner Narodne banke Srbije obratio se članovima AmCham-a, izlažući strategiju centralne banke za održavanje stabilnosti usred globalnih finansijskih turbulencija. Sesija pitanja i odgovora bila je snažno fokusirana na troškove zaduživanja za buduće investicije..."
  }
];

export const policyWins: PolicyWin[] = [
  {
    id: "pw-2026-ai",
    date: "2026-08-22",
    committee: "Digital Economy",
    committeeSr: "Digitalna ekonomija",
    title: "AI regulation recommendations adopted into the draft law",
    titleSr: "Preporuke o regulisanju AI usvojene u nacrt zakona",
    outcome: "Three of five committee recommendations on data governance and model transparency were incorporated into the Ministry's revised draft.",
    outcomeSr: "Tri od pet preporuka odbora o upravljanju podacima i transparentnosti modela uvrštene su u revidirani nacrt Ministarstva."
  },
  {
    id: "pw-2026-vat",
    date: "2026-03-11",
    committee: "Tax & Finance",
    committeeSr: "Porezi i finansije",
    title: "VAT refund processing time cut from 90 to 30 days",
    titleSr: "Rok za povraćaj PDV-a skraćen sa 90 na 30 dana",
    outcome: "Sustained committee advocacy led the Ministry of Finance to formally shorten the statutory refund window for exporters.",
    outcomeSr: "Kontinuirano zalaganje odbora navelo je Ministarstvo finansija da formalno skrati zakonski rok za povraćaj izvoznicima."
  },
  {
    id: "pw-2025-labor",
    date: "2025-11-04",
    committee: "Labor & HR",
    committeeSr: "Rad i ljudski resursi",
    title: "Simplified work-permit renewal for intra-company transfers",
    titleSr: "Pojednostavljeno obnavljanje radnih dozvola za interne transfere",
    outcome: "A joint submission with three peer chambers reduced the renewal document set from 14 to 6 items.",
    outcomeSr: "Zajednička inicijativa sa tri partnerske komore smanjila je broj potrebnih dokumenata za obnovu sa 14 na 6."
  },
  {
    id: "pw-2025-construction",
    date: "2025-06-18",
    committee: "Real Estate & Construction",
    committeeSr: "Nekretnine i građevinarstvo",
    title: "Digital building-permit tracker launched by the City of Belgrade",
    titleSr: "Grad Beograd pokrenuo digitalni pratilac građevinskih dozvola",
    outcome: "Two years of committee position papers on permitting delays contributed to the city's e-Permit rollout.",
    outcomeSr: "Dvogodišnji rad odbora na dokumentima o kašnjenju dozvola doprineo je pokretanju gradskog e-Permit sistema."
  },
  {
    id: "pw-2024-esg",
    date: "2024-09-30",
    committee: "ESG & Environment",
    committeeSr: "ESG i životna sredina",
    title: "National ESG reporting standard aligned with EU taxonomy",
    titleSr: "Nacionalni ESG standard izveštavanja usklađen sa EU taksonomijom",
    outcome: "Committee-authored comments prevented a divergent local standard, sparing members a parallel compliance track.",
    outcomeSr: "Komentari odbora sprečili su uvođenje odvojenog lokalnog standarda, poštedevši članove paralelnog usklađivanja."
  },
  {
    id: "pw-2023-customs",
    date: "2023-05-15",
    committee: "Trade & Customs",
    committeeSr: "Trgovina i carine",
    title: "Single-window customs pilot expanded to three border crossings",
    titleSr: "Pilot jedinstvenog šaltera carine proširen na tri granična prelaza",
    outcome: "Data from committee member shipments was used to justify expanding the pilot beyond its original single site.",
    outcomeSr: "Podaci iz pošiljki članova odbora korišćeni su za opravdanje proširenja pilota van prvobitne jedne lokacije."
  }
];
