# DESIGN.md

The visual system of gillespenning.com. Values live once, in `src/tokens.css`.

## Palette (from `src/tokens.css`)
| Token | Value | Use |
|---|---|---|
| `--cream` | #f6eee3 | page background |
| `--paper` | #fbf6ee | panels, buttons |
| `--petrol` | #12383a | headings, primary buttons, room names in the model |
| `--ink` | #2a2f2c | body text |
| `--line` | #d9cbb6 | hairlines |
| `--brass` | #a9792b | single accent (kicker, brass line) |

The 3D model adds pale limestone-cream walls, pale oak, soft sage (Projects wall), pale green satin glass and a muted
grey-green base (decision D-016: light and airy, soft shadows). Those are material colours in the `C` table in
`src/scene.js` and the light rig in `src/viewer.js`, not page tokens.

## Fonts
- `--font`: Newsreader Variable, fallback Georgia, serif. Used for everything, including the lettering on the model walls.

## Sizes
All sizes (spacing, radii, control heights, font sizes) come from the tokens in `src/tokens.css`.
The limits on the number of steps are in `AGENTS.md`. Do not add in-between values.

## Page layout
Desktop is one screen (`100svh`): header, intro left and model right, a slim strip at the bottom (Wimmelbild, and an
empty `#social` container for later). Room content opens in the card (`#panel`) inside the model area. Phone: header,
intro, model, room bar, room content (dock), strip. See D-014 and D-015 in `docs/decisions.md`.

## Model layout
The four rooms are different sizes on one rectangular dark-petrol base, like a floor plan. Projects (gallery, long
and narrow) is back left, About Me (study, smallest) back right, AI & Digital Health (largest) front left,
Writing & Speaking (lounge) front right. A corridor leads from the entrance at the front edge and jogs sideways
between the front and back row; the brass line follows it with bends to each room's glass door.
Sizes, wall heights and positions live once in the `ROOMS` table in `src/scene.js`. Floor, walls, door, lettering,
picture slots, furniture, hotspots and the camera framing are derived from it, so a room can be resized there.

## Image slots
Every picture surface in the model has a fixed slot name. A file `public/slots/<slot>.webp`
replaces the drawn placeholder on that surface. If the file is missing, the placeholder stays.
Slots are defined once in `src/scene.js` (`SLOTS`). Keep this table in sync. Slot sizes in the model are fixed per slot,
not per room; only their position follows the room (the wall pictures of the AI room are 1.3 x 0.65 units).

| Slot | Room | Surface | Aspect | Minimum size |
|---|---|---|---|---|
| `ai-wall-1` | AI & Digital Health | picture on back wall, left | 2:1 landscape | 1200 x 600 px |
| `ai-wall-2` | AI & Digital Health | picture on back wall, right | 2:1 landscape | 1200 x 600 px |
| `projects-board-1` | Projects | board on plinth 1 (Wimmelbild) | 4:3 landscape | 1200 x 900 px |
| `projects-board-2` | Projects | board on plinth 2 (AI Monitor) | 4:3 landscape | 1200 x 900 px |
| `projects-board-3` | Projects | board on plinth 3 (DocEase) | 4:3 landscape | 1200 x 900 px |
| `projects-board-4` | Projects | board on plinth 4 (Elbstrand) | 4:3 landscape | 1200 x 900 px |
| `writing-table-1` | Writing & Speaking | book or paper on the round table | 4:3 landscape | 1200 x 900 px |
| `about-wall-1` | About Me | framed picture on back wall | 3:4 portrait | 900 x 1200 px |

Rules:
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
