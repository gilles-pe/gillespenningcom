# DESIGN.md

The visual system of gillespenning.com. Values live once, in `src/tokens.css`.

## Palette (from `src/tokens.css`, aligned with AI in Medicine Monitor, D-036)
| Token | Value | Use |
|---|---|---|
| `--paper` / `--cream` | #f7f6f2 | page background (soft warm neutral) |
| `--surface` | #ffffff | elevated panels, cards and buttons |
| `--line` | #dcd9d0 | hairlines and subtle borders |
| `--ink` | #18181b | primary body text |
| `--muted` | #4b5563 | secondary captions, metadata and subtitles |
| `--teal` / `--petrol` | #1e3a8a | signature deep blue accent (headings, primary buttons, room names, active states) |
| `--teal-surface` | #eff6ff | soft blue tint for badges and highlights |
| `--brass` | #1e3a8a | accent mark and interactive highlight (alias to deep blue) |
| `--brass-ink` | #172554 | high-contrast deep blue for small text and hover (7:1+ on paper) |

The 3D model adds pale limestone-cream walls, pale oak, soft sage (Projects wall), pale green satin glass and a muted
grey-green base (decision D-016: light and airy, soft shadows). Those are material colours in the `C` table in
`src/scene.js` and the light rig in `src/viewer.js`, not page tokens.

## Fonts (D-036)
- `--serif`: Source Serif 4 (fallback Georgia, serif). Used for brand, headings, and lettering on the model walls.
- `--sans`: Source Sans 3 (fallback system-ui, sans-serif). Used for body text, UI navigation, buttons, cards, tooltips, and footer links.
- Self-hosted locally via `@fontsource/source-serif-4` and `@fontsource/source-sans-3` (zero external network requests, 100% GDPR compliant).

## Brand mark and favicon
The approved favicon (2026-11-18) uses a white Source-Serif-style `GP` monogram in front of a dotted globe on deep royal blue. Preserve this artwork rather than recreating or recolouring it. `public/favicon.svg` is the scalable source; `favicon.ico`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`, `icon-512.png`, and `icon-1024.png` are matching raster exports. Both HTML pages reference the icon family with a versioned URL to refresh browser caches.

## Sizes
All sizes (spacing, radii, control heights, font sizes) come from the tokens in `src/tokens.css`.
The limits on the number of steps are in `AGENTS.md`. Do not add in-between values.

## Page layout
Desktop is one screen (`100svh`) with the 3D stage (`#scene`, `z-index: 0`) running full-bleed behind translucent frosted header, left intro card, and bottom footer strip (Wimmelbild, social logo links in `#social`, and the 3 horizontal "Latest Substacks:" links). Active navigation items use clean typography/color without underline bars. Room cards (`#panel`) sit compactly at bottom-left, and pop-up project/story/photo cards anchor to the left of the 3D room with top-right `×` close buttons and directly clickable image/text bodies (no separate CTA buttons). Phone: header, intro, model, room bar, room content (dock), strip. See D-014, D-015, D-031 and D-032 in `docs/decisions.md`.

On phones (up to 800 px), the live model extends behind the intro in a taller canvas, with extra space above and below the model. The overview is positioned lower within that canvas so it sits more centrally in the exposed area; individual room framing is unchanged. The intro uses 88% paper and 8 px background blur so its copy remains legible; links remain usable and the exposed model area supports touch. Room controls and content remain below the model. Without WebGL or JavaScript, keep the static fallback and text in normal flow. See D-041, D-042 and D-046.

The default overview camera looks from about 31° above and 13° to the left, with a wider framing that keeps the entire model visible. The intro remains visible during exploration. On mobile, opening a room places its model below the intro, clear of the text; on desktop the intro remains alongside the model. See D-043 and its correction D-045.

On narrow phones, the canvas is one viewport height plus one large spacing step. The mobile overview aim is lowered within it, giving the model more space beneath the intro and bringing its base closer to the room controls. See D-044.

Intro surfaces use 88% paper, and overlay cards and 3D labels use roughly 86–88% paper for legible copy over the model. Tapping a project or social object in the 3D scene opens its preview card; external navigation remains on that card. See D-046.

The four mobile room controls use translucent paper with backdrop blur like the Reset view control. They form two columns from 481–800 px and one column on narrower phones. The selected room uses a translucent deep-blue fill. See D-047.

The intro links lead with the AI in Medicine Monitor, then the AI Medicine Wimmel Book, with MedTech Signal as a quieter reading link beneath. Desktop presents the two projects side by side; mobile stacks all three at up to 800 px. The Wimmel Book description invites playful exploration in both languages. See D-048.

