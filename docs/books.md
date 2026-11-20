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
| `personalNote.en`, `personalNote.de` | Owner-authored one- or two-sentence remark, both initially `null`. Never fabricate first-person recommendations. |

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
3. The book meshes now have stable `userData.bookId`, but **per-book click cards are not yet implemented**. When implementing, follow the existing zoom-first/second-click rule from `AGENTS.md`, show optional owner notes only when provided, and put external Amazon navigation behind a deliberate card action.
4. Verify 3D bookshelf spacing (particularly the book beside the globe), surfaces, lighting and performance on phone and desktop.
5. Run `npm run check`, `npm run test:inspection`, and `npm run build` when checking local changes. Ensure live deployment succeeds.
6. Review the site's privacy notice for third-party Open Library image requests before wider publication.

## Excluded titles

Do not re-add `Aftershocks`, `Nexus`, `Civilization: The West and the Rest` or `Dungeon Crawler Carl` unless the owner asks.
