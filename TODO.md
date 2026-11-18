# TODO

## Done
- [x] Stack decided: Vite and Three.js, static build (D-006).
- [x] Design tokens in `src/tokens.css`; `npm run check` fails on off-scale values (D-021).
- [x] Four-room home page, EN and DE, compact one-screen layout (D-012, D-014).
- [x] Social links with logos, news from the monitor (D-017, D-018).
- [x] GitHub Pages workflow, CNAME, canonical and Open Graph tags, favicon, robots.txt, sitemap.xml (D-019). Prepared only.

## Owner steps before going live
- [ ] Enable GitHub Pages (Settings > Pages > Source: GitHub Actions), merge to `main`, check the build.
- [ ] Switch the DNS of `gillespenning.com` to GitHub Pages without touching `ai.gillespenning.com`.
- [ ] Supply the legal imprint and the privacy policy text (D-020). Nothing has been written.
- [ ] Texts and links for DocEase and Elbstrand; pictures for `projects-board-3`, `projects-board-4`, `writing-table-1`, `about-wall-1`.
- [ ] Decide on a share image (Open Graph picture), if wanted.
- [ ] Confirm whether Wimmelbild has a German address.

## Later
- [ ] Run `/impeccable init` with the owner and write `PRODUCT.md`.
- [ ] Decide the kicker line under the headline (`docs/design-review.md`, item 13).
- [ ] Confirm the exact values of the design scales and the open questions in `docs/decisions.md`.
- [ ] Refresh `src/news-snapshot.json` before each release (`node scripts/update-news-snapshot.mjs`).

## Enterprise desk models and warp sequences
- [ ] Source and verify rights for two separate 3D assets: classic NCC-1701 (prefer the ~24.8k-triangle Sketchfab variant) and NCC-1701-D (the previously identified ~49.6k-triangle Star Trek Online extraction is a reference only until redistribution permission is established). Record author, download URL, license, model/texture attribution, and asset dimensions for each.
- [ ] Import each authorized asset as its own optimized GLB/GLTF into the Three.js desk scene, initially static. Lazy-load the selected asset, cap texture resolution, and test mobile performance. Do not commit ripped Star Trek Online content without appropriate permission.
- [ ] Implement TWO distinct, optional warp animations, using our own Three.js effects (not copied TV footage): (1) TOS NCC-1701 - period-appropriate simple accelerating departure, subtle engine lights and classic starfield, no TNG stretch/flash; (2) TNG NCC-1701-D - blue nacelle charge, slit-scan-like elongation, flash, rapid exit and star streaks.
- [ ] Share animation lifecycle and controls (activate on click, accessible reduced-motion fallback, Escape/reset to desk), but keep separate TOS and TNG visual presets. Test draw calls, GPU memory, first-load size, and FPS on desktop and phone.
- [ ] Optional Easter egg: both desk models react to a discreet “Engage” interaction; no auto-playing warp or large effects on initial page load.

## Work handoff
- [x] Add implementation specification and both model source links: [docs/enterprise-models.md](docs/enterprise-models.md).
- [ ] Obtain both downloadable, license-cleared GLBs; source references are not the actual binary models.
- [ ] Owner: switch repository visibility to Private in GitHub settings while keeping GitHub Pages active (requires suitable GitHub plan).

## Implementation update - 2026-11-17 (D-059)
- [x] Replace the previous E miniature with two original procedural NCC-1701 and NCC-1701-D miniatures, each with a stand/nameplate and distinct silhouette.
- [x] Persistent first-tap preview, explicit View model / Engage warp actions, separate inspectable model, reset and keyboard controls.
- [x] Implement separate optional TOS accelerating departure and TNG charge/stretch/flash effects; reduced-motion static fallback.
- [x] Build/token checks and CPU geometry/bounds checks passed.
- [ ] Acquire the referenced Sketchfab binaries through an authenticated download (HTTP 401 without a session). Current shipped miniatures are original procedural geometry, not those files; external asset tasks above remain open.
- [ ] Verify actual appearance, mobile GPU memory/FPS and interaction on a WebGL-capable desktop and phone. Cloud browser cannot reach the local preview.

## Completed 2026-11-18 - object inspection (D-071)
- [x] Mouse wheel on a scrollable page; quiet synchronized toolbar zoom; mobile touch targets.
- [x] Per-object camera poses for desks, OP table, shelves, projects, rack and miniatures; card-first actions and return view.
- [x] Keyboard-only stage outline; transparency retained; geometry/interaction checks and production build.
