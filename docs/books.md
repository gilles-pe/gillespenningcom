# Book collection - data, jackets, placements and maintenance

Updated 2026-11-20. The scene uses **21 selected English-language editions** (7 Writing & Speaking, 14 About Me).

## Where things live

- [`src/data/books.json`](../src/data/books.json) is the **single source of truth** for title, author, ISBN, room, placement, external cover preview, prospective Amazon link and personal note.
- [`src/book-jackets.js`](../src/book-jackets.js) renders three textured surfaces for every book: front, back, spine.
- [`src/scene.js`](../src/scene.js) places those meshes in the shelves; [`src/viewer.js`](../src/viewer.js) triggers cover preview loading **only after entering About Me or Writing & Speaking**.
- The photo album (`src/book-album.js`) is a separate interactive object and is not one of the 21 books.

## What is real and what is reconstructed

| Surface | Current implementation | Next step for genuine wraparound artwork |
| --- | --- | --- |
| Front | English-edition ISBN-based **Open Library preview** (`coverImage`), with title/author fallback; not all remote image URLs were independently checked for a successful image response | Inspect each book in the browser; replace unavailable or mismatched previews with an approved, edition-correct source |
| Back | Locally generated typographic panel (`backSurface: "generated"`), **not an original jacket scan** | If rights and genuine book-jacket imagery can be confirmed, set `backImage` to the approved image URL |
| Spine | Locally generated vertical title/author (`spineSurface: "generated"`), **not an original publisher spine** | If rights and genuine spine artwork can be confirmed, set `spineImage` to the approved image URL |

This is deliberately not a claim that the original back and spine are already available. The front previews are looked up using ISBNs of researched English editions, but covers can differ across variants and the Open Library API can return an unavailable image. A failed image load does **not** hide the book.

The Open Library Covers API is designed for displaying book covers and discourages bulk downloading. The site loads previews on user entry into a room, not on page arrival. Displaying remote book images makes requests to an external host; check the privacy notice before publication. Do not bulk-copy cover art into this Git repository without verifying image rights.

Source: https://openlibrary.org/dev/docs/api/covers

## Two-line descriptions and writing style

- `summary.en` is short, factual, in English and limited to roughly two lines by the CSS `-webkit-line-clamp`. It is a fresh paraphrase of publicly available publisher/product descriptions; it is not a verbatim Amazon sales blurb and not a personal recommendation.
- `summarySourceUrl` records the relevant publisher or book-description page used for research. Prefer an edition-correct publisher page; Amazon is not required.
- Style guide: concise, restrained and specific; no hype, no canned phrases, no claims about Gilles having read or endorsed the book. References: his Google Drive `writing_style_substack.md` and `gilles-wortliste-substack-2026.md`, read on 2026-11-20.
- `personalNote` is retained as a reserved field but **not displayed** until Gilles supplies his own words.

## CSS and interaction design

- `src/style.css`: `.book-inspector-card` uses `color-mix(in srgb, var(--paper) 86%, transparent)`, backdrop blur 10px, 1px hairline and `var(--r1)` (6px). These follow the existing `.pop-card` design and `DESIGN.md` instead of creating a second visual system.
- Font: Source Serif 4 for the title, Source Sans 3 for other text; font sizes, spacing, radius and control heights are existing tokens. Buttons have 48px hit targets on mobile. Reduced-motion removes card animations and book snapping honours the viewer preference.
- Interaction code: `src/book-interaction.js`, connected from `src/viewer.js`. 3D cards do not change the separate album, photo, project, ship and globe interactions.
- No personal description, rating, purchase prompt or external link appears until actually supplied and verified.

## Editing fields

