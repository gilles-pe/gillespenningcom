// All user-facing text of the site, in one file, so the owner can edit it without touching code.
// Structure: { en: {...}, de: {...} }. Both languages have the same keys.
// Every key holds a complete phrase. Keys ending in "Html" may contain <a> links.
// Project names (Wimmelbild, AI in Medicine Monitor, Praxisfaden, Elbstrand, MedTech Signal, LinkedIn) are not translated.
// The static text in index.html must equal the English values here.

export const LINKS = {
  wimmelbild: 'https://wimmelbild.gillespenning.com/en/',   // confirmed path; a German path is an open question
  monitor: 'https://ai.gillespenning.com/',
  signal: 'https://medtechsignal.substack.com/',
  linkedin: 'https://www.linkedin.com/in/gillespenning/',
  bluesky: 'https://bsky.app/profile/gillespe.bsky.social',
  elbstrand: 'https://penning.info/',
};
const a = (href, text) => `<a href="${href}">${text}</a>`;

export const content = {
  en: {
    meta: {
      title: 'Gilles Penning · Healthcare & MedTech',
      description: 'Gilles Penning on change in healthcare: AI and digital health, projects, writing and speaking.',
    },
    ui: {
      allRooms: 'All rooms',
      soon: 'Coming soon',
      close: 'Close',
      langLabel: 'Language',
      langEn: 'English',
      langDe: 'Deutsch',
      resetView: 'Reset view',
      panMode: 'Move',
    },
    nav: {
      label: 'Rooms',
      projects: 'Projects',
      about: 'About Me',
      ai: 'AI & Digital Health',
      writing: 'Writing & Speaking',
      book: 'Contact',
    },
    hero: {
      h1: 'Why is change so hard in healthcare?',
      p1: 'As populations age, the need for care grows. Data and AI open up new possibilities, and people shape what makes it into everyday care.',
      p2: 'I enjoy 25 years in MedTech, alongside great people and projects. Here I share the projects I build, the ideas I pick up from the people I meet, and a few thoughts on what we need to sustain and improve healthcare in times of technological and demographic changes.',
      wimmelbild: 'AI Medicine Wimmel Book',
      wimmelbildDesc: 'Fun time to explore AI impact',
      monitor: 'AI in Medicine Monitor',
      monitorDesc: 'Serious way to track progress',
      substack: 'Read MedTech Signal',
      substackDesc: 'My thoughts and writing on this',
    },
    strip: {
      label: 'More links',
      legal: 'Legal & privacy',
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
      latestSubstacks: 'Latest Substacks',
      all: 'All news',
    },
    stage: {
      alt: 'Architectural model of a home with four rooms: Projects, About Me, AI and Digital Health, Writing and Speaking.',
      bar: 'Enter a room',
      canvas: 'Interactive 3D model of the four rooms. Drag or use the arrow keys to rotate it, plus and minus to zoom, Home to reset the view. The rooms are also in the room bar.',
    },
    rooms: {
      label: 'The four rooms',
      projects: {
        h: 'Projects',
        p: 'Three projects are linked here. Praxisfaden is coming soon.',
        cardHint: 'Click a project in the room for details.',
        wimmelbild: 'The patient’s path',
        monitor: 'Studies and benchmarks',
      },
      about: {
        h: 'About Me',
        p1: 'MedTech since 2001, digital workflows from telemedicine to AI since 2004, and OR system integration in minimally invasive surgery and patient monitoring from 2008.',
        p2: 'Healthcare leadership since 2005 across large teams, change management, sales leadership and today AI and analytics.',
        linkedin: 'Full profile',
      },
      ai: {
        h: 'AI & Digital Health',
        cardHint: 'Clinical AI and longitudinal data. Click a monitor in the room for details.',
        pHtml: `Longitudinal data and AI in everyday clinical care. Two ways in: ${a(LINKS.wimmelbild, 'Wimmelbild')} follows the patient, the ${a(LINKS.monitor, 'AI in Medicine Monitor')} follows the evidence.`,
      },
      writing: {
        h: 'Writing & Speaking',
        p: 'Essays, notes and talks in English and German.',
        book: 'Contact',
      },
    },
    model: {
      rooms: { projects: 'Projects', about: 'About Me', ai: 'AI & Digital Health', writing: 'Writing & Speaking' },
      egg: { note: 'You found it! The fax device that keeps healthcare working in Germany. Send me a fax — or find me on LinkedIn.', cta: 'LinkedIn', label: 'Note from the cellar', close: 'Close' },
      photo: { alt: 'Gilles Penning running in Porto.', caption: 'Passionate marathon runner', close: 'Close' },
      projectCards: {
        wimmelbild: {
          title: 'Wimmelbild',
          img: 'slots/projects-board-1.webp',
          text: 'Interactive hidden-object picture following a patient’s path through connected care.',
          href: LINKS.wimmelbild,
        },
        monitor: {
          title: 'AI in Medicine Monitor',
          img: 'slots/projects-board-2.webp',
          text: 'Studies, benchmarks and progress charts on clinical AI.',
          href: LINKS.monitor,
        },
        praxisfaden: {
          title: 'Praxisfaden',
          img: 'slots/projects-board-3.webp',
          text: 'A tool for medical assistants (MFAs) in outpatient medicine to relieve practice workload. Coming soon.',
          href: null,
        },
        elbstrand: {
          title: 'Elbstrand',
          img: 'slots/projects-board-4.webp',
          text: 'Just chill and relax.',
          href: LINKS.elbstrand,
        },
        rack: {
          title: 'Digital Workflows & OR Integration',
          icon: 'rack',
          text: 'Telemedicine since 2004, integrated OR, digital workflows and image guidance: throughout my career I have worked to give physicians the best possible digital solutions, data and tools.',
          href: null,
        },
        enterprise: {
          title: 'USS Enterprise NCC-1701-E',
          icon: 'enterprise',
          text: 'Sovereign-class starship on the bookshelf — a nod to Star Trek and exploring new frontiers.',
          href: null,
        },
        signal: {
          title: 'MedTech Signal',
          icon: 'substack',
          text: 'Notes on clinical AI and digital health on Substack.',
          href: LINKS.signal,
        },
        linkedin: {
          title: 'LinkedIn',
          icon: 'linkedin',
          text: 'Connect on LinkedIn for clinical AI, digital health and project updates.',
          href: LINKS.linkedin,
        },
        bluesky: {
          title: 'Bluesky',
          icon: 'bluesky',
          text: 'Short notes and links on medical AI and health tech on Bluesky.',
          href: LINKS.bluesky,
        },
      },
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
        praxisfaden: 'Praxisfaden',
        elbstrand: 'Elbstrand',
        signal: 'MedTech Signal',
        bluesky: 'Bluesky',
        speaking: 'Speaking topics',
        linkedin: 'LinkedIn',
        story: 'My story',
        photo: 'Marathon',
        rack: 'Digital workflows',
        enterprise: 'USS Enterprise NCC-1701-E',
      },
    },
  },

  de: {
    meta: {
      title: 'Gilles Penning · Gesundheitswesen & MedTech',
      description: 'Gilles Penning über Veränderung im Gesundheitswesen: KI und Digital Health, Projekte, Schreiben und Vorträge.',
    },
    ui: {
      allRooms: 'Alle Räume',
      soon: 'Demnächst',
      close: 'Schließen',
      langLabel: 'Sprache',
      langEn: 'English',
      langDe: 'Deutsch',
      resetView: 'Ansicht zurücksetzen',
      panMode: 'Verschieben',
    },
    nav: {
      label: 'Räume',
      projects: 'Projekte',
      about: 'Über mich',
      ai: 'KI & Digital Health',
      writing: 'Schreiben & Vorträge',
      book: 'Kontakt',
    },
    hero: {
      h1: 'Warum ist Veränderung im Gesundheitswesen so schwer?',
      p1: 'Mit der alternden Bevölkerung wächst der Bedarf an Versorgung. Daten und KI eröffnen neue Möglichkeiten, und Menschen entscheiden, was davon im Versorgungsalltag ankommt.',
      p2: 'Ich blicke auf 25 Jahre in der MedTech zurück, an der Seite großartiger Menschen und Projekte. Hier teile ich die Projekte, an denen ich baue, Ideen aus der Arbeit mit Menschen, denen ich begegne, und ein paar Gedanken dazu, was wir brauchen, um das Gesundheitswesen in Zeiten technologischer und demografischer Veränderungen zukunftsfähig zu machen.',
      wimmelbild: 'AI Medicine Wimmel Book',
      wimmelbildDesc: 'Spielerisch den Einfluss von KI erkunden',
      monitor: 'AI in Medicine Monitor',
      monitorDesc: 'Evidenz und Fortschritt verlässlich verfolgen',
      substack: 'MedTech Signal lesen',
      substackDesc: 'Meine Gedanken und Texte dazu',
    },
    strip: {
      label: 'Weitere Links',
      legal: 'Impressum & Datenschutz',
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
      latestSubstacks: 'Aktuelle Substacks',
      all: 'Alle Beiträge',
    },
    stage: {
      alt: 'Architekturmodell eines Hauses mit vier Räumen: Projekte, Über mich, KI und Digital Health, Schreiben und Vorträge.',
      bar: 'Raum betreten',
      canvas: 'Interaktives 3D-Modell der vier Räume. Zum Drehen ziehen oder die Pfeiltasten nutzen, mit Plus und Minus zoomen, mit Pos1 die Ansicht zurücksetzen. Die Räume stehen auch in der Raumleiste.',
    },
    rooms: {
      label: 'Die vier Räume',
      projects: {
        h: 'Projekte',
        p: 'Drei Projekte sind hier verlinkt. Praxisfaden kommt demnächst.',
        cardHint: 'Klicke im Raum auf ein Projekt für Details.',
        wimmelbild: 'Der Weg des Patienten',
        monitor: 'Studien und Benchmarks',
      },
      about: {
        h: 'Über mich',
        p1: 'Seit 2001 in der MedTech, seit 2004 digitale Workflows von Telemedizin bis KI, ab 2008 OP-Systemintegration in minimalinvasiver Chirurgie und Patientenmonitoring.',
        p2: 'Seit 2005 Führungserfahrung im Gesundheitswesen mit großen Teams, Change Management, Vertriebsleitung und heute Fokus auf KI und Analytics.',
        linkedin: 'Vollständiges Profil',
      },
      ai: {
        h: 'KI & Digital Health',
        cardHint: 'Klinische KI und Längsschnittdaten. Klicke im Raum auf einen Monitor für Details.',
        pHtml: `Längsschnittdaten und KI im klinischen Alltag. Zwei Zugänge: ${a(LINKS.wimmelbild, 'Wimmelbild')} folgt dem Patienten, der ${a(LINKS.monitor, 'AI in Medicine Monitor')} folgt der Evidenz.`,
      },
      writing: {
        h: 'Schreiben & Vorträge',
        p: 'Texte, Notizen und Vorträge auf Deutsch und Englisch.',
        book: 'Kontakt',
      },
    },
    model: {
      rooms: { projects: 'Projekte', about: 'Über mich', ai: 'KI & Digital Health', writing: 'Schreiben & Vorträge' },
      egg: { note: 'Du hast es gefunden! Das Faxgerät, das das deutsche Gesundheitswesen am Laufen hält. Schick mir ein Fax — oder schreib mir auf LinkedIn.', cta: 'LinkedIn', label: 'Notiz aus dem Keller', close: 'Schließen' },
      photo: { alt: 'Gilles Penning beim Lauf in Porto.', caption: 'Begeisterter Marathonläufer', close: 'Schließen' },
      projectCards: {
        rack: {
          title: 'Digitale Workflows & OP-Integration',
          icon: 'rack',
          text: 'Telemedizin seit 2004, integrierter OP, digitale Workflows und Bildführung: In meiner ganzen Karriere ging es mir darum, Ärztinnen und Ärzten die bestmöglichen digitalen Lösungen, Daten und Tools an die Hand zu geben.',
          href: null,
        },
        enterprise: {
          title: 'USS Enterprise NCC-1701-E',
          icon: 'enterprise',
          text: 'Raumschiff der Sovereign-Klasse auf dem Bücherregal — eine Hommage an Star Trek.',
          href: null,
        },
        signal: {
          title: 'MedTech Signal',
          icon: 'substack',
          text: 'Beiträge zu klinischer KI und Digital Health auf Substack.',
          href: LINKS.signal,
        },
        linkedin: {
          title: 'LinkedIn',
          icon: 'linkedin',
          text: 'Vernetzung auf LinkedIn zu klinischer KI, Digital Health und aktuellen Projekten.',
          href: LINKS.linkedin,
        },
        bluesky: {
          title: 'Bluesky',
          icon: 'bluesky',
          text: 'Kurze Notizen und Links zu medizinischer KI und Health Tech auf Bluesky.',
          href: LINKS.bluesky,
        },
        wimmelbild: {
          title: 'Wimmelbild',
          img: 'slots/projects-board-1.webp',
          text: 'Interaktives Wimmelbild, das dem Weg eines Patienten durch die vernetzte Versorgung folgt.',
          href: LINKS.wimmelbild,
        },
        monitor: {
          title: 'AI in Medicine Monitor',
          img: 'slots/projects-board-2.webp',
          text: 'Studien, Benchmarks und Verlaufskurven zu KI in der Medizin.',
          href: LINKS.monitor,
        },
        praxisfaden: {
          title: 'Praxisfaden',
          img: 'slots/projects-board-3.webp',
          text: 'Ein Tool für MFAs in der ambulanten Medizin, um Praxen im Alltag zu entlasten. Demnächst.',
          href: null,
        },
        elbstrand: {
          title: 'Elbstrand',
          img: 'slots/projects-board-4.webp',
          text: 'Just chill and relax.',
          href: LINKS.elbstrand,
        },
      },
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
        praxisfaden: 'Praxisfaden',
        elbstrand: 'Elbstrand',
        signal: 'MedTech Signal',
        bluesky: 'Bluesky',
        speaking: 'Vortragsthemen',
        linkedin: 'LinkedIn',
        story: 'Meine Geschichte',
        photo: 'Marathon',
        rack: 'Digitale Workflows',
        enterprise: 'USS Enterprise NCC-1701-E',
      },
    },
  },
};

export default content;
