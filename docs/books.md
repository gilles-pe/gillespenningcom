# Books in the four-room site

This file is the maintenance and integration guide for the personal book collection on `gillespenning.com`.

## Source of truth

- **Catalog:** [`src/data/books.json`](../src/data/books.json) - 21 curated books, 7 in **Writing & Speaking**, 14 in **About Me** (13 existing decorative positions plus **The Wright Brothers**).
- Use English-language **editions and titles only** for every book, including originally German- or Russian-language works. For example: `Project Hail Mary`, `The Master and Margarita`, `Fathers and Sons`.
- The existing 3D scene currently uses decorative geometry defined in [`src/scene.js`](../src/scene.js). **The JSON is catalog data and is not wired into the scene yet.** Adding the data does not make titles, covers or links appear on the website.
- The existing photo album (`src/book-album.js`) is **not a catalog book** and must stay untouched.

## Editing a book

Find the object with its stable `id` and edit:

| Field | Purpose |
| --- | --- |
| `id` | Stable unique identifier. Never change after it is used in the UI. |
| `title`, `author` | English edition's title, credited authors. |
| `editionLanguage` | Always `en`. |
| `room` | `about` or `writing`. |
| `placement.anchor` | Named 3D group/slot (see below), not hardcoded world coordinates. |
| `placement.orientation` | `upright`, `horizontal`, or `leaning`. |
| `placement.order` | 1-based ordering within a named anchor; for a stack, 1 means bottom. |
| `isbn13` | Exact ISBN-13 of the **chosen English edition**, initially `null`. Do not guess. |
| `amazonUrl` | Exact verified URL for that edition, initially `null`. Do not generate from title alone. |
| `coverImage` | Approved local cover path (e.g. `/covers/example.webp`), initially `null`. Never assume online cover artwork is licensed for reuse. |
| `personalNote.en`, `personalNote.de` | Owner-authored one- or two-sentence personal note in the corresponding UI language, initially `null`. Do not fabricate first-person commentary. The book itself remains an English edition. |

For a book without a note or link, keep `null`. Avoid filler text on the live site. Do not invent reviews, endorsements, personal notes or editorial descriptions in the owner's voice.

### Example: The Wright Brothers

```json
{
  "id": "the-wright-brothers",
  "title": "The Wright Brothers",
  "author": "David McCullough",
  "editionLanguage": "en",
  "room": "about",
  "placement": {
    "anchor": "about-globe-adjacent",
    "orientation": "horizontal",
    "order": 1
  },
  "isbn13": null,
  "amazonUrl": null,
  "coverImage": null,
  "personalNote": { "en": null, "de": null }
}
```

## Placement anchors

These are **semantic placements** for the future mapping of catalog entries onto scene geometry. The other 20 placements correspond to the existing visual arrangement (not yet individual named book meshes).

| Anchor | Existing/planned position | Capacity |
| --- | --- | ---: |
| `writing-shelf-display-left` | Writing & Speaking, four standing books | 4 |
| `writing-shelf-display-right-stack` | Writing & Speaking, three-book horizontal stack | 3 |
| `about-cabinet-upper-left` | About Me, three standing books in upper open shelf | 3 |
| `about-cabinet-lower-left` | About Me, three standing books in lower open shelf | 3 |
| `about-cabinet-lower-right-stack` | About Me, three-book horizontal stack | 3 |
| `about-cabinet-top-upright` | About Me, three standing books on top | 3 |
| `about-cabinet-top-leaning` | About Me, the additional leaning book on top | 1 |
| `about-globe-adjacent` | **New position** for `The Wright Brothers`: lying flat beside the antique globe | 1 |

**Important positioning detail:** the live code currently places the antique globe in the open shelf at the top of the lower cabinet, **not on top of the whole bookshelf**. The owner wants `The Wright Brothers` beside the globe. Implement the book *with the globe*, or explicitly agree a new shared top position before changing the scene. Do not place it remotely from the globe merely to satisfy an outdated label.

## Future 3D implementation instructions

1. Load `src/data/books.json` into the rendering code; preserve the catalog as the sole source of title, author, room, personal note and shop link. Do not duplicate this information in `scene.js` or `content.js`.
2. Map each `placement.anchor` to a specific real shelf group/geometry in `src/scene.js`. Preserve the existing 20 book positions; add the extra `about-globe-adjacent` placement as a new mesh. Respect orientation and order. Reserve enough physical width to keep titles legible under close inspection.
3. Use the established **zoom-first, second-click action** rules in `AGENTS.md`: first click frames the real book, second click reveals its detail card; only a deliberate action in the card opens an external Amazon URL. Do not auto-open shopping sites.
4. Detail card should show English title, author, optional approved cover, owner note (EN/DE when present) and the verified Amazon link if set. Do not show broken buttons or empty notes when values are `null`.
5. Use stable `id` for interactions. Avoid using array index as the identity, so changing shelf order does not break cards or anchors.
6. Respect image rights, site privacy and existing brand/design rules. Keep the album interaction unchanged.
7. When changing the visual model, run `npm run check`, `npm run test:inspection` and `npm run build`, followed by desktop/mobile visual checks.

## Adding or moving books

1. Edit `src/data/books.json` (one entry per book), with a unique `id`.
2. Keep English titles/editions. When an exact edition is selected, add its ISBN-13 and the correct Amazon product URL. Affiliate links only after explicit approval and applicable disclosure.
3. Choose a semantic `placement.anchor` and a unique `order` within it; if the shelf needs more capacity, update the 3D model in a separate, reviewed change.
4. Personal notes are owner-written; `null` is valid.
5. Verify JSON parses and check the shelf capacity/order. Change the render integration separately if needed.

### Explicit exclusions

Do **not** re-add `Aftershocks`, `Nexus`, `Civilization: The West and the Rest` or `Dungeon Crawler Carl` unless the owner asks. These were removed during curation.

_Last curated: 2026-11-20._
