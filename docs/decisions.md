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
- **D-037 (2026-11-17) Hero Intro Expansion & Triad Action Buttons with Explanatory Lines (owner decision 2026-11-17):**
  - **Hero Text Expansion:** Removed collapsible `<details class="about-scope">`. Expanded the intro paragraph directly beneath the headline to include the owner's 25-year MedTech perspective: *"I enjoy 25 years in MedTech, alongside great people and projects. Here I share the projects I build, the ideas I pick up from the people I meet, and a few thoughts on what we need to sustain and improve healthcare in times of technological and demographic changes."* (and German equivalent).
  - **Unified Action Triad with Sublines:** Formatted all three key destinations as equal `.btn` actions with dedicated sublines explaining their purpose:
    1. **AI Medicine Wimmel Book** (`https://wimmelbild.gillespenning.com/en/`) — *Fun time to explore AI impact*
    2. **AI in Medicine Monitor** (`https://ai.gillespenning.com/`) — *Serious way to track progress*
    3. **Read MedTech Signal** (`https://medtechsignal.substack.com/`) — *My thoughts and writing on this*
- **D-038 (2026-11-17) Substack on Table Book & Standing Keynote Photo on Shelf in Writing & Speaking (owner decision 2026-11-17):**
  - **MedTech Signal (Substack) on Table Book:** Repurposed the book/sheet on the round table in *Writing & Speaking* (`writing-table-1.webp`, 800 x 600) as the MedTech Signal Substack publication cover. Clicking the book on the table opens the MedTech Signal card and links to `https://medtechsignal.substack.com/`.
  - **Standing Speaking Photo on Bookshelf:** Added a framed, kickstand-supported photograph (`writing-shelf-1.webp`, 768 x 1024, 3:4 portrait) standing upright on top of the bookshelf in *Writing & Speaking*, showing Gilles Penning speaking on stage in Marburg (14.11.2026: *"KI, Daten und die Apotheke der Zukunft"*). Clicking the photo (or its hotspot / tooltip) opens a photo modal card with full image, caption, and dismiss controls.
- **D-039 (2026-11-17) Interactive 3D Photo Album with Open-Book Modal in About Me (owner decision 2026-11-17):**
  - **Desk Photo Album in 3D (`About Me`):** Replaced the static desk book in *About Me* with an embossed dark teal leather photo album (`deskPhotoAlbum`) featuring a gold-leaf border, camera emblem, title typography, and brass metal corner protectors. Hovering over the album displays a desktop tooltip (`Fotoalbum` / `Photo album`), and a dedicated hotspot button is available on mobile/in-room navigation.
  - **Open-Book Album Modal:** Clicking either the 3D photo album on the desk or its hotspot button opens an authentic open-book spread modal (`.album-modal` / `.album-book`).
    - *Left Page:* Displays the selected photo mounted inside a matted frame with soft drop shadows and photo corners. Clicking the photo or left page automatically turns to the next picture.
    - *Right Page:* Features an elegant header with album badge and page counter (`1 / 7`), serif photo title, descriptive caption, a 7-photo thumbnail strip for direct jumping, previous/next navigation buttons (`‹ Vorheriges`, `Nächstes ›`), and keyboard hint (`Klicken zum Blättern · Pfeiltasten ‹ ›`).
    - *7 Processed Photos (`public/album/photo-1.webp` .. `photo-7.webp`):* 1. Elbe & COSCO container ship in Hamburg; 2. Speicherstadt rainbow over canals; 3. Dockland sunset puddle reflection; 4. Köhlbrandbrücke marathon runners; 5. Ponte Dom Luís I at sunset in Porto; 6. Ever Acme mega-ship arriving in port; 7. Quiet evening sunset with bench and trail signpost. Images are compressed with sharp (max width 1024px, 80% WebP quality, ~50-144 KB each) for optimal screen fidelity and fast load times.
    - *Keyboard & Accessibility:* Supports `ArrowLeft` / `ArrowRight` page turning, `Escape` to close, full keyboard navigation with focus trapping, backdrop dismiss, and strict token adherence passing `npm run check`.
- **D-040 (2026-11-17) Hero Action Links in Horizontal Triad with Descriptions Underneath (owner decision 2026-11-17):**
  - **Horizontal Links Layout:** Converted the 3 stacked rectangular buttons in `.hero-actions` into clean text hyperlinks (`.hero-link`) with dedicated captions (`.hero-desc`) placed directly underneath each link.
  - **Space-Saving 3-Column Arrangement:** Replaced the vertical stack with a 3-column horizontal grid (`grid-template-columns: repeat(3, minmax(0, 1fr))`, wrapping to 1 column on mobile screens <= 600px). This saves over 110px of vertical space, eliminates clipping behind the footer strip, and keeps the entire desktop layout compact on one screen per D-014.

