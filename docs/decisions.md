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

- **D-017 Social links with logos (owner decision 2026-11-16).** Substack (`https://medtechsignal.substack.com/`),
  Bluesky (`https://bsky.app/profile/gillespe.bsky.social`) and LinkedIn (`https://www.linkedin.com/in/gillespenning/`)
  are shown as logo marks with accessible names, in one colour (petrol, brass on hover and focus), in the footer strip
  (`#social`, desktop and phone) and in the Writing & Speaking card. The marks are inline SVG paths in `src/icons.js`,
  copied once from the `simple-icons` package (CC0; Substack and Bluesky from 16.38.0, LinkedIn from 13.21.0 because later
  versions dropped it). No dependency, no icon font, no external request. Links carry `rel="me noopener"`. The Writing room
  also has a Bluesky hotspot. The old "MedTech Signal / Newsletter" list line in the Writing card is replaced by this row.
- **D-018 News from the AI in Medicine Monitor (owner decision 2026-11-16).** The monitor publishes an owner-approved feed
  (`https://ai.gillespenning.com/data/news.json`, permalinks `https://ai.gillespenning.com/news/#<id>`, archive
  `https://ai.gillespenning.com/news/`). The page ships a snapshot (`src/news-snapshot.json`, approved items only, newest
  first, regenerated with `scripts/update-news-snapshot.mjs`), renders from it at once, then tries the live feed once
  (timeout 4 s, no credentials). A valid live feed replaces the list; any failure keeps the snapshot silently. Titles and
  summaries are shown verbatim in the current language (CSS clamping only). Shown as one "Latest:" line in the footer strip
  (newest title, linked to its Substack source, else the first source, else the monitor permalink) and as the three newest
  items plus "All news" in the Writing & Speaking card (and in the no-WebGL source section). Without JavaScript the section
  has one plain "News" link to the archive.
- **D-019 Publishing preparation (owner decision 2026-11-16).** Target is GitHub Pages, deployed by
  `.github/workflows/pages.yml` on push to `main` and on manual dispatch (Node 22, `npm ci`, `npm run build`, upload `dist`).
  `public/CNAME` holds `gillespenning.com`. `index.html` has the canonical link, Open Graph and Twitter title and
  description (English), `hreflang` alternates for `https://gillespenning.com/` and `https://gillespenning.com/?lang=de`, an
  SVG favicon (`public/favicon.svg`, "GP" monogram, petrol on cream) and `theme-color`. `public/robots.txt` and
  `public/sitemap.xml` exist. No analytics, no cookies, no external fonts or scripts. Prepared only: nothing is live and
  the domain switch is an owner step.
- **D-020 Privacy note (2026-11-16).** The page stores only the language choice (`localStorage`, key `gp-lang`) and loads the
  news list from `ai.gillespenning.com` (a request without credentials; the monitor sees the visitor's IP address like any
  web host). No cookies, no analytics. No legal imprint and no privacy policy have been written: the owner must supply them
  (see open questions).
- **D-021 Token check (2026-11-16).** `scripts/check-tokens.mjs` (`npm run check`) fails on raw px values for font-size,
  border-radius, heights and spacing in `src/style.css` and on tokens used for the wrong property. Exceptions are listed at the
  top of the script (0, 1px and 2px hairlines). Replaces the "planned" check in `AGENTS.md`.
- **D-022 Pictures unlit (2026-11-16).** Picture surfaces (slot pictures and their placeholders) use an unlit, non-tone-mapped
  material, so they show the file's own brightness against the lightened model (D-016) instead of going grey in the light rig.
- **D-023 Brass text colour (2026-11-16, to be confirmed by the owner).** The kicker line below the headline is 20 px at
  small heights and the brass accent (3.35:1) fails AA there. A darker shade of the same accent, `--brass-ink` (#8a6016, 4.85:1
  on cream), is used for small brass text. `--brass` stays for lines, hover and focus marks and large text.

