# TODO

## Done
- [x] Stack decided: Vite and Three.js, static build (D-006).
- [x] Design tokens in `src/tokens.css`; `npm run check` fails on off-scale values (D-021).
- [x] Four-room home page, EN and DE, compact one-screen layout (D-012, D-014).
- [x] Social links with logos, news from the monitor (D-017, D-018).
- [x] GitHub Pages workflow, CNAME, canonical and Open Graph tags, favicon, robots.txt, sitemap.xml (D-019). Prepared only.

## Recurring maintenance
- [ ] **Every 5 days:** Check `https://medtechsignal.substack.com/feed` for new Substack articles. When a new post appears, save its article graphic as a local WebP (`public/models/article-*.webp`, 768px wide, quality 82), update the 5 entries in `src/data/substack-articles.json` (newest first; keep key `latestArticle` on index 0 and `substackArticle2`–`substackArticle5` on indices 1–4), and refresh `src/news-snapshot.json` (`node scripts/update-news-snapshot.mjs`). Last checked: 2026-11-21.

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

## Enterprise shelf model and warp sequence (D-079)
- [x] Convert Raul Mamoru's TOS Enterprise (`NCC-1701`) from `.3DS` + TIFFs into an optimized WebP + quantized GLB (`public/models/enterprise-tos.glb`, 1.2 MB, 13 draw calls, ~50.8k tris) with attribution in `public/models/ATTRIBUTION.md` and discreet credit in the 3D inspector.
- [x] Reduce the `About Me` shelf from two ships to the single classic `NCC-1701` (TOS), removing `NCC-1701-D` (TNG), with lazy `GLTFLoader` loading (0 KB on initial overview load).
- [x] Implement the interactive in-scene "once around the world" TOS warp flight (liftoff -> sweep across room & diorama -> warp out with starfield streaks -> warp in from opposite side -> pedestal landing), with `Esc`/reset/BACK cancel and reduced-motion fallback.

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
