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

## Model layout
The four rooms are different sizes on one rectangular dark-petrol base, like a floor plan. Projects (gallery, long
and narrow) is back left, About Me (study, smallest) back right, AI & Digital Health (largest) front left,
Writing & Speaking (lounge) front right. A corridor leads from the entrance at the front edge and jogs sideways
between the front and back row; the brass line follows it with bends through each room's doorway onto the room floor.
AI & Digital Health carries a three-panel frosted glass partition along the corridor (front panel slides open),
combining an operating room zone (operating table with 10 mm rigid endoscope and camera head, ceiling-suspended
dual-wing surgical light, rolling drawer cart, and an endoscopic equipment tower with a large rolling monitor)
separated in its front/middle stretch by an internal glass partition wall with doorway from a consultation Vorraum
(19-inch IT server rack tucked into the back-right corner and angled desk with monitor). About Me features a two-door
cabinet bookshelf with slightly imperfect books, a brass globe, three clickable brass-rimmed social trophies (Substack,
Bluesky, LinkedIn), the brass table lamp and a side-profile miniature USS Enterprise NCC-1701-E on top, an open
"My Story" laptop, book and coffee mug on the desk, and an interactive running photo on the back wall. Writing &
Speaking carries the cabinet bookshelf and a detailed table condenser microphone.
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
| `projects-board-3` | Projects | board on plinth 3 (Praxisfaden) | 4:3 landscape | 1200 x 900 px |
| `projects-board-4` | Projects | board on plinth 4 (Elbstrand) | 4:3 landscape | 1200 x 900 px |
| `writing-table-1` | Writing & Speaking | MedTech Signal (Substack) book on the round table (clickable) | 4:3 landscape | 800 x 600 px |
| `writing-shelf-1` | Writing & Speaking | framed photo of Gilles speaking standing on the bookshelf (clickable) | 3:4 portrait | 768 x 1024 px |
| `about-wall-1` | About Me | framed running photo on back wall (clickable) | 3:4 portrait | 900 x 1200 px |

### Interactive Photo Album (About Me desk, D-039)
Images live in `public/album/photo-<1..7>.webp` (max width 1024 px, 80% WebP quality, ~50–144 KB):
- D-054: The closed desk album is larger and reads as a physical book: cloth/leather grain, ribbed spine, visible page edges, bookmark, restrained corner details and a mounted real photo on its cover. The entire object opens the album when clicked in About Me.
- The open album keeps one full, uncropped image per spread because the set mixes 4:3 frames and wide panoramas. The opposite page carries title and note; thumbnails provide direct access. On phones it fills the viewport and stacks image above text. Page controls stop at either end, and photo tap, horizontal swipe and arrow keys turn pages. Escape and the close button dismiss it.
- `photo-1.webp`: River Elbe & container giant (Hamburg)
- `photo-2.webp`: Rainbow over historic Speicherstadt (Hamburg)
- `photo-3.webp`: Harbor reflections in puddle at Dockland (Hamburg)
- `photo-4.webp`: Köhlbrandbrücke with runners (Hamburg Marathon)
- `photo-5.webp`: Ponte Dom Luís I at golden sunset (Porto)
- `photo-6.webp`: Ever Acme container mega-ship arriving in port (Hamburg)
- `photo-7.webp`: Quiet sunset with tree, bench, and hiking signpost

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
