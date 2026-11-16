# Decisions

Dated owner decisions for `gillespenning.com`. Newest last. A decision here is binding
until a later entry replaces it.

## 2026-11-16

- **D-001 Purpose.** The site is an orientation landing page above the owner's projects.
  It doubles as a job-application reference, a way to win speaker bookings, expert
  positioning and project promotion.
- **D-002 Separate repository.** The site lives in `gilles-pe/gillespenningcom`, apart
  from the AI in Medicine Monitor and its evidence rules.
- **D-003 Written rules.** `AGENTS.md` holds the working rules. Detailed decisions are
  logged in this file.
- **D-004 Limited design scales.** Only a fixed, small number of spacing steps, radii,
  heights and similar sizes may be used. The limits are in `AGENTS.md`. The exact values
  there are a starting proposal and still need confirmation with the visual direction.
- **D-005 Impeccable.** The Impeccable design skill is used for design work and is
  vendored in the repository. Its automatic hook is not enabled.

- **D-006 Direction.** The home page is a "four-room home" architectural model (Projects,
  About Me, AI & Digital Health, Writing & Speaking), built as a real Three.js model in a
  warm editorial style: cream, dark petrol, brass, light wood. The site is in English.
  Stack: Vite and Three.js, static build for GitHub Pages.
- **D-007 Projects.** Wimmelbild (`wimmelbild.gillespenning.com/en/`), AI in Medicine
  Monitor, DocEase and Elbstrand. DocEase and Elbstrand show the name only until the
  owner supplies text and links.
- **D-008 Confirmed links.** MedTech Signal (`medtechsignal.substack.com`) and LinkedIn
  (`linkedin.com/in/gillespenning`). LinkedIn is the contact channel for speaking
  enquiries until the owner names another.
- **D-009 Talks.** Talks are available in English and German.
- **D-010 Image slots.** Pictures in the model are exchangeable by fixed slot filenames
  (see `DESIGN.md`).
- **D-011 Working mode.** The main session orchestrates; implementation runs in subagents
  on smaller models, which hand back after two failed attempts at the same problem.
- **D-012 Bilingual site.** The site is English (default) and German. All text lives in
  `src/content.js`; the static HTML stays complete English. Language switch EN / DE in the top
  navigation, remembered in the browser, `?lang=de` supported, never chosen from the browser
  language. Project names are not translated. German copy is listed for proofreading in
  `docs/german-copy-review.md`.
- **D-013 No repeated content.** The two speaking questions appear only in `#speaking`.
  "Book a talk" appears in the nav and in the Writing & Speaking room, and the section
  `#speaking` has its LinkedIn button. Wimmelbild and the monitor have two permanent hero links,
  the room hotspots and one list in the Projects article; the AI & Digital Health article
  names them in text with inline links.

- **D-014 Compact page (owner decision 2026-11-16).** The page is compact. On a desktop (wider than 800 px, at
  least 640 px high) everything fits on one screen without scrolling: header, intro and model, and a slim strip of
  permanent links at the bottom. No text is deleted or rewritten in either language. The room texts and the speaking
  text are no longer sections below the hero: they appear in the room card of the model (the speaking text is part of
  the Writing & Speaking card). The sections stay in the HTML as the English source, hidden while the 3D model runs and
  shown as normal sections when JavaScript or WebGL is unavailable. On a phone a second tap on the same room (bar or
  model), or a tap on the model outside the room, zooms back out. Supersedes the page structure of D-006 where it
  conflicts; D-013 stays valid for copy, but the hero no longer carries the Wimmelbild and monitor buttons.
- **D-015 Calls to action (owner decision 2026-11-16).** The two foreground actions are the AI in Medicine Monitor
  ("Open the AI in Medicine Monitor", primary) and the MedTech Signal newsletter ("Read MedTech Signal"). "Explore
  speaking topics" is a plain text link under them; "Book a talk" in the header is a secondary (outline) button. The
  footer strip keeps Wimmelbild and has an empty container `#social` for social links to be added later.
- **D-016 Lighter model (owner decision 2026-11-16).** The 3D model is pale and airy: limestone-cream walls, pale oak,
  soft sage Projects wall, a muted grey-green base, soft low-contrast shadows. Text and UI colours are unchanged.

## Open questions

1. Texts and links for DocEase and Elbstrand.
2. Who is the primary audience, and what should a visitor do at the end
   (contact, booking, CV download, newsletter)?
3. ~~German version~~ decided, see D-012. Open: does Wimmelbild have a German address? Both languages link to `https://wimmelbild.gillespenning.com/en/` until it is confirmed.
4. Which material exists: photos, CV, past talks, press, logos?
5. Deployment to GitHub Pages and the domain switch are not set up yet.
6. Confirm the exact values of the design scales.
7. Enable the Impeccable design hook, yes or no?
