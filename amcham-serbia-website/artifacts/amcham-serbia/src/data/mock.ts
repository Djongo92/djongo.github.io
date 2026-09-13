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

export const mockMembers: Member[] = [
  {
    id: "mem-01",
    name: "A1 Srbija",
    sector: "Telecommunications",
    sectorSr: "Telekomunikacije",
    summary: "A1 Srbija is part of A1 Telekom Austria Group, a leading provider of digital services and communications solutions in Central and Eastern Europe.",
    summarySr: "A1 Srbija je deo A1 Telekom Austria Grupe, vodećeg provajdera digitalnih usluga i komunikacionih rešenja u centralnoj i istočnoj Evropi.",
    website: "https://a1.rs",
    category: "Patron",
    reviewDate: "2026-01-15"
  },
  {
    id: "mem-02",
    name: "Danubius Health",
    sector: "Healthcare",
    sectorSr: "Zdravstvo",
    summary: "A regional leader in providing innovative pharmaceutical solutions and cutting-edge medical devices.",
    summarySr: "Regionalni lider u pružanju inovativnih farmaceutskih rešenja i najsavremenijih medicinskih uređaja.",
    website: "#",
    category: "Corporate",
    reviewDate: "2026-02-10"
  },
  {
    id: "mem-03",
    name: "Nexus Retail Group",
    sector: "Retail",
    sectorSr: "Maloprodaja",
    summary: "Managing a widespread network of consumer goods stores across the Balkans with a focus on sustainable sourcing.",
    summarySr: "Upravlja rasprostranjenom mrežom prodavnica robe široke potrošnje širom Balkana sa fokusom na održivu nabavku.",
    website: "#",
    category: "Corporate",
    reviewDate: "2026-03-05"
  },
  {
    id: "mem-04",
    name: "Singidunum Logistics",
    sector: "Transportation",
    sectorSr: "Transport",
    summary: "Providing end-to-end supply chain and freight forwarding services across Europe and Asia.",
    summarySr: "Pružanje sveobuhvatnih usluga lanca snabdevanja i špedicije širom Evrope i Azije.",
    website: "#",
    category: "Business",
    reviewDate: "2026-04-12"
  },
  {
    id: "mem-05",
    name: "Balkan Tech Solutions",
    sector: "IT & Technology",
    sectorSr: "IT i Tehnologija",
    summary: "Custom software development and cloud integration services for enterprise clients.",
    summarySr: "Razvoj softvera po meri i usluge integracije u oblaku za korporativne klijente.",
    website: "#",
    category: "Corporate",
    reviewDate: "2026-05-20"
  },
  {
    id: "mem-06",
    name: "AgroImpex Srbija",
    sector: "Agriculture",
    sectorSr: "Poljoprivreda",
    summary: "Major exporter of high-quality organic grains and processed food products from the Vojvodina region.",
    summarySr: "Glavni izvoznik visokokvalitetnih organskih žitarica i prerađenih prehrambenih proizvoda iz Vojvodine.",
    website: "#",
    category: "Business",
    reviewDate: "2026-06-18"
  },
  {
    id: "mem-07",
    name: "Meridian Financial",
    sector: "Finance & Banking",
    sectorSr: "Finansije i Bankarstvo",
    summary: "Offering corporate banking, asset management, and financial advisory to multinational corporations.",
    summarySr: "Nudi korporativno bankarstvo, upravljanje imovinom i finansijsko savetovanje multinacionalnim korporacijama.",
    website: "#",
    category: "Patron",
    reviewDate: "2026-07-22"
  },
  {
    id: "mem-08",
    name: "EkoBuild Construction",
    sector: "Real Estate & Construction",
    sectorSr: "Nekretnine i Građevinarstvo",
    summary: "Pioneering green building standards and commercial real estate development in Belgrade.",
    summarySr: "Pionir u standardima zelene gradnje i razvoju komercijalnih nekretnina u Beogradu.",
    website: "#",
    category: "Corporate",
    reviewDate: "2026-08-30"
  },
  {
    id: "mem-09",
    name: "Global Trade Law LLC",
    sector: "Legal Services",
    sectorSr: "Pravne Usluge",
    summary: "International law firm specializing in corporate compliance, M&A, and cross-border disputes.",
    summarySr: "Međunarodna advokatska kancelarija specijalizovana za korporativnu usklađenost, spajanja i preuzimanja i prekogranične sporove.",
    website: "#",
    category: "Business",
    reviewDate: "2025-11-15"
  },
  {
    id: "mem-10",
    name: "Optima Energy",
    sector: "Energy",
    sectorSr: "Energetika",
    summary: "Investing in renewable energy sources including wind and solar farms across the region.",
    summarySr: "Ulaganje u obnovljive izvore energije, uključujući vetro i solarne parkove širom regiona.",
    website: "#",
    category: "Corporate",
    reviewDate: "2026-01-20"
  },
  {
    id: "mem-11",
    name: "Summit HR Consulting",
    sector: "Human Resources",
    sectorSr: "Ljudski Resursi",
    summary: "Executive search and talent acquisition firm focused on C-level placements.",
    summarySr: "Firma za regrutaciju izvršnih direktora i talenata fokusirana na visoke menadžerske pozicije.",
    website: "#",
    category: "Business",
    reviewDate: "2026-02-18"
  },
  {
    id: "mem-12",
    name: "Vanguard Media Group",
    sector: "Media & Advertising",
    sectorSr: "Mediji i Oglašavanje",
    summary: "Full-service advertising agency managing top-tier corporate brands and digital campaigns.",
    summarySr: "Agencija za oglašavanje u punom obimu koja upravlja vrhunskim korporativnim brendovima i digitalnim kampanjama.",
    website: "#",
    category: "Business",
    reviewDate: "2026-03-25"
  },
  {
    id: "mem-13",
    name: "Belgrade Institute of Tech",
    sector: "Education",
    sectorSr: "Edukacija",
    summary: "Leading higher education institution partnering with industry to bridge the talent gap.",
    summarySr: "Vodeća visokoškolska ustanova u partnerstvu sa industrijom za premošćavanje jaza u talentima.",
    website: "#",
    category: "Non-Profit",
    reviewDate: "2026-04-10"
  },
  {
    id: "mem-14",
    name: "Aura Hospitality",
    sector: "Hospitality & Tourism",
    sectorSr: "Ugostiteljstvo i Turizam",
    summary: "Operating a portfolio of luxury hotels and business conference centers in Serbia.",
    summarySr: "Upravlja portfeljem luksuznih hotela i poslovnih konferencijskih centara u Srbiji.",
    website: "#",
    category: "Corporate",
    reviewDate: "2026-05-05"
  },
  {
    id: "mem-15",
    name: "Cortex Manufacturing",
    sector: "Manufacturing",
    sectorSr: "Proizvodnja",
    summary: "Automotive parts manufacturer supplying major European car assembly plants.",
    summarySr: "Proizvođač automobilskih delova koji snabdeva glavne evropske fabrike za sklapanje automobila.",
    website: "#",
    category: "Patron",
    reviewDate: "2026-06-12"
  },
  {
    id: "mem-16",
    name: "Stratos Insurance",
    sector: "Insurance",
    sectorSr: "Osiguranje",
    summary: "Comprehensive corporate insurance packages covering liability, property, and employee health.",
    summarySr: "Sveobuhvatni korporativni paketi osiguranja koji pokrivaju odgovornost, imovinu i zdravlje zaposlenih.",
    website: "#",
    category: "Corporate",
    reviewDate: "2026-07-08"
  },
  {
    id: "mem-17",
    name: "OmniChem Solutions",
    sector: "Chemicals",
    sectorSr: "Hemijska Industrija",
    summary: "Producer of specialty chemicals for agricultural and industrial applications.",
    summarySr: "Proizvođač specijalnih hemikalija za poljoprivrednu i industrijsku primenu.",
    website: "#",
    category: "Business",
    reviewDate: "2026-08-14"
  },
  {
    id: "mem-18",
    name: "Foundation for Digital Youth",
    sector: "NGO",
    sectorSr: "NVO",
    summary: "Non-profit organization dedicated to teaching coding and digital literacy in rural areas.",
    summarySr: "Neprofitna organizacija posvećena podučavanju kodiranju i digitalnoj pismenosti u ruralnim područjima.",
    website: "#",
    category: "Non-Profit",
    reviewDate: "2025-12-01"
  },
  {
    id: "mem-19",
    name: "Novis Data Centers",
    sector: "IT & Technology",
    sectorSr: "IT i Tehnologija",
    summary: "State-of-the-art colocation and managed hosting provider with Tier 3 certifications.",
    summarySr: "Vrhunski provajder kolokacije i upravljanog hostinga sa Tier 3 sertifikatima.",
    website: "#",
    category: "Corporate",
    reviewDate: "2026-02-28"
  },
  {
    id: "mem-20",
    name: "Zenith Mining",
    sector: "Mining & Metals",
    sectorSr: "Rudarstvo i Metali",
    summary: "Responsible extraction and processing of base metals with a strong focus on ESG compliance.",
    summarySr: "Odgovorno vađenje i prerada baznih metala sa snažnim fokusom na usklađenost sa ESG standardima.",
    website: "#",
    category: "Patron",
    reviewDate: "2026-05-15"
  },
  {
    id: "mem-21",
    name: "AquaPure Systems",
    sector: "Environmental Services",
    sectorSr: "Usluge Zaštite Životne Sredine",
    summary: "Industrial water treatment and waste management solutions.",
    summarySr: "Tretman industrijskih voda i rešenja za upravljanje otpadom.",
    website: "#",
    category: "Business",
    reviewDate: "2026-06-25"
  },
  {
    id: "mem-22",
    name: "Pioneer Aviation",
    sector: "Transportation",
    sectorSr: "Transport",
    summary: "Private cargo airline facilitating rapid logistics across the region.",
    summarySr: "Privatna kargo avio-kompanija koja olakšava brzu logistiku širom regiona.",
    website: "#",
    category: "Business",
    reviewDate: "2026-07-10"
  },
  {
    id: "mem-23",
    name: "Urban Mobility Partners",
    sector: "Consulting",
    sectorSr: "Konsalting",
    summary: "Advising municipalities on smart city initiatives and electric vehicle infrastructure.",
    summarySr: "Savetovanje opština o inicijativama za pametne gradove i infrastrukturi za električna vozila.",
    website: "#",
    category: "Business",
    reviewDate: "2026-08-05"
  },
  {
    id: "mem-24",
    name: "Serbian Enterprise Forum",
    sector: "NGO",
    sectorSr: "NVO",
    summary: "Think tank promoting entrepreneurship and SME growth through policy research.",
    summarySr: "Think tank organizacija koja promoviše preduzetništvo i rast malih i srednjih preduzeća kroz istraživanje politika.",
    website: "#",
    category: "Non-Profit",
    reviewDate: "2026-09-02"
  }
];

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