- **D-064 (2026-11-18) Study lamp and distinct indoor plants.** Refine the lamp in the back-right room with pleated linen, brass trim, a petrol base and a soft warm diffuser. Give each existing plant a different form and vessel: narrow olive leaves over a terracotta pot, broad rubber-plant leaves over ivory ceramic, and arching fern fronds over a low sage bowl.

- **D-065 (2026-11-18) About Me Bio Update, Praxisfaden Mascot & hDRG-Kompass Project (owner decision 2026-11-18):**
  - **About Me Copy:** Updated `rooms.about.p1` and `rooms.about.p2` in EN and DE (`src/content.js`, `index.html`, `docs/german-copy-review.md`) to highlight 25 years in MedTech (surgical origin, patient monitoring, digital health since 2004, ambulatory care, EMS) and leadership focus on building businesses and transforming large teams.
  - **Praxisfaden Mascot:** Added `public/slots/projects-board-3.webp` (1200 x 900) featuring the owner-supplied turquoise reading mascot on warm paper background.
  - **hDRG-Kompass Project:** Added `hDRG-Kompass` (`https://www.hdrg-kompass.de/`) as the 5th plinth/board in the `Projects` room (`projects-board-4.webp`, moving `Elbstrand` to `projects-board-5.webp`), with balanced 5-plinth spacing (`pitch = 0.85`), 3D picking, hotspot, pop-up card, and bilingual copy.

- **D-066 (2026-11-18) Subtle refinement of the lounge floor lamp.** Keep its position, height and classic tapered silhouette in Writing & Speaking. Give it a low bronze base, a slimmer stem, a rounded linen shade with narrow hems, a warm diffuser and a short cord routed toward the wall.

- **D-067 (2026-11-18) Separate page text from the 3D canvas.** Replace the overlapping intro and room-card layout with a responsive grid. Show room details alongside the model on wide screens and below it on smaller screens. Fit and centre the camera within its own canvas and keep controls outside it. Use one room details region across layouts. In Writing & Speaking show a short introduction, contact, social links, and one recent post plus the archive.

- **D-068 (2026-11-18) Required scene continuity and transparency.** Keep the D-067 grid while allowing the 3D view to continue under the translucent introduction, room details and controls. This applies to desktop and mobile. Use 86% paper opacity for those backgrounds and full opacity for text. Text regions must remain separate. Frame room names and interactive objects within the clear view with extra headroom. See the required rule in DESIGN.md.

- **D-069 (2026-11-18) About Me Leadership & Business Development Deep-Dive (owner request):**
  - **Short First View & Coupled Visibility:** Kept the initial visible `About Me` text concise (`Originally a surgical guy...` + `My strength is building businesses...`) and added a discreet link (`More details` / `Mehr Details`). `#leadership-deepdive` opens strictly when clicking that link and automatically closes when closing the About-Me card, leaving the room, or switching rooms.
  - **Voice & Content (`writing_style_substack.md` + `gilles-wortliste-substack-2026.md`):** Written in Gilles' direct, concrete, hyphen-separated style without AI clichés or P&L amounts. Includes the leadership foundation text, three anonymized business development cases under `Selected experience` / `Ausgewählte Erfahrungen` (80+ staff / 5 surgical lines / up to 28% growth; carve-out & integration / up to 16 countries / 20%+ annual growth; 65+ staff / commercial realignment / wearable patient monitoring), three anonymous quotes under `Feedback from colleagues` / `Feedback von Kollegen`, and today's focus (`What I focus on today` / `Woran ich heute arbeite`).
  - **Bilingual & Responsive:** Full EN/DE translation via `src/content.js`, three-column desktop grid collapsing to single-column cards and quiet typographic blockquotes on mobile.

- **D-070 (2026-11-18) Approved favicon for gillespenning.com.** Replace the previous petrol-on-cream GP icon with the owner-selected white GP monogram and dotted globe on royal blue. Use the exact SVG artwork and matching ICO/PNG exports (16, 32, 180, 512 and 1024 px). Install in `public/`, reference from both `index.html` and `legal.html`, and use a URL version suffix so returning visitors receive the new icon. Keep the site's 3D design and other colours unchanged.

- **D-071 (2026-11-18) Quiet zoom controls and consistent object inspection (owner approved).** Enable mouse-wheel zoom over the clear 3D stage on scrollable pages. Add a discreet logarithmic slider and minus/plus actions beside Reset, synchronized with touch and keyboard zoom. Clicking the OP table, either desk, either shelf, a project, rack or Enterprise opens a card and a tailored close view; direct clicks can enter the object's room from the overview. Keep walls and furniture intact, reserve space above the caption, retain translucent backgrounds on desktop and phone, and restore the prior view when closing. Reset returns to the room view. Restrict the stage outline to keyboard interaction and reduce it to a 1 px hairline.