On the desktop 3D view, the header and footer strip use 58% cream and a 4 px blur so the model remains visible through both. Text-heavy intro and preview cards retain their stronger paper opacity. See D-049.

The left chair in Writing & Speaking is a tailored upholstered lounge chair: rounded back and arms, separate seat and back cushions, subtle woven surface, restrained seams, splayed oak legs, and one sage cushion. Its low, warm palette suits the architectural model. Keep the right chair unchanged for an in-room comparison. See D-050.

The right chair now contrasts through a continuous curved tub shell that forms the back and both arms. Tonal leather, a loose cushion, fine seams and exposed oak legs give it more sculptural detail while keeping the small room calm. See D-051, superseding the right-chair comparison in D-050.

The mobile overview aims lower on the tall canvas, clearing more of the intro and reducing the blank gap before the room controls. Opening a room retains its existing close framing. See D-052.

The two rear shelves have different silhouettes and roles (D-053). About Me keeps a light two-door cabinet with brass handles, a sage inset, a quiet book cluster and a clear bay for the three clickable social plaques. The lamp and a detailed Enterprise miniature share the top with space between them. Writing & Speaking uses a thin, open oak display shelf with a subdued back panel, sparse books and a larger standing talk photo; its photo remains clickable. At overview distance, the key objects must read before any fine grain or lettering does.

D-058 refines these furnishings. The About Me desk now has a softly eased oak top, tapered legs, slim drawers and restrained brass pulls; its laptop, album and mug stay at their original clickable coordinates. Its upholstered, rounded office chair has a visible swivel base and shared design language with the AI room chair. The front Writing & Speaking shelf is more lived-in: varied upright and stacked books on both open levels, a slim drawer base and a small antique globe on the top right, clear of the clickable speaking photo. The books have subtle spine marks and slight variation without making a uniform wall of color. This supersedes the intentionally sparse book arrangement of D-053.

## Model layout
The four rooms are different sizes on one rectangular dark-petrol base, like a floor plan. Projects (gallery, long
and narrow) is back left, About Me (study, smallest) back right, AI & Digital Health (largest) front left,
Writing & Speaking (lounge) front right. A corridor leads from the entrance at the front edge and jogs sideways
between the front and back row; the brass line follows it with bends through each room's doorway onto the room floor.
AI & Digital Health carries a three-panel frosted glass partition along the corridor (front panel slides open),
combining an operating room zone (operating table with 10 mm rigid endoscope and camera head, ceiling-suspended
dual-wing surgical light, rolling drawer cart, and an endoscopic equipment tower with a large rolling monitor)
separated in its front/middle stretch by an internal glass partition wall with doorway from a consultation Vorraum
(19-inch IT server rack tucked into the back-right corner and angled desk with monitor). About Me features a refined oak
desk and upholstered swivel chair, plus a two-door cabinet bookshelf with slightly imperfect books, an antique globe, three clickable brass-rimmed social trophies (Substack,
Bluesky, LinkedIn), the brass table lamp and a side-profile miniature USS Enterprise NCC-1701-E on top, an open
"My Story" laptop, book and coffee mug on the desk, and an interactive running photo on the back wall. Writing &
Speaking carries the open oak display shelf with books, a small globe and the standing talk photo, plus a detailed table condenser microphone.
Sizes, wall heights and positions live once in the `ROOMS` table in `src/scene.js`. Floor, walls, door, lettering,
picture slots, furniture, hotspots and the camera framing are derived from it, so a room can be resized there.

Hidden underside (maintainers only, not mentioned in the README or the UI, see D-024 and D-025): the base is a slab with a lower part
around a recess on its underside, the cellar (`CELLAR` and `buildCellar` in `src/scene.js`): cream lining, a thin wooden frame, a small point
light and a fax machine built from boxes and cylinders, standing on the recess "floor" (the underside of the slab), so it reads upright when the
model is turned over. The sheet in its slot carries the sentence from `model.egg.note` as a canvas texture. Clicking it is handled in
`src/egg.js` (raycast against the machine and the base, so it only hits when it faces the camera). The model can be turned freely
(`src/viewer.js`); the camera orbit centre drifts to the recess when zoomed in on the underside. The legal page `legal.html` is described in D-028.

## Social links and news
Social marks (Substack, Bluesky, LinkedIn) are inline SVG from `src/icons.js`: 28 px glyph (`--t4`) in a 40 px (48 px phone) target, petrol, brass on hover and focus.
News comes from `src/news.js` (snapshot plus live feed) and is rendered by `src/widgets.js`.

