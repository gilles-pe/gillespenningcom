// All user-facing text of the site, in one file, so the owner can edit it without touching code.
// Structure: { en: {...}, de: {...} }. Both languages have the same keys.
// Every key holds a complete phrase. Keys ending in "Html" may contain <a> links.
// Project names (Wimmelbild, AI in Medicine Monitor, DocEase, Elbstrand, MedTech Signal, LinkedIn) are not translated.
// The static text in index.html must equal the English values here.

export const LINKS = {
  wimmelbild: 'https://wimmelbild.gillespenning.com/en/',   // confirmed path; a German path is an open question
  monitor: 'https://ai.gillespenning.com/',
  signal: 'https://medtechsignal.substack.com/',
  linkedin: 'https://www.linkedin.com/in/gillespenning/',
  bluesky: 'https://bsky.app/profile/gillespe.bsky.social',
};
const a = (href, text) => `<a href="${href}">${text}</a>`;

export const content = {
  en: {
    meta: {
      title: 'Gilles Penning – Healthcare & MedTech',
      description: 'Gilles Penning on change in healthcare: AI and digital health, projects, writing and speaking.',
    },
    ui: {
      allRooms: 'All rooms',
      soon: 'Details to follow',
      langLabel: 'Language',
      langEn: 'English',
      langDe: 'Deutsch',
    },
    nav: {
      label: 'Rooms',
      projects: 'Projects',
      about: 'About Me',
      ai: 'AI & Digital Health',
      writing: 'Writing & Speaking',
      book: 'Book a talk',
    },
    hero: {
      h1: 'Why is change so hard in healthcare?',
      kicker: 'Healthcare & MedTech',
      p1: 'As populations age, the need for care grows. Data and AI open up new possibilities, and people shape what makes it into everyday care.',
      p2: 'I’ve spent my career in MedTech, working with some very interesting people. Here I share the ideas I come across, the projects I work on, and what I learn from the people I meet.',
      monitor: 'Open the AI in Medicine Monitor',
      read: 'Read MedTech Signal',
      explore: 'Explore speaking topics',
    },
    strip: {
      label: 'More links',
      wimmelbild: 'Wimmelbild',
    },
    social: {
      substack: 'MedTech Signal on Substack',
      substackText: 'MedTech Signal',
      bluesky: 'Bluesky',
      linkedin: 'LinkedIn',
    },
    news: {
      latest: 'Latest',
      all: 'All news',
    },
    stage: {
      alt: 'Architectural model of a home with four rooms: Projects, About Me, AI and Digital Health, Writing and Speaking.',
      bar: 'Enter a room',
    },
    rooms: {
      label: 'The four rooms',
      projects: {
        h: 'Projects',
        p: 'Two projects are live. DocEase and Elbstrand follow.',
        wimmelbild: 'The patient’s path',
        monitor: 'Studies and benchmarks',
      },
      about: {
        h: 'About Me',
        p1: 'I started in surgery in 2001, moved into telemedicine in 2004, and from 2008 worked on system integration and digital workflows in the operating room.',
        p2: 'Since then MedTech has been my field: marketing, sales and sales leadership, large teams, change management and entrepreneurial work.',
        linkedin: 'Full profile',
      },
      ai: {
        h: 'AI & Digital Health',
        pHtml: `AI, longitudinal data and digitalisation in medicine. Two ways in: ${a(LINKS.wimmelbild, 'Wimmelbild')} follows the patient, the ${a(LINKS.monitor, 'AI in Medicine Monitor')} follows the evidence.`,
      },
      writing: {
        h: 'Writing & Speaking',
        pHtml: `The questions my talks start from are listed in the ${a('#speaking', 'speaking section')}.`,
        book: 'Book a talk',
      },
    },
    speaking: {
      h: 'Book a talk',
      intro: 'Speaking topics start from a question:',
      q1: 'Why is change so hard in healthcare?',
      q2: 'What changes when healthcare has longitudinal data?',
      langs: 'Talks are available in English and German.',
      enquiries: 'Enquiries go through LinkedIn.',
      contact: 'Contact on LinkedIn',
    },
    model: {
      rooms: { projects: 'Projects', about: 'About Me', ai: 'AI & Digital Health', writing: 'Writing & Speaking' },
      slots: {
        'ai-wall-1': 'Consultation',
        'ai-wall-2': 'Progress',
        'writing-table-1': 'Writing',
        'about-wall-1': 'About',
      },
      spots: {
        wimmelbild: 'Wimmelbild',
        monitor: 'AI in Medicine Monitor',
        monitorShort: 'AI Monitor',
        docease: 'DocEase',
        elbstrand: 'Elbstrand',
        signal: 'MedTech Signal',
        bluesky: 'Bluesky',
        speaking: 'Speaking topics',
        linkedin: 'LinkedIn',
        story: 'My story',
      },
    },
  },

  de: {
    meta: {
      title: 'Gilles Penning – Gesundheitswesen & MedTech',
      description: 'Gilles Penning über Veränderung im Gesundheitswesen: KI und Digital Health, Projekte, Schreiben und Vorträge.',
    },
    ui: {
      allRooms: 'Alle Räume',
      soon: 'Details folgen',
      langLabel: 'Sprache',
      langEn: 'English',
      langDe: 'Deutsch',
    },
    nav: {
      label: 'Räume',
      projects: 'Projekte',
      about: 'Über mich',
      ai: 'KI & Digital Health',
      writing: 'Schreiben & Vorträge',
      book: 'Vortrag buchen',
    },
    hero: {
      h1: 'Warum ist Veränderung im Gesundheitswesen so schwer?',
      kicker: 'Gesundheitswesen & MedTech',
      p1: 'Mit der alternden Bevölkerung wächst der Bedarf an Versorgung. Daten und KI eröffnen neue Möglichkeiten, und Menschen entscheiden, was davon im Versorgungsalltag ankommt.',
      p2: 'Mein Berufsleben gehört der MedTech, und ich durfte mit einigen sehr interessanten Menschen zusammenarbeiten. Hier teile ich Ideen, auf die ich stoße, Projekte, an denen ich arbeite, und was ich von den Menschen lerne, denen ich begegne.',
      monitor: 'Zum AI in Medicine Monitor',
      read: 'MedTech Signal lesen',
      explore: 'Vortragsthemen ansehen',
    },
    strip: {
      label: 'Weitere Links',
      wimmelbild: 'Wimmelbild',
    },
    social: {
      substack: 'MedTech Signal auf Substack',
      substackText: 'MedTech Signal',
      bluesky: 'Bluesky',
      linkedin: 'LinkedIn',
    },
    news: {
      latest: 'Aktuell',
      all: 'Alle Beiträge',
    },
    stage: {
      alt: 'Architekturmodell eines Hauses mit vier Räumen: Projekte, Über mich, KI und Digital Health, Schreiben und Vorträge.',
      bar: 'Raum betreten',
    },
    rooms: {
      label: 'Die vier Räume',
      projects: {
        h: 'Projekte',
        p: 'Zwei Projekte sind online. DocEase und Elbstrand folgen.',
        wimmelbild: 'Der Weg des Patienten',
        monitor: 'Studien und Benchmarks',
      },
      about: {
        h: 'Über mich',
        p1: 'Ich habe 2001 in der Chirurgie begonnen, bin 2004 in die Telemedizin gewechselt und habe ab 2008 an Systemintegration und digitalen Abläufen im Operationssaal gearbeitet.',
        p2: 'Seitdem ist die MedTech mein Feld: Marketing, Vertrieb und Vertriebsleitung, große Teams, Change Management und unternehmerische Arbeit.',
        linkedin: 'Vollständiges Profil',
      },
      ai: {
        h: 'KI & Digital Health',
        pHtml: `KI, Längsschnittdaten und Digitalisierung in der Medizin. Es gibt zwei Zugänge: ${a(LINKS.wimmelbild, 'Wimmelbild')} folgt dem Patienten, der ${a(LINKS.monitor, 'AI in Medicine Monitor')} folgt der Evidenz.`,
      },
      writing: {
        h: 'Schreiben & Vorträge',
        pHtml: `Die Fragen, von denen meine Vorträge ausgehen, stehen im ${a('#speaking', 'Abschnitt zu Vorträgen')}.`,
        book: 'Vortrag buchen',
      },
    },
    speaking: {
      h: 'Vortrag buchen',
      intro: 'Meine Vortragsthemen beginnen mit einer Frage:',
      q1: 'Warum ist Veränderung im Gesundheitswesen so schwer?',
      q2: 'Was ändert sich, wenn das Gesundheitswesen Längsschnittdaten hat?',
      langs: 'Vorträge gibt es auf Deutsch und auf Englisch.',
      enquiries: 'Anfragen laufen über LinkedIn.',
      contact: 'Auf LinkedIn kontaktieren',
    },
    model: {
      rooms: { projects: 'Projekte', about: 'Über mich', ai: 'KI & Digital Health', writing: 'Schreiben & Vorträge' },
      slots: {
        'ai-wall-1': 'Sprechstunde',
        'ai-wall-2': 'Verlauf',
        'writing-table-1': 'Schreiben',
        'about-wall-1': 'Über mich',
      },
      spots: {
        wimmelbild: 'Wimmelbild',
        monitor: 'AI in Medicine Monitor',
        monitorShort: 'AI Monitor',
        docease: 'DocEase',
        elbstrand: 'Elbstrand',
        signal: 'MedTech Signal',
        bluesky: 'Bluesky',
        speaking: 'Vortragsthemen',
        linkedin: 'LinkedIn',
        story: 'Meine Geschichte',
      },
    },
  },
};

export default content;