- **D-072 (2026-11-18) About laptop, compact controls and project artwork.** The About Me laptop opens a short leadership preview with an explicit link to the existing leadership section; it no longer repeats the room biography or links directly to LinkedIn. Keep the card-first interaction. On wider displays, including unfolded foldables and landscape phones, fit zoom and view controls in one row where space permits; on narrow phones use a second row. Tapping unused scene space must not dismiss the room. Keep All rooms visible while a room is open. Add a quiet right arrow to project cards only when they have a destination. Replace the Projects room Wimmelbild slot with the owner-supplied artwork, contained in the 4:3 slot without cropping.

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


- **D-073 (2026-11-18) Additional photo album images (owner request):** Added nine supplied photos to the About Me album, with concise location labels where identifiable. Images are stored as WebP in `public/album/`; uncertain locations are left unspecified.

- **D-074 (2026-11-18) Album entry sequence and local BACK navigation.** Clicking the album first frames the physical book, then opens its facing pages once the camera arrives. Clear any enlarged photo on entry and ignore the opening gesture's click-through; only a new photo click opens a large image. Cancel pending album entry on room changes, Reset or BACK. Add a translucent BACK control at the top-right of the stage once a previous view exists. Record room changes, object inspections and grouped manual zoom/orbit/pan gestures; restore them in reverse order without creating new navigation steps. Within the album, BACK closes the enlarged photo first, then the book, then returns through camera views. Keep the existing All rooms and Reset controls.

- **D-075 (2026-11-18) Leadership focus copy.** Split the closing leadership section into 'What I focus on today' and 'How I lead' using the owner's exact English copy. Maintain a German translation, existing type styles and a clear gap before the second heading.

- **D-076 (2026-11-18) Project activation and external tabs.** Open external HTTP(S) links in a new tab and request focus from the browser. First click on a 3D project opens its card; a second click on the same project opens its destination in a new tab. Projects without a destination keep the card open and display a Coming Soon badge over the project image. Internal links remain in the current page.

- **D-077 (2026-11-18) In-scene animated 3D photo album (`src/book-album.js`).** Replaced the `.album-modal` HTML spread overlay with an encapsulated Three.js 3D book component mounted at the existing desk position (`src/scene.js`, reusing the single WebGLRenderer/camera/loop, zero new npm dependencies). Adapted the spine-clustered `CubicBezierCurve` page bending, trailing tip flex, stack elevation and gutter ambient occlusion from MIT-licensed `Qbject/the-book-of-qbject`. Enforces a strict two-step entry: first click frames the closed leather book; second click once settled swings the cover open to reveal the unchanged instructions on Page 1 inside the 3D book (`1 / 10`), followed by all 18 photos in order. Supports click/touch page turning, horizontal drag-to-flip isolated from camera orbit/pan, UV photo hit-testing to open the enlarged lightbox, lazy window texture allocation with disposal when flipping away or closing, idle frame render pausing, and tightened rotated-corner `inspectionPose` framing (`src/inspection.js`) across desktop, portrait/landscape phones, tablets and 5:4 foldables. `BACK` steps cleanly from lightbox → close 3D book animation → zoomed-in closed book → previous camera view.

- **D-078 (2026-11-19) Matching armchairs in Writing & Speaking (owner request).** Replaced the left lounge chair (`tailoredArmchair`) in `Writing & Speaking` with `podcastArmchair` at `(tx - 1.0, tz - 0.15, 0.6)` to mirror the right tub chair cleanly on the rug with clearance from the fern and table, and removed the unused `tailoredArmchair` helper from `src/scene.js`.

- **D-079 (2026-11-19) Single TOS Enterprise GLB and in-room "once around the world" warp flight (owner request).** Converted Raul Mamoru's TOS Enterprise (`Enterp TOS - Arena.3DS` + TIFF maps, credited in `public/models/ATTRIBUTION.md` and discreetly in the 3D inspector) into an optimized WebP + quantized GLB at `public/models/enterprise-tos.glb` (1.2 MB, 13 meshes, ~50.8k triangles). Removed the second TNG Enterprise (`enterpriseD`) and centered the single NCC-1701 on the `About Me` shelf with lazy GLB loading (`GLTFLoader`) on entering `About Me` or opening the inspector. Added an interactive in-scene warp flight (`createRoomWarp` in `src/enterprise.js`): lifts off the shelf pedestal, sweeps across the room and diorama with banking and glowing nacelles, warps out with TOS star streaks, warps back in from the opposite side ("once around the world"), and lands back on its pedestal; cancellable via `Esc`, `Reset`, `BACK`, or room switch, with reduced-motion fallback.

- **D-080 (2026-11-19) Antique globe in the About Me bookcase (owner request).** Replace the plain sphere with a parchment globe with emerald continents, a tilted axis, a graduated brass meridian ring and a turned walnut plinth. Keep it in the lower right open shelf beside the stacked books. The map uses Natural Earth 1:110m land and lake outlines with original colors, graticule and compass ornament, baked into a single local WebP.