| Field | Rule |
| --- | --- |
| `id` | Stable and unique. Do not rename once used by the renderer. |
| `title`, `author` | Always show **English-language edition** title and author(s). Never switch to German or another translation in the book model. |
| `editionLanguage` | Always `"en"`. |
| `isbn13` | 13-digit ISBN of the selected English-language edition. Research publisher/edition before changing. |
| `editionSourceUrl` | Public page used to support the edition and ISBN. |
| `room` | `"about"` or `"writing"`. |
| `placement.anchor` | Stable semantic shelf group, mapped to actual geometry in `scene.js`. |
| `placement.orientation` | `"upright"`, `"horizontal"`, `"leaning"`. |
| `placement.order` | Unique, 1-based integer per anchor; 1 is lowest in a stack. |
| `coverImage` | Front-cover image URL. Currently Open Library ISBN lookup. Can be a reviewed local asset in the future. |
| `coverImageStatus` | `"unverified"` until image content and edition match have been checked; do not change merely because the URL looks valid. |
| `backImage`, `spineImage` | `null` until actual, licensed/approved images are provided; renderer uses reconstructed text if empty. |
| `backSurface`, `spineSurface` | `"generated"` means typography, not publisher artwork. |
| `amazonUrl` | Exact edition-specific URL when verified; do not fill from title or fabricate an affiliate tag. |
| `summary.en` | Neutral two-line English synopsis, based on publisher descriptions, never an owner's opinion. |\n| `summarySourceUrl` | Public research source for that synopsis. |\n| `personalNote.en`, `personalNote.de` | Reserved owner-authored note, both `null` and currently NOT displayed. Never fabricate first-person recommendations. |

Example:

```json
{
  "id": "the-wright-brothers",
  "title": "The Wright Brothers",
  "author": "David McCullough",
  "editionLanguage": "en",
  "room": "about",
  "placement": { "anchor": "about-globe-adjacent", "orientation": "horizontal", "order": 1 },
  "isbn13": "9781476728742",
  "amazonUrl": null,
  "coverImage": "https://covers.openlibrary.org/b/isbn/9781476728742-M.jpg?default=false",
  "backImage": null,
  "spineImage": null,
  "personalNote": { "en": null, "de": null }
}
```

## Book positions

| Anchor | Position | Count |
| --- | --- | ---: |
| `writing-shelf-display-left` | Writing & Speaking - 4 standing books | 4 |
| `writing-shelf-display-right-stack` | Writing & Speaking - 3 lying books | 3 |
| `about-cabinet-upper-left` | About Me - 3 standing books on the upper open shelf | 3 |
| `about-cabinet-lower-left` | About Me - 3 standing books on the lower open shelf | 3 |
| `about-cabinet-lower-right-stack` | About Me - 3 lying books on the lower open shelf | 3 |
| `about-cabinet-top-upright` | About Me - 3 standing books on top of cabinet | 3 |
| `about-cabinet-top-leaning` | About Me - one leaning book on cabinet | 1 |
| `about-globe-adjacent` | About Me - **The Wright Brothers lying beside the globe** | 1 |

The globe is **inside the lower open shelf**, not on the top of the cabinet. `The Wright Brothers` is therefore added on the same shelf, next to the globe, while the album, ship and trophies stay in place.

## Still open

1. Check every front preview in a desktop and mobile browser for correct edition, readable artwork and correct image orientation. ISBNs were researched; external image responses have not been batch-verified.
2. Find and review authentic back-jacket and spine images if desired, case by case. Leave the generated back/spine in place where there is no suitable image.
3. **Implemented**: Every book mesh has stable `userData.bookId`. First click frames the real book; second lifts it out of the shelf and turns its cover toward the visitor. An HTML card appears with English title, author and a publisher-based, two-line neutral synopsis. The card provides Cover / Spine / Back view controls and Return to shelf. Repeated clicks on the lifted book cycle faces. Returning, Escape, BACK, Reset and room changes restore the original geometry. Reduced motion snaps instead of animating. Personal opinions remain absent, and no empty Amazon link appears.
4. Verify 3D bookshelf spacing (particularly the book beside the globe), surfaces, lighting and performance on phone and desktop.
5. Run `npm run check:books`, `npm run check`, `npm run test:inspection`, and `npm run build`. These are now GitHub Pages build gates, including an automated 21-mesh book lift/return test.
6. Review the site's privacy notice for third-party Open Library image requests before wider publication.

## Excluded titles

Do not re-add `Aftershocks`, `Nexus`, `Civilization: The West and the Rest` or `Dungeon Crawler Carl` unless the owner asks.