## Image slots
Every picture surface in the model has a fixed slot name. A file `public/slots/<slot>.webp`
replaces the drawn placeholder on that surface. If the file is missing, the placeholder stays.
Slots are defined once in `src/scene.js` (`SLOTS`). Keep this table in sync. Slot sizes in the model are fixed per slot,
not per room; only their position follows the room (the wall pictures of the AI room are 1.3 x 0.65 units).

| Slot | Room | Surface | Aspect | Minimum size |
|---|---|---|---|---|
| `ai-wall-1` | AI & Digital Health | large rolling monitor on endoscopic cart (Wimmelbild) | 2:1 landscape | 1200 x 600 px |
| `ai-wall-2` | AI & Digital Health | desktop monitor on practice desk (AI Monitor) | 2:1 landscape | 1200 x 600 px |
| `projects-board-1` | Projects | board on plinth 1 (Wimmelbild) | 4:3 landscape | 1200 x 900 px |
| `projects-board-2` | Projects | board on plinth 2 (AI Monitor) | 4:3 landscape | 1200 x 900 px |
| `projects-board-3` | Projects | board on plinth 3 (Praxisfaden mascot) | 4:3 landscape | 1200 x 900 px |
| `projects-board-4` | Projects | board on plinth 4 (hDRG-Kompass) | 4:3 landscape | 1200 x 900 px |
| `projects-board-5` | Projects | board on plinth 5 (Elbstrand) | 4:3 landscape | 1200 x 900 px |
| `writing-table-1` | Writing & Speaking | MedTech Signal (Substack) book on the round table (clickable) | 4:3 landscape | 800 x 600 px |
| `writing-shelf-1` | Writing & Speaking | framed photo of Gilles speaking in the bookshelf’s right corner (clickable) | 3:4 portrait | 768 x 1024 px |
| `about-wall-1` | About Me | framed running photo on back wall (clickable) | 3:4 portrait | 900 x 1200 px |

### Interactive Photo Album (About Me desk, D-039)
Images live in `public/album/photo-<1..7>.webp` (max width 1024 px, 80% WebP quality, ~50–144 KB):
- D-054: The closed desk album is larger and reads as a physical book: cloth/leather grain, ribbed spine, visible page edges, bookmark, restrained corner details and a mounted real photo on its cover. The entire object opens the album when clicked in About Me.
- D-055 supersedes the open-book layout of D-054: two landscape photos share a page, each with its caption; portrait photos receive a page of their own. Group consecutive landscape images in pairs, flushing a partial pair before any portrait. Keep images uncropped and make each photo clickable to open a larger view. Escape closes the large photo first, then the album.
- D-057: Keep two facing pages and a visible spine at all viewport widths, including phones. The mobile book is centred and height-limited to retain the silhouette of an open book. Previous/next buttons, horizontal swipes and arrow keys turn a whole spread without wrapping; the subtle motion respects reduced-motion settings. Small photos remain directly enlargable.
- The current seven photos are all landscape, so they occupy four pages (2 + 2 + 2 + 1); a future portrait requires `orientation: 'portrait'` in its language metadata.
- `photo-1.webp`: River Elbe & container giant (Hamburg)
- `photo-2.webp`: Rainbow over historic Speicherstadt (Hamburg)
- `photo-3.webp`: Harbor reflections in puddle at Dockland (Hamburg)
- `photo-4.webp`: Köhlbrandbrücke with runners (Hamburg Marathon)
- `photo-5.webp`: Ponte Dom Luís I at golden sunset (Porto)
- `photo-6.webp`: Ever Acme container mega-ship arriving in port (Hamburg)
- `photo-7.webp`: Quiet sunset with tree, bench, and hiking signpost

### Server rack timeline (AI & Digital Health, D-056)
Five distinct physical modules climb from bottom to top: Telemedicine 2004, Digital OR 2008, System Integration 2018, Longitudinal Data & Wearables 2023, AI & Startup 2024. Printed years and restrained cues make the chronology visible at close range. The whole rack opens a bilingual preview card with the five legible labels and no external destination. The preview remains open until dismissed so a visitor can read it. The room overview relies on shape and rhythm; tiny lettering is not expected to be readable there.

Rules:
- Pictures are drawn unlit (not tone-mapped), so they show the brightness of the file (D-022).
- Format is WebP. Wrong aspect ratios are cropped to fit (centre crop), not stretched.
- Keep files small (aim for under 200 KB each).
- A new picture surface needs a row here and an entry in `SLOTS` in `src/scene.js`.