- **D-081 (2026-11-19) MedTech Signal document activation.** In Writing & Speaking, the first click on the document frames it and opens its card; a second click on the same document opens MedTech Signal in a new tab. The About Me social plaques keep their existing behavior.

- **D-082 (2026-11-19) Compact introductory project links.** Show each project title and its shortened description on one line where space allows, with natural wrapping on narrow screens; apply the shorter copy in both languages.

- **D-083 (2026-11-19) Museum-style project displays (owner approved).** Refine all five project plinths with rounded oak bodies, recessed dark feet, cream caps edged in brass, framed project images on visible supports and front brass title plates. Use a small selection lift and a restrained warm frame accent, with immediate state changes for reduced motion. Fit the displays within the existing gallery layout and preserve the preview, second-click external link, Coming Soon and BACK interactions.

- **D-084 (2026-11-19) Cellar fax machine: zoom first, slow sheet, button on the sheet (owner request).** Supersedes the click behaviour, the note and the note texts of D-025.
  The first click on the machine frames it (same path as objects in the rooms, seen from below so it reads upright, BACK and Reset restore the view);
  the second click starts the fax. The sheet leaves the slot slowly (7 s, a short jolt at the start, then a faint rattle). When it is out, the view moves to the sheet face-on.
  The sheet carries the text and a "Send me a message" / "Schreib mir eine Nachricht" button as a canvas texture; clicking the button opens LinkedIn in a new tab.
  The DOM note (text, LinkedIn link, close button) and its CSS are removed; the keys `model.egg.label` and `model.egg.close` are gone. New note text,
  EN "You found it! The fax device that keeps healthcare working in Germany." DE "Du hast es gefunden! Das Faxgerät, das das deutsche Gesundheitswesen am Laufen hält."
  Reduced motion: the sheet is out at once. The cellar lamp only lights when the camera is below the base. The heights of the lower base part live once in `BASE_LOW` in `src/scene.js`.
  The machine stays out of the tab order and is still not announced; the LinkedIn link exists elsewhere on the page.


- **D-085 (2026-11-19) Rule: first click on a clickable object zooms to it (owner request).** Applies to every clickable object in the model, hidden ones included.
  First click: the camera frames the object, upright; no action yet. Second click: the object's action. BACK, Reset, Escape and room changes restore the previous view and the object's start state.
  Written down in `AGENTS.md` ("Clickable objects: zoom first"). Escape now also restores the view when only the fax machine is framed (before, only the sheet was retracted).
  The cellar fax is covered by a check in `scripts/verify-viewer.mjs` (found only from below, first click frames, second starts, sheet button opens LinkedIn, close restores).

- **D-086 (2026-11-19) Cellar fax: better model, display shows RECEIVING and blinks (owner request).** The machine has rounded bodies, a two-tone shell,
  a drawer front with a brass knob on the cabinet, a larger display with function buttons and two LEDs, a coiled handset cord, a badge and paper guides.
  The display is a canvas texture with three states: READY / BEREIT (idle, green LED on), RECEIVING / EMPFANG (from the second click until the sheet is out; text and red LED blink
  about 1.4 times a second, with a progress bar and "P.1"), then 1 PAGE OK / 1 SEITE OK. Closing, Reset and Escape return it to READY. Reduced motion: no blinking, the display goes straight to the done state.
  Texts live in `model.egg.display` in `src/content.js`. The close-up of the machine frames the body, tray and sheet (not the whole cabinet), so the display stays legible. Checked in `scripts/verify-viewer.mjs`.

- **D-087 (2026-11-19) Globe is an inspectable object and plays a short theme once framed (owner request).** The antique globe in the About Me bookcase is registered as an inspection target
  (`globe`, view `GLOBE_VIEW` in `src/scene.js`), so a click frames it like the other objects and opens a card (`model.inspections.globe`).
  The first click only zooms. On the second click on the globe, a short instrumental theme plays as soon as it is loaded (owner change, same day: neither on the first click nor after the zoom has settled): 5 s to 1:05 of the owner-supplied MIDI file (John Williams, Indiana Jones theme), 60 s, with a 1.5 s fade at the end.
  This follows D-085 without exception: first click frames, second click acts. A further click on the globe while it plays stops the music and keeps the view; another click restarts it.
  It stops when the view leaves the globe (BACK, Reset, Escape, room change) and when the tab is hidden. The audio context is created inside the click (browser autoplay rule).
  Size: nothing is loaded up front. On the second globe click the page fetches `src/globe-music.js` (a Web Audio synth, 2.7 kB, 1.2 kB gzipped) and `public/audio/indy-theme.bin` (4.7 kB, 1.3 kB gzipped; 13 voices as note lists, no samples, no libraries).
  The binary was generated from the MIDI file with a throwaway script (tracks and pitches unchanged, the identical trumpet, horn and trombone lines stored once and played as one layered voice).
  Rights: the composition is protected; the owner is responsible for clearing its public use (the MIDI arrangement and this synth rendition are not a licence). Checked in `scripts/verify-viewer.mjs`.