- **D-024 Free rotation of the model (owner decision 2026-11-16).** The model can be turned freely: drag with mouse or one finger
  orbits azimuth without limit and elevation all the way round (upside down and from below). Camera: `view`/`goal` in `src/viewer.js` now
  carry `az`, `el`, `dist`; the camera up vector is the tangent of the elevation arc, so there is no flip or jump at the poles, and the
  horizontal drag sense mirrors when upside down. Zoom: wheel over the canvas (no ctrl/cmd, only when the page itself does not scroll),
  pinch with two fingers, `+`/`-`; clamped to 0.2 to 1.8 times the default distance. Touch rule: a one-finger drag that starts mostly
  vertical stays page scroll (`touch-action: pan-y`); one that starts mostly horizontal locks as an orbit (azimuth and elevation);
  two fingers always pinch-zoom and orbit. Keyboard (canvas focused, `role="application"` with a label): arrows orbit, `+`/`-` zoom,
  Home or 0 resets. Opening a room, "All rooms", Escape and the "Reset view" button (shown only when away from the default) glide back
  to the default pose. Hotspots fade out when the camera is below or edge-on to the model. Clicks on the underside no longer open rooms.
- **D-025 Hidden cellar with a fax machine (owner decision 2026-11-16).** On the underside of the base a small cellar is recessed
  (cream walls, a frame, a small light) with a fax machine. Nothing on the page hints at it; it is found only by turning the model over.
  Clicking it (only when it faces the camera) shakes the machine and feeds a sheet out of the slot (1.2 s), then shows a note: EN "This is
  where healthcare keeps its interoperability." / DE "Hier bewahrt das Gesundheitswesen seine Interoperabilität auf." (also printed on the
  sheet). Not in the tab order, not announced; the note is created on first click, is a labelled region with a close button, and closes
  with Escape or "Reset view". Reduced motion: no shaking, sheet and note appear at once. Not mentioned in README or visible UI.
- **D-026 "Contact" replaces "Book a talk" (owner decision 2026-11-16).** Header button, Writing & Speaking card button and the heading of
  the speaking part read "Contact" / "Kontakt"; behaviour unchanged. The speaking part has an email link `mailto:nr@gillespenning.com`
  (owner-approved address) next to "Contact on LinkedIn"; its enquiries line now says "LinkedIn or email". Supersedes "Book a talk" in D-014/D-015.
- **D-027 DocEase "Coming soon", Elbstrand linked (owner decision 2026-11-16).** DocEase shows "Coming soon" / "Demnächst" (list entry and
  hotspot title) and stays a non-link. Elbstrand links to `https://penning.info/` (list entry and Projects hotspot). The Projects line reads
  "Three projects are linked here. DocEase is coming soon."
- **D-028 Legal page (owner decision 2026-11-16).** `legal.html` at the site root (second Vite entry, built to `dist/legal.html`, own
  stylesheet `src/legal.css` on the same tokens, no JavaScript, `noindex`, not in the sitemap): German first, then English. Impressum:
  Gilles Penning, 22587 Hamburg (Blankenese), `nr@gillespenning.com`, one sentence "private website"; no street, phone or VAT id. Privacy: four
  sentences per language (GitHub Pages hosting and access data; no cookies, no tracking, only the language in local storage; news from
  ai.gillespenning.com, external links transmit data only when clicked; requests to `nr@gillespenning.com`). Linked from the footer strip
  as "Legal & privacy" / "Impressum & Datenschutz" (14 px, ink colour) and in the no-JavaScript source. Replaces the "legal pages not
  written" part of D-020 and open question 8 (the owner supplied the content; a lawyer has not reviewed it).

## 2026-11-17

