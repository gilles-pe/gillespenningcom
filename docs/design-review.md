# Design review - home page (draft/four-room-home)

Date: 2026-11-16. Method: written Impeccable critique (skill 4.9.2, critique + critique-rubric + craft-floor)
run in a single context, plus real screenshots (desktop 1440 and 1100, phone 390 and 320).

Impeccable engine: `impeccable context` ran. `impeccable detect --json index.html src` ran and returned one
finding. `detect` against the dev-server URL timed out on navigation (one attempt, no retry). No sub-agent tool
was available, so this is a degraded single-context critique. No PRODUCT.md exists (owner interview pending);
nothing was written to PRODUCT.md and no visual direction was replaced.

## Detector findings
- `flat-type-hierarchy` (index.html): "body 16px, h1 16px, h2 16px". False positive. The scan read the
  static HTML without the CSS, which is bundled through JS. Real sizes: h1 64px (40px under 1100px), h2 28px/40px,
  body 20px, links 16px. Hierarchy is clear.

## Ranked findings
Status: FIXED, PARTLY or OPEN.

1. Hotspot labels overlapped (Projects, AI, Writing at 1440; plus DocEase/Elbstrand and About under the panel at
   1100) and sat on top of the picture boards they point at. FIXED: hotspots now stand under the plinths or on
   furniture, and `placeSpots()` in viewer.js moves a label down when it would hit another label or the panel.
   Measured at 1440 and 1100 in every room: zero overlaps, none under the panel.
2. The text panel covered the left part of the model, and at 1100 the About and Writing hotspots. FIXED: the camera
   frames the room in the space to the right of the panel (view offset, animated), with extra distance on narrow stages.
   Wall lettering, pictures and hotspots are visible in all four rooms at 1440 and 1100.
3. Room names appeared twice in the overview (wall lettering and floating label buttons). FIXED: the buttons are
   visually hidden until keyboard focus (opacity 0, still focusable and announced) and stay visible in the static
   no-WebGL fallback. The wall lettering was too small to carry the name alone, so it is larger now, and the
   Projects lettering (cream on green, about 2.4:1) is petrol on a lighter green.
4. Phone: the centrepiece sat below the fold behind two paragraphs and four buttons. FIXED: on phone the model
   follows the first paragraph and is inside the first screen at 390x760 and 320x700.
5. Tap targets: spots were 32px, phone room buttons/pills/brand/CTAs were 32 to 40px. FIXED: desktop 40px minimum,
   phone 48px. Checked: no visible link or button under 48px at 390 and 320.
6. Navigation order differed in three places (nav, bar, rooms section). FIXED: all follow the model (Projects,
   About Me, AI & Digital Health, Writing & Speaking).
7. Hotspot "Speaking topics" pointed at #writing and was patched in viewer.js. FIXED: scene.js says `#speaking`,
   override removed. Also "Talks are available in English and German." added to `#speaking` (owner-confirmed).
8. `PCFSoftShadowMap` warning in Three.js 0.187. FIXED: `PCFShadowMap`. Console is clean apart from the software GL
   driver notice of the headless test browser.
9. Projects panel showed only a heading. FIXED with one factual line: "Two projects are live. DocEase and Elbstrand follow."
10. Duplicated copy: the two speaking questions appear in the Writing room, the rooms section and #speaking; "Book a talk"
    appears in nav, panel and section. OPEN (content decision; the panel is cloned from the rooms section).
11. Room-section lists are repeated link groups (Wimmelbild and the monitor each appear up to three times on the page).
    OPEN (content decision).
12. Panel width (300px), 2px rules and a few calc() values in style.css are not on the token scales. OPEN: needs an
    owner decision or the planned check script; not changed.
13. Kicker-style line "Healthcare & MedTech" under the h1 in brass (3.3:1, passes only as large text) restates the
    page title. The craft floor bans kickers; DESIGN.md names it as the accent use. OPEN, owner decision: keep, or
    delete and let the h1 carry it.

## AI-design tells found
- Everything pill-shaped (bar, floating labels, back button, hotspots): FIXED, now 6px radius like the other buttons.
- Glass panel (translucent paper plus backdrop blur on the panel; translucent bar and labels): FIXED, solid paper.
- Decorative arrows on every link, glyph arrows in hotspots and the back button: FIXED, removed. Links read as links.
- Uniform card grid / boxed link buttons throughout the rooms section: PARTLY. Links are now underlined text, the
  four columns stay (they carry unequal content). Hero links stay as bordered buttons.
- Same weight for everything in lists: PARTLY, "Details to follow" items are dashed and unlinked, links underlined.
- Kicker above/below heading: OPEN (item 13).
- Generic centred sections: not present. Gradient text, hard shadows, emoji icons, stat blocks, stock imagery: not present.
- Low contrast: Projects lettering FIXED. Secondary text (ink at 70 to 75% on paper) measures about 4.8 to 5.7:1, passes AA.
  Brass is used only for large text and non-text accents (about 3.3:1, passes as large text/graphics).
- Focus: a 2px brass outline exists for all interactive elements (`:focus-visible`), it passes 3:1. Default text
  selection now uses petrol and paper.

## Heuristic notes (Impeccable rubric, Experience/Persuade mode, 7 and 10 n/a)
Strong: specific world (cream, petrol, brass, wood, serif, a navigable model), consistent palette, working keyboard path,
Escape and back, static fallback. Weak: duplicated copy, repeated links, an unconfirmed second project, placeholder
picture slots with drawn text.

## Needs an owner decision
Kicker line (13), duplicated copy and links (10, 11), off-scale panel width and rules (12), real pictures for the
slots, the open questions in docs/decisions.md, and `/impeccable init` for PRODUCT.md.
