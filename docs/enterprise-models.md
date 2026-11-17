# Enterprise desk models - Work implementation brief

Status: design and source references committed; original 3D asset files NOT acquired or committed yet.

## Objective
Place two independent, optimized 3D desk miniatures in the existing gillespenning.com Vite + Three.js scene. Initially static with subtle idle lights; clicking opens a larger inspectable model. Warp animations are a later optional interaction, implemented separately for each ship.

## Source assets and verification
1. Classic USS Enterprise NCC-1701 (TOS), low-poly candidate: https://sketchfab.com/3d-models/uss-enterprise-ncc-1701-51eef7d604494b6991e425b723bfad95 (previously reported approx. 24,800 triangles - verify directly before committing).
2. USS Enterprise NCC-1701-D (Galaxy class), candidate: https://sketchfab.com/3d-models/star-trek-online-uss-enterprise-d-595123c3348646a4a7e6871ebf0e9fae (previously reported approx. 49,600 triangles). The uploader reportedly extracted it from Star Trek Online; the uploader's CC attribution claim does not establish rights to redistribute the game asset. Do not copy this extracted asset into the repo or production without a valid permission/license. Replace with an authorized model if necessary.

Sketchfab downloads may require an authenticated user session and enabled download permission. Do NOT scrape models or treat an embedded viewer as a licensed GLB. Verify actual filenames, downloads, materials, texture rights, file size, and creator attribution after acquiring assets.

Suggested future paths, only after assets have been acquired and cleared:
- `public/models/enterprise-tos.glb`
- `public/models/enterprise-d.glb`
- `public/models/ATTRIBUTION.md` (author, source, license version, copyright notices, permission evidence)

## Technical implementation
- Use `GLTFLoader` (and `DRACOLoader` / Meshopt if justified) from the project's installed Three.js.
- Load each asset as an independent scene group and normalize origin, scale, and axis convention without changing aspect ratios. Use named anchors on the desk and an overlay/full-screen inspection mode.
- Do not load both large meshes eagerly. Reserve miniature footprint via a placeholder silhouette, lazy-load on approach/interaction; dispose geometries, materials, textures and animation handles on scene exit.
- Optimize GLB meshes and texture dimensions; test mobile GPU memory, draw calls, initial load bytes and FPS before merging.
- No surprise camera motion or autoplay. Respect `prefers-reduced-motion` with an instant/static fallback. Provide keyboard access and Escape to reset.

## Warp animation A - classic Enterprise, 1960s TOS
- Storyboard (~2 to 3 seconds; timing is proposed, not historical footage): tap ship -> float 10-20 cm above desk -> slight forward pitch -> steady acceleration away, diminishing quickly into the starfield -> tiny point disappears -> miniature returns to pedestal.
- Appearance: restrained bright engine glow, modest stars, no TNG blue shockwave, no ship stretching. Camera stays mostly anchored; sound optional/off by default.
- Suggested reusable effect layers: opacity/scale-based departure, engine emission, sparse short star streaks.

## Warp animation B - Enterprise-D, 1987-1994 TNG
- Storyboard (~3 to 4 seconds): tap -> ship lifts -> two nacelles build up blue emission -> ship moves forward -> short directional mesh/afterimage stretch (~150-250 ms) with a bright localized flash -> long star streaks and disappearance -> reset.
- Appearance: 1990s TNG-style jump, not the newer 2009 film's tunnel look. Don't copy copyrighted TV footage or audio.
- Avoid physically stretching the GLB permanently: use an animated duplicate/afterimage, shader, or screen-space effect, and restore original transform after exit.

## Shared scene behavior and acceptance criteria
- Reuse one animation state machine (`idle -> selected -> lift -> charge -> jump -> reset`) with separate presets `tos` and `tng`; for TOS `charge` is subtle/brief.
- A 'Warp' or 'Engage' control is visible only after a ship has been selected; click again or Escape returns to desk.
- Both miniatures look good and remain stationary initially; no warp until visitor interaction.
- Ship and text remain crisp on high-DPI screens; lighting and shadows remain legible in both themes if available.
- Build and design checks pass (`npm run build`, `npm run check`). Test desktop keyboard/mouse and mobile pointer events; record Lighthouse/performance notes.
- Publishing preference: public website via GitHub Pages; underlying repository should be private. Repository visibility is currently **public** and must be changed in GitHub settings by the owner; keep GitHub Pages enabled. Do not add restricted binary files before privacy and license checks.