- **D-088 (2026-11-19) Visible wall lamp in the hidden cellar (owner request).** The cellar light now has a visible source: a small brass wall lamp with a caged, self-lit bulb (toneMapped off) on the far wall of the recess. The point light sits just in front of it and still only lights when the model is seen from below. It flickers by about 3 % (steady in reduced motion) and dips slightly in time with the display blink while the fax receives. Still one light only, no shadows, for mobile performance.
- **D-089 (2026-11-19) Operating light lights the table (owner request).** The primary wing of the ceiling-suspended surgical light now carries one SpotLight aimed at the operating table (cone 0.62 rad, soft edge, range 3.2); its intensity follows the room glow in `viewer.js` (11 at full, 0 when the room is not lit). The lenses, a lit diffuser disc under each head and a luminous rim ring on both wings are self-lit and not tone-mapped (near white), so the heads read as lit from any side. Only one light was added; no shadows, for mobile performance. Frame rate on weak phones is not measured.
  Structure update (same day, owner request): each head has a lathed dome hood with 16 vent slots and a rating plate, a dark reflector with three rings of small LED lenses (6 / 12 / 18, one InstancedMesh draw call per head), a luminous rim ring, a central aiming handle (steel grip ring, petrol cap) and a yoke on top; the arms got steel joint balls at hub and elbow.

- **D-090 (2026-11-19) Calmer, anchored object labels (owner request).** Hotspot labels now carry an anchor mark: a small petrol dot on the object and a thin line to the label (inline SVG inside each `.spot`, aria-hidden, so visibility and links are unchanged). Labels are quieter (78 % paper, hairline inset ring, weight 500) and all use petrol; "soon" labels are only slightly lighter. Placement tries the spot just above the anchor first, then other rows and sideways offsets, so labels dodge each other and stay close instead of drifting in a staircase. Not done on purpose: dot-only markers on phones and per-type icons.

- **D-091 (2026-11-19) Sound for the Enterprise warp flight (owner request).** Two short sounds accompany the in-room flight: a departure sound that starts with the flight and peaks at the jump (about 3.5 to 4.5 s), and an arrival sound that starts at 3.7 s, when the ship drops out of warp, and rings out over the landing and is faded out to be silent at 7.5 s, when the ship has landed (the sound itself is 7 s long and would otherwise ring on about 1.5 s after the landing). `src/warp-sound.js` schedules both against the page clock, so a late decode joins at the position the sounds would have reached.
  Loading: nothing at page load. The module and the two files (`public/audio/start.mp3`, `landing.mp3`, 223 KB together, 112 kbps) are fetched when the Enterprise card opens, at the latest when "Engage Warp" is pressed. The AudioContext is created inside that click (browser autoplay rule). The sound stops on BACK, reset, room change and tab hide; with reduced motion there is no flight and no sound.
  Rights: the two sounds were supplied by the owner and are third-party material (Star Trek); their public use is the owner's responsibility to clear. Renaming the files does not change that. Checked in `scripts/verify-viewer.mjs`.

- **D-092 (2026-11-19) Operating table rebuilt as a universal surgical table (owner request).** The table is now built from separate sections: head rest, back section, torso/seat, two leg boards with a gap, two foot pieces; each is a rounded pad on a steel tray with a hinge pin and accessory side rails, hinged at slight angles (head end raised, legs and feet lowered). Below: a frame with two longitudinal guide rails, a three-stage telescopic column with collars and bellows rings, a covered base on four rubber pads with a foot pedal bar. Under each leg board runs a guide rail with a locking carriage for the foot piece. Accessories: an anaesthesia screen on the back rails, an arm board clamped to the +z rail, a hand control hanging from the rail with its cord to the base. The torso top is unchanged (y 0.575) so the endoscope and the drape stay where they were. Pads are muted teal. Roughly 130 meshes, no textures.

- **D-093 (2026-11-20) No floating labels for the operating table and the digital workspace (owner request).** Both stay clickable inspection objects with their cards, but no longer carry an always-visible hotspot label (`furniture` flag off in `src/scene.js`). The labels covered the room's lettering and the objects; the AI room keeps the project labels (Wimmelbild, AI in Medicine Monitor, Digital workflows).

- **D-094 (2026-11-20) Project labels above the frames (owner request).** In the Projects room the labels stand above each picture frame, and the anchor dot sits at the middle of the frame's top edge (y 1.10, `LAY.projects.frameTop`), so the picture stays free. Labels of this room never move below their anchor; neighbours alternate between two rows so no line runs through another label. Other rooms keep the old placement.