- **D-029 Operating room, practice desk, About Me shelf & microphone (owner decision 2026-11-17).**
  - **AI & Digital Health:** Combines an operating room zone on the left (operating table with sterile drape, 10 mm rigid
    endoscope with camera head and trailing cable, articulated 7-lens surgical light, rolling 3-drawer cart, and an endoscopic
    equipment tower for rigid endoscopy with CO₂ cylinder, insufflator, cold light source, camera control unit and a large
    rolling monitor displaying `ai-wall-1` / Wimmelbild) with a practice corner on the right (two-door cabinet bookshelf
    along the back wall and angled wooden desk with a desktop monitor displaying `ai-wall-2` / AI in Medicine Monitor instead
    of a flower). The corridor boundary of the AI room is a three-panel frosted glass partition whose front panel slides open.
  - **Doorways:** Corridor kerbs in Projects, About Me and Writing & Speaking leave an opening at each sliding door so the
    brass corridor path enters every room through its door onto the room floor.
  - **About Me:** Uses the two-door cabinet bookshelf with slightly imperfect standing and stacked books; the brass lamp
    moves onto the shelf alongside upright/leaning books and a miniature USS Enterprise NCC-1701-E on a display stand. The
    desk holds an open laptop, a book and a coffee mug. `public/slots/about-wall-1.webp` shows the owner's Porto running
    photo (bib 8490, 3:4 portrait, warm-graded) and opens a compact animated photo card when clicked inside About Me.
  - **Writing & Speaking:** Uses the two-door cabinet bookshelf and a detailed studio/podcast table microphone with weighted
    base, stem, U-yoke, brass collar and mesh capsule on the round lounge table.
- **D-030 Internal OR glass wall, IT rack, running shoes, panning, compact cards & AI-cliché cleanup (owner decision 2026-11-17).**
  - **AI & Digital Health:** An internal glass partition wall with an open doorway separates the OR zone from the Vorraum;
    the rear bookshelf in the Vorraum is replaced by a 19-inch IT server rack with stacked blades and status LEDs.
  - **About Me:** A pair of miniature running shoes stands on the floor under `about-wall-1`. The running photo card has no
    caption text and closes via a small top-right `×` button.
  - **Camera & Mouse Panning:** Removes `setViewOffset` so the model never slides out of the viewport; clamps the camera
    target within the model bounds; adds right-click / middle-click / Shift+drag panning (plus two-finger touch pan and
    Shift+Arrow keys).
  - **Compact Project & Room Cards:** Clicking a project board, monitor or project hotspot opens a compact pop-up card
    (preview image, 1–2 lines, link if live, top-right `×`). The desktop room card (`#panel`) sits compactly at bottom-left
    with a top-right `×`, and `Projects` shows a one-line prompt inside the 3D view while `#source` keeps the fallback list.
  - **Anti-AI-Cliché Cleanup:** Removes the `.kicker` line under `<h1>`, replaces paired filled/outlined and full-width hero/contact
    buttons with a single primary CTA and underlined text links, removes title `–` dashes, and trims rule-of-three prose lists.
- **D-031 Full-screen translucent layout, ceiling dual-wing OP light, About Me trophies & Praxisfaden (owner decision 2026-11-17).**
  - **Full-bleed 3D stage behind translucent UI:** On desktop (`>= 801px`), `#stage` fills `100svh` behind translucent frosted
    header, intro card, footer strip, cards and hotspot labels (`color-mix` + `backdrop-filter`) so panning/zooming never clips
    the 3D model at column edges. Right/Middle/Shift/Space-drag and horizontal trackpad swipes pan smoothly; `DMIN = 0.7`,
    `ZMIN = 0.06` enable close zoom onto the Enterprise-E (rotated into side profile) and other details without extra mode buttons.
  - **AI & Digital Health:** Rear-most internal glass segment removed so `"AI & Digital Health"` back lettering is uninterrupted;
    floor-standing OP light replaced by a ceiling-suspended dual-wing surgical light; IT rack tucked into the back-right corner.
    Opening `AI & Digital Health` zooms cleanly into the room with no `#panel` overlay.
  - **About Me:** Running shoes removed; career copy updated (MedTech since 2001, digital workflows from telemedicine to AI
    since 2004, healthcare leadership since 2005, OR system integration / minimally invasive surgery / patient monitoring from 2008,
    AI & analytics today). Bookshelf adds a brass globe and 3 clickable brass-rimmed trophies (Substack, Bluesky, LinkedIn);
    open laptop shows `"My Story"` / `"Meine Geschichte"` and opens a compact translucent card on click; floating `.spot` tags
    in `About Me` are removed.
  - **Projects, Footer & Cellar:** `DocEase` renamed to `Praxisfaden` (tool for MFAs in outpatient medicine); `Elbstrand` carries
    `projects-board-4.webp` (`1200 x 900`) and `"Just chill and relax."`. Footer shows the 3 newest Substack posts horizontally
    (`Latest Substacks:`). `"Explore speaking topics"`, the `#speaking` card, and `nr@gillespenning.com` are removed from the home
    page (`nr@gillespenning.com` stays only in `legal.html`). Cellar fax machine note updated with a LinkedIn link.