### Image style brief
For generated or supplied images:
- Palette: warm cream, petrol green, brass, light wood. Soft daylight, no strong contrast.
- Calm editorial illustration, or real screenshots of the actual project.
- No text baked into illustrations. Real screenshots may contain their own text.
- No stock-AI look: no glossy 3D, no neon, no lens flare, no generic smiling-people scenes, no gradients as decoration.
- Flat, quiet and a little imperfect, like a print in a well-made exhibition model.

### Enterprise miniatures and inspection (D-059)
Two original procedural miniatures replace the Enterprise-E: Constitution-class NCC-1701 and Galaxy-class NCC-1701-D. Small dark wood stands, brass nameplates, bevelled saucers, readable silhouettes and restrained red/blue engine accents follow the diorama palette. First tap opens a persistent preview with View model / Engage warp controls. The lazy-loaded inspector uses a native modal dialog, separate bounded WebGL renderer, touch orbit/pinch, keyboard arrows, Escape and reset. Warp runs only on request, with distinct TOS acceleration and TNG charge/stretch/flash. Reduced motion keeps a static model with explanatory status. Resources are disposed on close. No downloaded Sketchfab binary is included; downloads currently require authentication. Mobile visual/FPS verification remains pending.

### First-tap camera inspection (D-060, 2026-11-18)
Selecting either Enterprise moves the room camera to a close, slightly elevated view from the front of the cabinet. Frame the actual miniature bounds in the free area beside the preview on desktop and above it on mobile. Keep the preview in the canvas area rather than over the model or below the room dock. Save the previous camera pose and restore it when the card closes. Reset and room changes discard the close-up; resizing reframes the selected model. Reduced motion jumps directly to the inspection pose.

### Quiet ship caption and actions (D-061, 2026-11-18)
Enterprise selection uses a compact bottom caption with the registry, a single class/series line, and two text actions: Explore/Ansehen and Warp. The Warp action has a small outlined circular arrow, not a filled CTA. The same text/icon language appears in the inspector; idle status copy is omitted. Keep touch targets at 48 px, visible focus rings, high text contrast and reduced-motion behavior. Frame the model above the measured caption, leaving the desktop intro unobstructed. On phones, anchor the caption to the actual canvas height rather than the surrounding dock. These changes refine D-059 and D-060; the models remain original procedural interim geometry pending source-file downloads.

### Laptop and endoscopy props (D-062, 2026-11-18)
The About Me laptop uses five rows of raised keys, a wider space bar and an outlined trackpad. The endoscopy tower uses visibly separate modules with distinct front panels for the camera controller, light source and CO₂ insufflator. Set the rigid scope diagonally on the green drape. Give it a slim steel shaft, a dark lens, a ridged coupling, a side light port and a rounded camera head. Route the camera cable over the edge of the table.

### Practice desk and quieter scene controls (D-063, 2026-11-18)
Give the practice desk a slim rounded oak top, tapered legs, a stand-alone keyboard, a mouse on a sage mat, a folder, a pen and a short monitor cable. Align the chair and input devices with the screen. Set the speaking frame in the right corner of the Writing & Speaking shelf, with its hotspot following the frame. Use a plain contact link and underlined language selection. Place Move and Reset together at the lower edge on desktop and in a row below the canvas on phones. Keep 48 px touch targets, show Reset only after the view changes, and tint only the active Move icon.

### Study lamp and individual plants (D-064, 2026-11-18)
The study cabinet holds a lamp with a pleated linen shade, a small warm diffuser, a brass stem and a petrol base. Its shade sits above the neighbouring ship models. The gallery has an airy olive tree in terracotta, the study a rubber plant with broad staggered leaves in ivory ceramic, and the lounge a low fern with arching fronds in a sage bowl. Use shaped geometry and varied greens with instanced leaves and stems. Keep planting in the front corners so the paths and clickable props have room.

### Lounge floor lamp (D-066, 2026-11-18)
Keep the slender post and the tapered, warm shade in Writing & Speaking. A low bronze base, a lightly curved linen shade with two sewn hems, and a recessed diffuser add definition at close range. The cord runs back toward the wall, leaving the seating area clear.

### Separate introduction, scene and room details (D-067, 2026-11-18)
The main page uses a normal-flow grid. At 1280 px and wider, the introduction sits left, the canvas in the middle and the selected room’s details on the right. Between 801 and 1279 px the details move below the canvas in its column. On phones, stack all three areas. Keep navigation and view controls below the canvas, and fit the model to the available canvas width. The Writing & Speaking room details show a contact link, one row of named social targets, and the newest post with an archive link.

### Required scene transparency (D-068, 2026-11-18)