- **D-095 (2026-11-20) Curated books as structured content (owner request).** Store the 21 selected books in `src/data/books.json`, with English-language editions/titles only. Seven books belong to Writing & Speaking; fourteen belong to About Me, including `The Wright Brothers` by David McCullough lying flat next to the antique globe. Use semantic placements independent of world coordinates. Reserve exact edition ISBN-13, verified Amazon URL, approved cover and owner-authored personal notes as nullable metadata. Exclude `Aftershocks`, `Nexus`, `Civilization: The West and the Rest`, and `Dungeon Crawler Carl`. This is content documentation, not authorization to modify the current 3D scene: later integration must respect zoom-first interaction and the current globe position. See `docs/books.md`.

- **D-096 (2026-11-20) English-edition jackets for 21 3D books (owner request).** The 21 catalog entries now contain researched English-edition ISBN-13s and Open Library front-cover preview URLs, with links to edition sources. `src/book-jackets.js` creates textured front, back and spine surfaces; Open Library front previews are requested lazily when someone enters the About Me or Writing & Speaking room, and a generated front remains if a preview fails. Back and spine are labelled **reconstructions**, not original publisher artwork; optional `backImage`/`spineImage` fields can hold approved genuine images later. `scene.js` now maps catalog entries to the existing 20 shelf positions and adds The Wright Brothers flat next to the globe on its actual open shelf. Per-book click cards, Amazon destinations, personal notes and edition-by-edition visual verification remain open; see `docs/books.md`. A browser privacy review for external preview image requests is also open.

- **D-097 (2026-11-20) Remove and inspect books, with neutral English descriptions (owner request).** All 21 curated books are clickable as individual Three.js meshes. First click frames the real book with the existing object-inspection camera; second click lifts the physical mesh and reveals its English front cover. A restrained paper-glass card uses the existing palette and tokens (86% warm paper, 10px blur, 6px radius) and contains title, author and a brief publisher-derived English synopsis. Cover/Spine/Back controls rotate the actual mesh; Return to shelf, BACK, Escape, Reset and room changes restore it; reduced-motion is supported. The book titles and synopses remain English in both language settings. Gilles's personal commentary is reserved but not shown. Do not invent his endorsements, and do not show Amazon links until edition-specific URLs are available. Writing style source: the owner's `writing_style_substack.md` and `gilles-wortliste-substack-2026.md` on Google Drive. `scripts/verify-viewer.mjs` now checks book interaction and CI runs token, model and scene tests before deployment. No claim of visual approval of every cover or runtime rendering in a real browser.

- **D-098 (2026-11-20) Pull a book fully out of the shelf before showing its cover (owner request).** The second book click now slides the physical mesh forward beyond the cabinet front, adds a small hand-like lift, and only then turns its cover toward the camera. `src/book-interaction.js` keeps the pull direction stable for that extraction, reverses the sequence on return, and preserves each book's original placement and tilt. `src/viewer.js` reframes around the *presented* position with a safe minimum camera distance so neither the cabinet nor the close-up camera hides/crops the opened cover. New tests in `scripts/verify-viewer.mjs` verify lying/standing/leaning books, clearance, framing and restoration. No CSS or design-token changes.

- **D-099 (2026-11-20) Four-step click cycle for extracted books (owner request).** Preserve zoom-first entry as the initial click. Once framed, four consecutive clicks on the book must do exactly: **(1) lift it and present Cover, (2) present Spine, (3) present Back, (4) return the book to its original shelf pose and restore the pre-inspection view**. Thus the return is click 5 when also counting the initial framing click. The Back-to-Cover loop is intentionally removed. Manual Cover/Spine/Back controls remain available; further physical clicks follow the currently displayed face and return from Back. Return, BACK, Escape, Reset and room switches remain independent exit paths. No CSS changes. `scripts/verify-viewer.mjs` asserts the sequence, return, and clean restart.

- **D-100 (2026-11-20) Progressive local book-cover loading (owner request; implementation under review).** Retain the D-097–D-099 interactions. Show a generated jacket immediately; do not load cover files on overview. On room entry request only that room's small local WebP images; on extraction request only that book's large image, retaining the small or fallback while pending or on failure. Keep large textures in a two-item bounded cache. Record each edition, source, image review and rights separately in the book catalog; document AI repairs as altered. Small and large targets are at most 256 × 384 and 512 × 768 pixels. The owner's screenshots exclude Nexus, Civilization, Aftershocks and Dungeon Crawler Carl, which remain excluded. Publication and full desktop/mobile visual checks are not established by the automated tests.


- **D-101 (2026-11-20) Local coverage for all 21 books.** Store 13 edition-matched front images and eight explicitly labelled AI-retouched user-supplied reconstructions as local WebP pairs. Preserve original dimensions when sources are small; review provenance, quality and underlying usage rights separately. The We Are Legion image differs from the listed ISBN edition and remains marked unverified. No remote image fallback is used.

- **D-102 (2026-11-20) Higher-resolution owner-selected cover editions.** Replace the low-resolution Sapiens, Autocracy, Inc. and Everything Is Tuberculosis fronts with unaltered higher-resolution originals visually matching Gilles’s screenshots. Record actual sources and update the Sapiens and Autocracy ISBNs to their matching English editions. Preserve local WebP loading and source aspect ratios.

