# AGENTS.md - Instructions for AI collaborators
Version: 0.1 | Date: 2026-11-16

## Shared GP corporate identity - mandatory for visual work (2026-11-20)

Before changing any visual UI, image, chart, animation, or Three.js material, read this committed cross-project bundle:
- [CI visual guide](docs/brand/GP_CI_Master_2026.md) - approved common direction and explicit current/proposed distinctions.
- [AI-readable design tokens](docs/brand/GP_CI_Tokens_2026.json) - semantic values and site variants.
- [CSS tokens reference](docs/brand/GP_CI_Tokens_2026.css) - reference only; **not** an automatic import or blanket replacement.
- [Three-site illustration](docs/brand/GP_CI_Visual_Overview_2026.png) and [glass comparison](docs/brand/GP_CI_Glass_Comparison_2026.png) - schematic design references, not live screenshots.

Apply the common editorial identity (warm paper #F7F6F2, Prussian blue #1E3A8A, ink #18181B, Source Serif 4 / Source Sans 3). This site is the warm editorial + handcrafted Three.js expression: physical sage, oak, glass, petrol and brass are *material* colors, not second web UI accent colors. Keep sophisticated, restrained glass; the Wimmelbild explicitly permits much stronger glass without exporting that treatment here.

Existing local constraints still matter: follow this repository's `DESIGN.md`, `src/tokens.css`, `docs/decisions.md`, owner-approved visuals and interactions, no off-scale tokens, accessibility and performance requirements. If a shared token disagrees with current production code, record the difference as a proposed migration and do not silently change live behavior. In particular, legacy `--teal` / `--brass` aliases currently refer to blue; rename only as part of an intentional verified migration. Never replace the four-room scene or approved artwork merely for consistency. Treat common CI as an instruction for future work, not as authorization to redesign immediately.


## Mission
Build and maintain the personal landing page of Gilles Penning at `gillespenning.com`.
It is an orientation layer above his projects and a portfolio that makes visitors
curious about the person. It serves four goals at once:

1. Reference for job applications.
2. Speaker bookings.
3. Positioning as an expert.
4. Promotion of his projects.

## Status
Draft phase, publishing prepared. A first version of the home page exists on the branch `draft/four-room-home`
(Vite and Three.js, four-room model). Direction, projects and confirmed links are in
`docs/decisions.md`. `PRODUCT.md` has not been written yet.

## Read before work
1. This file.
2. `docs/decisions.md` - dated owner decisions and open questions. Decisions there are binding.
3. `TODO.md` - active backlog.
4. `DESIGN.md` - palette, fonts and image slots.
5. `docs/design-review.md` - latest design review with open points.
6. `PRODUCT.md` - who the page is for and what it must do (does not exist yet, see Design tooling).

## Projects the page presents
- **AI in Medicine Monitor** - live at `https://ai.gillespenning.com`, repository
  `gilles-pe/ai-in-medicine-monitor`. It has its own strict evidence rules. This page
  links to it and may quote it, but never restates or re-interprets its evidence.
  Any quantified claim about medical AI links to the monitor or the original source.
- **Wimmelbild** - live at `https://wimmelbild.gillespenning.com/en/`.
- **Elbstrand** - linked to `https://penning.info/` (D-027). **DocEase** - "Coming soon", no link until the owner supplies one.

## Design constraints - binding (owner decision 2026-11-16)
The owner wants a small, fixed set of sizes so the page stays consistent over time.
The limits on the number of steps are decided. The exact values are provisional until
the visual direction is set, and are then recorded in `DESIGN.md`.

| Scale | Limit | Provisional values |
|---|---|---|
| Spacing | 7 steps | 4, 8, 16, 24, 40, 64, 104 px |
| Corner radii | 3 steps | 0, 6 px, full (pill) |
| Control heights | 3 steps | 32, 40, 48 px |
| Font sizes | 6 steps | 14, 16, 20, 28, 40, 64 px |
| Font families | 2 | undecided |
| Colours | 1 accent plus neutrals, each with a light and a dark variant | undecided |
| Shadows | 1 step at most | undecided |

Rules:
- Every value lives once, as a CSS custom property in a single token file.
- Components use tokens only. No raw pixel, colour or radius values in component code.
- No in-between values. If a layout seems to need one, change the layout.
- Adding, removing or changing a step needs an owner decision logged in `docs/decisions.md`.
- `npm run check` (`scripts/check-tokens.mjs`) fails on off-scale values in `src/style.css`. Run it before declaring
  work ready. Its documented exceptions (0, 1px and 2px hairlines) are listed at the top of the script.

## Design tooling - Impeccable
The Impeccable design skill is vendored in `.claude/skills/impeccable/` with its
subagents in `.claude/agents/` (skill version 4.9.2, upstream commit `d41d986`,
Apache 2.0, see `LICENSE` and `NOTICE.md` in the skill folder). Use `/impeccable` for
design, critique, audit and polish work.

- `PRODUCT.md` is written through the `/impeccable init` interview with the owner.
  Do not write it from assumptions.
- `DESIGN.md` is written when the visual direction is established. It must stay inside
  the limits in the table above.
- The skill's launcher downloads a prebuilt engine binary from the Impeccable GitHub
  releases on first use and verifies it against `scripts/engine-checksums.txt`.
- The automatic design hook (runs that engine after every edit) is **not** enabled.
  Enabling it is an owner decision. Do not add hooks to `.claude/settings.json` without it.
- Do not edit the vendored skill files. To upgrade, replace the folder from upstream
  and record the new version and commit here.

## Operating rules
- **Quick Prototyping & Dialog first (owner rule 2026-11-23):** For visual, animation, camera, or UX work, align briefly with the owner first and prototype directly on the live dev server (`localhost:5173`) without running browser subagents, full test suites, builds, or `docs/decisions.md` updates. Only run tests, builds, and documentation once the owner has inspected and approved the prototype.
- Plan before building. Never program or redesign unless asked.
- Never invent facts about the owner: positions, employers, degrees, talks, clients,
  testimonials, press, logos, numbers or dates. If it is not supplied by the owner, ask.
- Publish only contact details and personal information the owner has approved for this page.
- Keep content (texts, projects, talks) separate from code, so the owner can edit it
  without programming.
- Avoid exaggerated claims. The tone is credible and concrete, like the monitor.
- Log every owner decision in `docs/decisions.md` with its date. Never infer approval
  from silence.

## Image slots
- Pictures in the 3D model are swapped only by slot filename: put `public/slots/<slot>.webp` in place. Never edit image code for a content swap.
- Slot names, aspect ratios and minimum sizes are listed in `DESIGN.md` and in `public/slots/README.md`.
- A new picture surface needs a row in `DESIGN.md` and an entry in the `SLOTS` table in `src/scene.js`.

## Structured data (JSON-LD) - Search Console rules (2026-11-23)
`index.html` carries JSON-LD (Person, WebSite). Search Console flagged the monitor's news markup (`ai.gillespenning.com`) for dates without a time zone and authors without a url. Apply the same rules here whenever JSON-LD is added or changed: every `datePublished` / `dateModified` is a full ISO 8601 datetime with a time zone (`2026-11-21T00:00:00+01:00`, never a bare date, never an invented time); every `author` / `publisher` person has `name` and `url` or an `@id` that resolves to such a node. Re-test in Google's Rich Results Test after a deploy.

## Hosting and domain
`gillespenning.com` is reserved for this site. The monitor stays on the subdomain
`ai.gillespenning.com` and must keep working.

- Stack: Vite and Three.js, static build into `dist/` (`npm run build`).
- Target: GitHub Pages, deployed by `.github/workflows/pages.yml` on push to `main` (and manual dispatch).
  `public/CNAME` holds the domain. Nothing is live until the owner enables Pages (source "GitHub Actions") and merges to `main`.
- The domain switch (DNS of `gillespenning.com`) is an owner step and must not touch `ai.gillespenning.com`.
- No analytics, no cookies, no external fonts or scripts. The page stores only the language choice and loads the news list
  from `ai.gillespenning.com` (see D-020). The legal page `legal.html` carries the owner-supplied imprint and privacy text (D-028).

## Direct room links
The canonical links use URL fragments `#projects`, `#about`, `#ai` and `#writing`. Opening one on initial load must wait for the viewer and open that room and its details. If WebGL cannot load, reveal and scroll to the corresponding ordinary text section. Without JavaScript, the ordinary fragment targets must remain available.

Selecting a room updates the fragment with a history entry. Overview (formerly All rooms) clears the fragment while keeping query parameters, including `lang`. Browser back/forward and direct hash changes restore the matching room or overview without creating additional entries. Ignore unknown fragments so unrelated anchors remain usable. Language changes and re-rendering must not create room history entries. Keep mobile room navigation and the existing transparent scene surfaces.

## Object inspection and zoom (D-071)
Mouse wheel zooms only over the clear interactive stage, even when the page is scrollable. Preserve browser Ctrl/Meta-wheel zoom and normal page scrolling outside that region. The quiet toolbar slider, +/- buttons, keyboard +/- and touch pinch must share one bounded logarithmic zoom state. Keep the slider labelled in both languages and retain 48 px touch heights. Home, 0 or T on the focused stage resets the current room view.

Clicking an inspectable object opens its card and smoothly frames the actual geometry above that card, entering its room first if necessary. Register furniture and per-object viewing angles in `src/scene.js`; keep fitting and zoom mapping in `src/inspection.js`. Do not substitute invisible furniture hit boxes, hide walls, or remove room surfaces to achieve a close-up. Specific album, photo, laptop, social and miniature actions take precedence over containing furniture. External destinations require a deliberate card action. Inspection cards persist until dismissed. Save the incoming camera view and restore it on close; Reset or a room change discards the inspection. Reframe on resize or language changes, and jump without animation under reduced motion.

Keep the continuous translucent scene required by D-068. **Stage focus outline rule (D-110):** Never add `keyboard-navigation` to `<html>` on all non-modifier `keydown` events; only `Tab` may add it, while `pointerdown` and in-scene `ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown`/`Escape` keys must clear it. Keep `.stage:focus, .stage:focus-visible { outline: none; }` and restrict the 1 px stage hairline strictly to `.keyboard-navigation .stage:not(.object-focused):focus-visible` so switching articles, books, or projects never draws a blue frame around the 3D scene. Do not remove keyboard focus indicators from controls. Run `npm run check`, `npm run test:inspection` and `npm run build` after camera or zoom changes. The geometry/DOM harness does not replace visual browser checks.

## Clickable objects: zoom first (D-085)
This is a rule for every object in the 3D model that can be clicked, including hidden ones such as the cellar fax machine and anything added later.
- First click: the camera glides to the object and frames its real geometry (see D-071), seen so that it reads upright. Nothing else happens yet: no external link, no animation, no state change.
- Second click: the object's action (card link, album, fax feed, external link). A multi-step object may move the framing on at the end of its action (the fax frames its sheet when it is out), and controls drawn on the object itself (the fax sheet button) act on one click once the object is framed.
- BACK, Reset, Escape and a room change restore the view from before the first click and reset the object to its start state.
- Reduced motion: jump without animation, same order of steps.
- Register the framing in the same path as other objects (`focusObject` in `src/viewer.js`, `inspectionTargets` or a target like `faxTarget`), add a check to `scripts/verify-viewer.mjs`, and run `npm run test:inspection`.

## About laptop and mobile view controls (D-072)
The About laptop opens a short leadership card; its internal More details action opens the existing leadership section, never a direct external link. Project cards with external destinations have a subtle right arrow, with none for coming-soon items. Keep the toolbar on one row on wider displays when it fits, including unfolded foldables, and use a second row on narrow screens. Overview remains accessible while a room is selected; do not close a room on blank scene taps. The supplied Wimmelbild artwork belongs in the existing `projects-board-1.webp` slot without cropping.

## Album arrival and BACK (D-074)
The initial album click must frame the physical album before opening the book; only a subsequent deliberate photo click opens the lightbox. Clear lightbox state on every entry, block click-through from the opening pointer gesture, and cancel delayed opening on room changes, Reset or BACK. The translucent top-right BACK control restores prior room/object/camera views. Group wheel, slider, pinch and drag events into useful steps, cap the local history, and do not record history while restoring it. Album BACK returns from photo to book, book to scene, then previous camera views. Preserve Overview, Reset, URL room synchronization and reduced motion. Validate with the inspection harness and build.

## External links and projects (D-076)
External HTTP(S) destinations open in a new tab with a focus request; browsers may control focus. Internal navigation remains in-page. A project object first opens its card; another click on that same project opens its external destination. A destination-less project never navigates and instead displays the Coming Soon badge over the image. The About Me social plaques (`substack`, `bluesky`, `linkedin`) also open on a second click, requesting a background tab (`{ background: true }`, D-117). Do not apply this two-click rule to furniture.


## Curated book interaction (D-097)
- The 27 English-edition books live in src/data/books.json; keep titles, synopsis sources and placements in data.
- Book meshes use src/book-jackets.js; src/book-interaction.js animates removal and rotation. The very first scene click only frames the book. Subsequent clicks on that same book follow **1 Cover (lift), 2 Spine, 3 Back, 4 return to shelf**. Never cycle Back to Cover on the fourth interaction. No card is shown for books (D-114): the book itself is the interface; Enter on the focused stage does the same as a click, a visually hidden status names the book and face for screen readers, and BACK / Escape / Reset / room changes restore it. Test the whole sequence and a fresh restart after returning.
- Synopses are short, neutral, in English, sourced from published book descriptions. No invented owner endorsements. Owner-approved bilingual personalNote text appears on the physical back in the selected website language (D-124); never use a summary as a personal endorsement.
- Do not add a book card or book buttons back without an owner decision (D-114). Synopses stay in the data for later use.
- Run npm run check:books, npm run check, npm run test:inspection, and npm run build. Keep the album, globe, photo and Enterprise interactions intact.

## Progressive book covers (owner request 2026-11-20; D-100)
Read docs/books.md before changing jackets. Use edition-correct English front art only when its provenance and intended reuse are recorded; identify AI-retouched user images as altered. Overview loads no cover files; entering a room loads only its small local WebP files, and extracting one book loads only its large version. Preserve the generated fallback, small-to-large race handling, bounded GPU cache, the D-097–D-099 interaction contract and all exit paths. Validate the cover files and run all four book/viewer/build checks; the harness does not replace desktop/mobile visual verification. Do not present unresolved source rights as verified.

## Image and texture changes: check every orientation (owner request 2026-11-23, D-115)
Whenever pictures, textures or jacket faces change (covers, spines, backs, slots, canvas textures, BoxGeometry materials, camera framing of objects), check **every** way the object appears, not only the one you were looking at:
- Books come in three placements: `upright`, `leaning` and `horizontal` (lying). A lying book has its cover on +Y, back on -Y and its spine on the long left edge (-X); the short ends are plain paper. Upright and leaning books have the cover on +X, back on -X and the spine on +Z. `makeMaterials()` in `src/book-jackets.js` and `normalAndUp()` in `src/book-interaction.js` must always change together.
- BoxGeometry face order is +X, -X, +Y, -Y, +Z, -Z, and each face has its own texture direction. Check which face is really shown, that the lettering is upright and not mirrored, and that the texture aspect fits the face (a tall spine texture on a wide face looks squashed).
- Look at the result in a real browser for the whole click sequence of each placement (frame, cover, spine, back, return) and from at least two camera angles. The headless harness does not drive the turn animation; `scripts/verify-viewer.mjs` therefore calls `bookUI.update()` itself. Extend its checks (section 7, lying books) when a placement or face changes.

## Substack newspaper shelf (D-108)
- The 5 latest Substack issues from `https://medtechsignal.substack.com/feed` live as structured data in `src/data/substack-articles.json`, rendered as broadsheet front pages on the `Writing & Speaking` shelf (`y = 0.705`) with local WebP graphics in `public/models/article-*.webp`.
- **5-day refresh cadence:** Every 5 days, check `https://medtechsignal.substack.com/feed` for new posts. If a new post is published, save its graphic locally (`public/models/article-*.webp`, 768px wide, quality 82), shift/update the 5 entries in `src/data/substack-articles.json` (keeping `key: "latestArticle"` on index 0), and update `lastChecked` and `TODO.md`.
- Keep all 5 newspapers free of external floating hover labels; preserve zoom-first framing on first click and direct new-tab opening (`_blank`) on second click.

## Personal reading notes (D-124, owner instruction 2026-11-23)
- Develop each new personal book description together with Gilles, one book at a time. Use short personal wording in his language, never generic reviews or marketing copy.
- Present both German and English versions. Save and publish only after explicit approval. Never independently rewrite already approved text.
- Keep neutral sourced `summary` and personal `personalNote.en` / `personalNote.de` separate. Missing facts or translations stay null; do not invent them.
- Maintain structured title, author, ISBN, English cover, spine, back, placement/location, Amazon link, neutral summary and personal note for every book over time.
- After every update test the actual representation, both languages and desktop/mobile, including all affected placements and the complete book sequence. Run the book, token, viewer and build checks.

## Amazon links and personal book backs (owner instruction 2026-11-24)
When a book has a verified `amazonUrl`, show the clickable line “Book on Amazon” on its physical back in both languages. Open the HTTPS destination in a new tab; provide keyboard access. Only the link area opens Amazon; tapping the rest of the back keeps the normal return-to-shelf behavior. Apply to future books, including books without personal notes and all orientations; do not invent URLs. Prefer the exact link supplied by Gilles. If none is supplied, research the correct English edition and its Amazon ASIN, verify the product destination, and build a link using his supplied tracking ID `aiinmedicine-21`; leave unknown/unverified links empty. Disclose affiliate links and account status as required by Amazon; check that a link's edition matches the catalog and flag discrepancies. Test on desktop and mobile. Remove the visible personal-reading-note heading from personal backs while retaining the exact approved text.