- **D-032 Left-aligned clickable cards, clean nav states & OP cart placement (owner decision 2026-11-17).**
  - **OR Rolling Drawer Cart:** Placed flush against the left outer wall of the operating room (`[-2.22, 0.06, 0.48]`, facing into the room).
  - **No Nav/Button Underlines:** Removed `border-bottom` underlines on top header nav links and room bar active/hover buttons (using color/weight/tint instead) and hover underlines on hotspot labels.
  - **Direct Card Click & Left Placement:** Removed separate `"Open ..."` CTA links from pop-up cards; clicking a card's image or text opens its target link directly (when live) while `×` closes the card. Pop-up and photo cards anchor to the left side of the 3D area (clear of `.intro` and `#panel`) with `.stage` keeping `z-index: auto` and `#scene` at `z-index: 0` so cards and canvas interactions stay reliably clickable above the 3D view.
- **D-033 (2026-11-17) Fixed Card Position, Photo Caption & Social Media Pop-up Cards:**
  - **Consistent Fixed Card Spot:** Stopped moving `.photo-card` and `.pop-card` dynamically per 3D anchor (`clampCardPos` removed). Every pop-up card now opens in one fixed, predictable position (`left: calc(34% + var(--s4)); top: 50%` on desktop, centered inside the 3D viewport on mobile).
  - **Runner Photo Caption:** Added `"Begeisterter Marathonläufer"` (DE) / `"Passionate marathon runner"` (EN) beneath the running photo inside `.photo-card`.
  - **Social Media Pop-up Cards:** Clicking the Substack, Bluesky, or LinkedIn trophy plaques in `About Me` or the social hotspots (`signal`, `linkedin`, `bluesky`) in `Writing & Speaking` now opens a compact translucent `.pop-card` with a canvas emblem preview, short description, direct card link to the profile, and top-right `×`.
  - **Hero Wimmel Book CTA:** Added an `Open AI Medicine Wimmel Book` / `Zum AI Medicine Wimmel Book` button (`https://wimmelbild.gillespenning.com/en/`) alongside `Open the AI in Medicine Monitor` inside `.intro .actions`, with `flex-wrap: wrap` so the two buttons sit side-by-side when space allows and wrap cleanly when narrow.
- **D-034 (2026-11-17) Impeccable Init & Hook Configuration (`PRODUCT.md`, `.impeccable/config.json`):**
  - **Product Positioning Priority:** Created `PRODUCT.md` via `/impeccable init` establishing flagship project promotion (`AI in Medicine Monitor` and `Wimmelbild`) and clinical AI / MedTech expert positioning as the primary focus alongside speaker bookings and career reference.
  - **Workflow & Hook Policy:** Configured `.impeccable/config.json` with `"buildPath": "code"` (code-first against `DESIGN.md` and `src/tokens.css`) and ran `impeccable hooks off` so the automatic edit hook remains disabled per `AGENTS.md` without repeating doctor warnings.