- **D-103 (2026-11-20) Writing shelf placement and book backs.** Place Everything Is Tuberculosis separately next to the Writing & Speaking book stack. Keep the backs of horizontal books upright when turned to the viewer.

- **D-104 (2026-11-20) Four additional books and leaning book.** Place Bloodlands by Timothy Snyder in About Me; place Guns, Germs, and Steel, Predictably Irrational, and The Innovator’s Dilemma in Writing & Speaking. Project Hail Mary leans against the neighboring books.

- **D-105 (2026-11-20) AlphaFold and article in Writing & Speaking.** Add a protein sculpture on the shelf with short comments on AlphaFold2, 260 million predictions, the historical time needed for structure determination, and the 2024 Nobel Prize. The sculpture is an illustration derived from experimental PDB 1A8O, not an AlphaFold prediction. Place a newspaper in the free shelf compartment linking directly to the latest article known from the approved monitor snapshot, Can AI See Death in Your Eyes? (2026-11-06). Substack archive was unreachable when checked; recency is not independently confirmed. Sources: https://alphafold.ebi.ac.uk/ and https://www.nobelprize.org/prizes/chemistry/2024/summary/ and https://www.rcsb.org/structure/1A8O.

- **D-106 (2026-11-21) Indiana-Jones-style flight route across the antique globe (`src/globe-flight.js`, owner request).** When the globe theme starts (second click on the framed globe, D-087), a tiny stylized 1930s propeller plane flies Malta → Porto → Hamburg → Yerevan → Cairo across the stationary globe in the existing `GLOBE_VIEW` framing (no globe rotation, no extra zoom, no pins, no city labels). Malta (and Gozo) are added directly onto the globe surface at exact WGS-84 coordinates (`35.90°N, 14.51°E`) since Natural Earth 1:110m omits them. A muted map-red great-circle tube draws live behind the plane with a subtle ground shadow. Stops and resets cleanly with `stopGlobeMusic()`; under `prefers-reduced-motion`, shows the completed route statically while the theme plays.

- **D-106 (2026-11-21) Compact hero with inline project links.** Replace the second hero paragraph with the owner's German copy and a compact English equivalent. Link the monitor, Wimmel Book and newsletter in the paragraph and remove the three separate hero rows. The owner explicitly specified the inline link color, highlight, underline, spacing, radius and hover behavior, including exceptions to the token scale; keep the other token checks intact.

- **D-107 (2026-11-21) Broadsheet newspaper front page for `latestArticle` in Writing & Speaking (owner request).** Rebuilt `articlePaper()` in `src/scene.js` as a single broadsheet newspaper front page (`0.330 × 0.226` over thin offset newsprint sheets with a subtle horizontal paper fold, removing the hardcover book backing, bar chart, and invented captions/subheadings) rendered at `1024 × 700` with `MEDTECH SIGNAL`, `6 NOV 2026`, `GILLES PENNING`, the real headline (`Can AI See Death in Your Eyes?`), real summary lead, Gilles Penning's real 3-face heatmap graphic (`public/models/article-death-eyes.webp`), and abstract multi-column newsprint lines. Removed the external floating hover tooltip over `latestArticle` in `src/viewer.js` while keeping first-click zoom framing and second-click direct opening of the Substack article in a new tab.

- **D-108 (2026-11-21) Five latest Substack issues on Writing & Speaking shelf and 5-day refresh cadence (owner request).** Generalized `articlePaper()` (`0.258 × 0.194`, `1024 × 768` broadsheet front page with wrapped headlines/subtitles and aspect-preserving `contain` hero art) and added the 4 preceding Substack posts alongside `Can AI See Death in Your Eyes?` across the `y = 0.705` shelf bay in `Writing & Speaking` (`src/data/substack-articles.json`, `public/models/article-*.webp`): *Die langweilige AI-Revolution*, *The heart has a blue screen of death. AI learns to predict it.*, *Health-Daten: Mitten im medizinischen Souveränitätsverlust*, and *KI-Diagnostik hat ein Problem mit dem realen Leben*. All 5 suppress external hover labels, frame first on click (D-085), and open their respective Substack post directly in a new tab on second click. Documented the recurring 5-day Substack feed check (`https://medtechsignal.substack.com/feed`) in `TODO.md` and `AGENTS.md`.

