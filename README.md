# gillespenning.com

Personal landing page and portfolio of Gilles Penning. Vite and Three.js, English and German, static build.

- Working rules and design limits: [`AGENTS.md`](AGENTS.md)
- Decisions and open questions: [`docs/decisions.md`](docs/decisions.md)
- Visual system and image slots: [`DESIGN.md`](DESIGN.md)
- Backlog: [`TODO.md`](TODO.md)
- Curated book catalog and integration instructions: [`docs/books.md`](docs/books.md)

## Commands

```
npm ci            # install (first time)
npm run dev       # dev server (Vite)
npm run build     # production build into dist/
npm run preview   # serve dist/ locally
npm run check     # fail on sizes outside the design tokens (scripts/check-tokens.mjs)
```

The publish folder is `dist/`. It contains the page, `CNAME`, `robots.txt`, `sitemap.xml`, `favicon.svg` and the
pictures in `slots/`. `.github/workflows/pages.yml` builds and deploys it to GitHub Pages on every push to `main`.

## Change the content

- **Books in the 3D rooms:** edit `src/data/books.json` (21 English editions, ISBNs, shelf positions, short publisher-based English summaries and preview covers). `src/book-jackets.js` renders front, back and spine; front-cover previews load after entering a room and backs/spines are typographic reconstructions. `src/book-interaction.js` supports first-click zoom, second-click book removal, face rotation and return to shelf with a restrained two-line card. Amazon links and personal notes are not shown. See [`docs/books.md`](docs/books.md).

- **Texts (English and German):** edit `src/content.js`. Keep both languages in step. The static English text in
  `index.html` must equal the English values. Proofreading list for German: `docs/german-copy-review.md`.
- **Pictures in the 3D model:** put a WebP file named after the slot into `public/slots/`, for example
  `public/slots/projects-board-3.webp`. No code change. Slot names, ratios and minimum sizes: `DESIGN.md`.
- **Sizes, spacing, radii, font sizes:** only the tokens in `src/tokens.css`. Run `npm run check` after style changes.
- **News (Latest):** the page shows `src/news-snapshot.json` at once and then tries the live feed of the AI in Medicine
  Monitor. To refresh the snapshot, run one of

  ```
  node scripts/update-news-snapshot.mjs                                   # from https://ai.gillespenning.com/data/news.json
  node scripts/update-news-snapshot.mjs ../ai-in-medicine-monitor/data/news.json   # from a local copy
  ```

  The script keeps approved items only, newest first, with id, date, title, summary and sources. Texts are never changed.

Book checks: `npm run check:books` validates the curated English editions and positions. The deployment also runs `npm run test:inspection`, which tests book lift/return and existing object interactions.\n\n## Privacy

No cookies and no analytics. The page stores only the language choice in `localStorage` and loads the news list from
`ai.gillespenning.com`. No legal imprint or privacy policy is included yet; the owner has to supply them.