- **D-035 (2026-11-17) Top-Right Borderless Auto-Fading Cards, Closer 3D View, Free Panning, Furniture Upgrade & Hover Tooltips:**
  - **Stacking Context & Top-Right Cards:** Changed desktop `.stage` to `position: absolute` inside `body { position: relative; }` with `.hero { position: static; }` and raised overlay UI (`z-index: 6`), so `.panel`, `.photo-card`, `.pop-card`, and `.egg` always render cleanly above `.intro` at top-right beside `.intro`. Cards use bright, borderless frosted paper (`64%` opacity, `border: 0`, borderless emblems) and auto-dismiss after 6 seconds when not hovered.
  - **Navigation & Camera:** Moved `All rooms` (`.back`), `"Move"` / `"Verschieben"` pan toggle (`.pan-toggle`), and `.reset` to the right column; clicking any room in `.top nav` or `.bar` on desktop zooms deeply (`* 0.68`) and centers more evenly; default overview zooms closer (`* 0.78`) and more centrally. Widened pan clamp bounds (`-14..14` / `-6..8`), enabled global `Space` + left-drag, right/middle-drag, `Shift`/`Ctrl`/`Alt` + drag, and one-click `"Verschieben"` left-drag mode.
  - **3D Seating & Interactive Objects:** Added ergonomic 5-star office swivel chairs (`officeChair`) at both desks (`AI & Digital Health`, `About Me`) and plush club chairs (`podcastArmchair`) in `Writing & Speaking`. Moved LinkedIn and Bluesky off `HOTSPOTS.writing`, made the `AI & Digital Health` server rack (`rack`: telemedicine/OR integration since 2004, workflows, data & tools) and `USS Enterprise NCC-1701-E` (`enterprise`) clickable, and added desktop-only `.hover-tip` tooltips over interactive 3D props while preserving visible `.spots` on mobile.
- **D-036 (2026-11-17) Harmonization with AI in Medicine Monitor Visual System, Typography & Structure (owner decision 2026-11-17):**
  - **Color Palette:** Fully aligned design tokens (`src/tokens.css`, `DESIGN.md`) with `ai.gillespenning.com`: `--paper: #f7f6f2` (soft warm neutral background), `--surface: #ffffff` (cards and elevated panels), `--line: #dcd9d0` (subtle hairlines and borders), `--ink: #18181b` (primary body text), `--muted: #4b5563` (secondary captions/metadata), `--teal: #1e3a8a` (signature deep blue accent for headings, active navigation, buttons, and focus outlines), `--teal-surface: #eff6ff` (light tint for badges and highlights), and `--brass-ink: #172554` (high-contrast deep blue text for small sizes, 7:1+).
  - **Two-Font Typography System:** Adopted the AI Monitor font pair: `--serif: 'Source Serif 4', Georgia, serif` for brand name, headings (`h1`, `h2`, `h3`), and 3D architectural wall lettering, and `--sans: 'Source Sans 3', system-ui, -apple-system, sans-serif` for body text, navigation links, buttons, tooltips, cards, and footer strip. Fonts are self-hosted locally via `@fontsource/source-serif-4` and `@fontsource/source-sans-3` with zero external requests per `AGENTS.md`.
  - **Hero & Intro Structure:** Added collapsible `<details class="about-scope">` with summary label (`"About this site"` / `"Über diese Seite"`) around the second intro paragraph, preserving full two-column breathing room and clean focus on the primary CTAs (`AI in Medicine Monitor` and `Wimmelbild`) alongside crisp accent lines.

## Open questions

1. Texts and links for DocEase and Elbstrand.
2. Who is the primary audience, and what should a visitor do at the end
   (contact, booking, CV download, newsletter)?
3. ~~German version~~ decided, see D-012. Open: does Wimmelbild have a German address? Both languages link to `https://wimmelbild.gillespenning.com/en/` until it is confirmed.
4. Which material exists: photos, CV, past talks, press, logos?
5. Deployment is prepared (D-019). Open owner steps: enable Pages with source "GitHub Actions", merge to `main`, switch the DNS of `gillespenning.com`.
6. Confirm the exact values of the design scales.
7. Enable the Impeccable design hook, yes or no?
8. Legal imprint and privacy policy for the live site (owner must supply the texts, D-020).
9. A share image (Open Graph picture) for link previews. None exists, so previews show text only.