The 3D view must continue behind adjacent text and control surfaces on desktop and mobile. Render one continuous scene, with a soft fade at its outer edges. The introduction, room details and scene controls must use the shared translucent paper surface at 86% opacity. Apply opacity to the background only. Text and controls remain fully legible.

Keep separate layout areas for introduction, controls and room details. Text regions must never overlap each other. Fit room titles and interactive objects into the clear part of the stage with visible headroom. Only that clear stage accepts scene gestures. On narrow screens the same surface and interaction rules apply to the stacked layout.

### Quiet zoom and object views (D-071, 2026-11-18)
Keep the view controls as quiet text/icon actions on the existing translucent surface. Add a fine blue zoom track with a small round thumb between minus/plus actions beside Reset. The native range input has a 48 px interaction height; on phones the zoom group occupies a centred second toolbar row with 48 px step buttons. No extra box, badge or permanent numeric display. Its logarithmic value stays synchronized with wheel, pinch, buttons and keyboard.

An object click opens a compact persistent caption at the bottom of the clear stage and eases the camera toward its own inspection view. Fit all object bounds above the measured caption. Desks and the operating table are seen from a slightly elevated working position; shelves and miniatures from the front at a modest angle. Projects use a higher frontal angle so the AI room's rear wall cannot hide them. Keep every room wall, floor and object visible: no cut-away or fading furniture to solve occlusion. Restore the previous camera on close, reset to the current room, and preserve reduced-motion behavior. The caption uses the shared 86% paper surface. The stage has a restrained 1 px keyboard-only focus outline, with no frame after mouse interaction.

### Laptop, project links and responsive controls (D-072)
The About laptop introduces Leadership & Business Development and links to the existing details through a short card. A small right arrow beside a project-card title indicates a real external destination; omit it for projects without a link. On unfolded foldables and other wider views, keep the view controls in one compact row when they fit; use a centred second zoom row only on narrow phones. The All rooms control remains visible throughout an open room, and blank stage taps do not dismiss it. Keep the translucent surface. The first project board uses the approved Wimmelbild artwork, fitted fully inside its 4:3 image.

### Album arrival and BACK (D-074)
The first album tap moves the camera to the book before displaying the facing pages. Never open an enlarged photo from this initial gesture. Every new entry clears the lightbox state. BACK is a quiet 48 px control on the shared translucent paper surface at the top-right of the interactive stage. It appears when a previous view exists and reverses room/object changes or grouped manual camera gestures. A matching album-header action returns from the book; an enlarged photo returns to the spread first. Respect reduced motion and cancel pending album entry when leaving its room.

### Project activation (D-076)
A project opens its card on first selection and its external destination in a new tab on the next selection. For a project without a destination, show a small Coming Soon badge over its picture on the translucent paper surface, and keep the card open. External links request foreground focus; browsers retain final control.

### Animated 3D Photo Album (D-077, 2026-11-18)
Replace the 2D HTML book dialog with an articulated Three.js hardcover album inside `src/book-album.js` on the study desk, inspired by the curved-page mechanics of `Qbject/the-book-of-qbject` (MIT) without external animation or UI dependencies. Clicking the closed album zooms to frame it while keeping the book physically shut; a second tap (or Open button once settled) swings the cover open onto Page 1 instructions rendered directly onto the 3D paper sheet. Inner paper leaves use cosine spine vertex clustering, CubicBezier page-turn deflection with trailing tip flex, vertex-color gutter shading and soft fill lighting. Only spreads within the active window load textures, disposing distant sheets and closing state textures cleanly. Pointer/touch clicks and horizontal drag-to-flip on open pages are isolated from camera movement, while compact single-row 48 px HUD controls and rotated open-spread camera framing keep all 18 photos crisp and unclipped across desktop, portrait/landscape phones and 5:4 foldables.

### Antique shelf globe (D-080)
The lower right compartment of the About Me cabinet holds a turned walnut stand, a softly aged brass meridian ring with degree marks and a 23.44°-tilted parchment globe with emerald continents. The local plate at `public/models/antique-globe-map.webp` uses [Natural Earth 1:110m land and lake outlines](https://www.naturalearthdata.com/downloads/110m-physical-vectors/) with a fine graticule, engraved-style labels and a small compass rose.

### Projects exhibition displays (D-083, 2026-11-19)
All five projects share a rounded pale-oak plinth on a recessed dark foot, a slim cream cap with a brass edge, and a framed image on brass supports. A small brass nameplate on the front carries the project title. The images remain in their existing slots. Selecting a project raises its frame by 0.035 model units and gently warms the brass rails. The frame returns when the card closes or the visitor leaves Projects. Reduced motion applies the final state immediately. All physical parts retain the project's first-click preview and second-click destination behavior.
