# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary visitors: clinicians, MedTech and digital health peers, healthcare decision-makers, conference organizers, and recruiters exploring Gilles Penning’s clinical AI and connected-care projects and domain expertise.

## Product Purpose

Personal orientation layer and interactive four-room portfolio at `gillespenning.com`. Primary focus (per owner decision D-034): promoting flagship projects (`AI in Medicine Monitor` at `https://ai.gillespenning.com/` and `Wimmelbild` at `https://wimmelbild.gillespenning.com/en/`) and positioning Gilles Penning as an expert in MedTech, clinical AI, and digital health, while also serving speaker bookings and career reference.

## Positioning

Interactive Three.js four-room architectural floor-plan model (`Projects`, `About Me`, `AI & Digital Health`, `Writing & Speaking`) paired with evidence-first clinical AI and digital health projects (`AI in Medicine Monitor`, `Wimmelbild`, `Praxisfaden`, `Elbstrand`) and bilingual (EN/DE) editorial clarity.

## Operating Context

Static Vite and Three.js build deployed to GitHub Pages (`gillespenning.com`), strict zero-tracking privacy (no analytics, no cookies, no external fonts or scripts; stores only the `localStorage` language choice and loads the live news list from `ai.gillespenning.com`), and strict design token scales enforced by `npm run check` (`scripts/check-tokens.mjs`).

## Capabilities and Constraints

- Four interactive 3D rooms (`Projects`, `About Me`, `AI & Digital Health`, `Writing & Speaking`) plus full HTML and keyboard fallback (`#source`) and phone dock.
- Translucent fixed-position pop-up cards (`.pop-card`, `.photo-card`) for projects, social profiles (LinkedIn, Bluesky, MedTech Signal / Substack), personal story, and running photo.
- Slot-based picture swapping via `public/slots/*.webp` without changing scene logic.
- Strict `AI in Medicine Monitor` evidence rule: this site links to and may quote `https://ai.gillespenning.com`, never restating or re-interpreting its underlying evidence independently.
- `Praxisfaden` remains marked `"Coming soon"` with no external destination until supplied by the owner.

## Brand Commitments

- Credible, concrete, unexaggerated editorial tone matching `ai.gillespenning.com`.
- Architectural warm cream/paper/petrol/brass visual system defined once in `src/tokens.css` and documented in `DESIGN.md`, set in self-hosted `Newsreader Variable` (`--font`).
- Never invent facts about the owner: positions, employers, degrees, talks, clients, testimonials, press, logos, numbers, or dates must come from the owner.

## Evidence on Hand

- Confirmed career timeline (`MedTech since 2001`, digital workflows since `2004`, OR system integration since `2008`, healthcare leadership since `2005`), bilingual EN/DE project copy, and confirmed external links (`LINKS`) in `src/content.js`.
- Verified project and portrait imagery under `public/slots/` (`projects-board-1..4.webp`, `writing-table-1.webp`, `about-wall-1.webp`).
- Owner-supplied legal imprint and privacy text in `legal.html`.

## Product Principles

1. Lead with concrete flagship projects (`AI in Medicine Monitor` and `Wimmelbild`) and verifiable MedTech/AI expertise.
2. Keep the 3D architectural model inviting, direct, and responsive while preserving full keyboard, semantic HTML, and non-WebGL accessibility.
3. Preserve strict visual discipline using only the fixed token scales in `src/tokens.css` (`npm run check`).
4. Keep bilingual content (`src/content.js`) and visual media (`public/slots/`) separated from code while maintaining zero-tracking privacy.
