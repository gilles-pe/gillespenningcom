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