- **D-109 (2026-11-21) Left/Right cursor navigation & hero intro containment (owner request).** Added `ArrowLeft` / `ArrowRight` item-stepping in `src/viewer.js` when inspecting any of the 5 Substack newspapers (`Writing & Speaking`), any of the 25 curated bookshelf books (`About Me` & `Writing & Speaking`, ordered left-to-right per horizontal shelf tier from world geometry, preserving both framed and extracted states including D-097/D-100), or any of the 5 project displays (`Projects` room). Replaced focus targets cleanly inside the active inspection without stacking `BACK` history entries, cleared stale hover tooltips (`hoverTarget`/`hoverTip`) when stepping, and preserved album page turning, dialog modals, form inputs, `Shift+Arrow` panning, and unfocused stage orbit. Fixed desktop hero `.intro` text overflow past `--scene-surface` in `src/style.css` by widening the desktop intro column to `min(calc(var(--s7) * 4), 44%)` (using `--t4` heading size below `1024px`), locking `.intro` (`grid-template-columns: minmax(0, 1fr)`) and its direct children strictly to `.intro`'s inner box width, and joining `↗` with a non-breaking space in inline project links.

- **D-110 (2026-11-21) Suppress blue stage focus frame during arrow/Escape switching (owner request).** Root cause: `src/main.js` added `.keyboard-navigation` to `<html>` on every non-modifier `keydown`, causing `.keyboard-navigation .stage:focus-visible` to draw the 1 px blue (`--brass`) outline around `.stage` whenever a visitor clicked into the 3D scene and pressed arrow keys or `Escape`. Fixed permanently across `src/main.js`, `src/style.css`, `AGENTS.md`, and `DESIGN.md`: only `Tab` sets `.keyboard-navigation`, `pointerdown` and in-scene `Arrow*`/`Escape` keys clear it, `.stage:focus, .stage:focus-visible` has `outline: none`, and the 1 px stage hairline applies strictly to `.keyboard-navigation .stage:not(.object-focused):focus-visible` while leaving button/link focus rings intact.

- **D-095 (2026-11-21) Photo album taps on phones (owner report).** Taps on album photos were lost on phones: the stage allowed vertical page scroll (`touch-action: pan-y`), so a slightly sliding finger made the browser take over and cancel the pointer, and the click was dropped. While the album is open the stage now carries `.album-open` with `touch-action: none`; the tap tolerance for touch is 10 px (mouse stays 5 px). Not done on purpose: widening the photo hit area to the page half, and the edge-only page turn. Not tested on a real phone.

- **D-111 (2026-11-22) Pan leash and "Overview" label (owner decision).** Visitors could push the model completely out of view by accident (right/middle/modifier drag, "Move" mode, horizontal trackpad swipe, two-finger pinch drift), because the pan target was only clamped to ±14 world units. Now the point the camera aims at stays over the model: over the base plate in the overview, over the room floor plus 0.35 in a room. The allowed area shrinks by half the visible height around the target, so from afar most of the model stays in the picture and close up every corner can still be centred. Drag, pinch and trackpad pans meet growing resistance past the edge (at most 0.6 beyond it) and glide back when the gesture ends (trackpad: 180 ms after the last swipe; reduced motion: jump). Keyboard pans stop at the edge. Orbit stays free everywhere (D-024), rooms are not locked, zoom limits, the cellar drift and BACK (D-074) are unchanged; the spring-back creates no history step. The control "All rooms" is renamed "Overview" / "Übersicht" (key `ui.allRooms` unchanged). Bug fix in the same change (owner report): the cellar drift in `aim()` (zoomed in and seen from below, the orbit centre slides to the fax) now applies only in the overview; before, a short upward drag while close to the Enterprise or another object in a room flipped the view and jumped to the fax. Owner rejected: a floor-plan minimap, a breadcrumb trail, changing BACK, locks on room turning sideways or on panning beyond the leash (the room tilt limit came later, see D-112). Covered by the pan-leash check in `scripts/verify-viewer.mjs` (all rooms and overview, rubber band, spring-back, keyboard, every inspection pose inside the leash).

- **D-112 (2026-11-22) Room tilt limit: no turning under the floor in a room (owner decision).** Owner report: close to the Enterprise a short upward drag flipped the view upside down. In a room the camera tilt now stays between 0.15 and 1.45 rad (about 9° to 83°), so the camera stays above the floor and does not tip over the top. Dragging past the limit meets growing resistance within a 0.12 rad band that still stays above the floor, and springs back when the gesture ends (reduced motion: jump); keyboard turns stop at the limit. Turning sideways in a room stays free. The overview keeps free rotation all the way round (D-024), so the cellar fax stays findable only there (D-025, D-084). All object close-ups use tilts between 0.22 and 0.86 rad and are unaffected. Covered in `scripts/verify-viewer.mjs` (Enterprise close-up drag and spring-back, keyboard limits, free overview).

### Owner navigation decisions, 2026-11-22 (summary)
- Keep: BACK exactly as it is (D-074), free rotation in the overview (D-024), the hidden cellar (D-025).
- Change: pan leash keeps the model in view (D-111); "All rooms" is now "Overview" / "Übersicht" (D-111); no turning under the floor or over the top inside rooms (D-112); the cellar pull no longer acts inside rooms (bug fix in D-111).
- Not wanted: floor-plan minimap, breadcrumb trail, room locks for turning sideways, different trackpad or pinch gestures.
