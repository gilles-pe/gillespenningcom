# Book catalog and scene audit, 2026-11-23

Source snapshot: `5ac9390675c3bbfa8fc9660f51e5aaa8f09f1a93`. Catalog: `src/data/books.json`.
27 entries: 11 Writing & Speaking, 16 About Me. All 54 referenced small/large cover files exist in the source tree: true.
The viewer regression test checks 27 distinct physical meshes against every catalog ID, title, room bounds, shelf order and front/spine/back material placement. The browser check additionally captures all covers for visual inspection and checks upright, leaning and lying book interaction from two angles on desktop/mobile.

## Findings
- README still said 21 editions and said personal notes were not shown. Corrected to 27, correct room counts, central catalog and separate bilingual personal notes.
- DESIGN.md still described the removed book card and 21 books (14/7). Corrected to current 27-book, card-free behavior.
- docs/books.md still claimed separate book buttons existed. Corrected to D-114.
- The cover provenance table in docs/books.md contains 23 rows, omitting Bloodlands, Guns, Germs, and Steel, Predictably Irrational and The Innovator's Dilemma; their structured entries and sources are present in the authoritative catalog and the later added-titles paragraph. No catalog entries were missing for these four.
- Eight covers are explicitly AI-retouched user images: The WEIRDest People in the World, The Hard Sell, The Fortress, The Moral Animal, The Body, Red Plenty, A (Very) Short History of Life on Earth, We Are Legion (We Are Bob). They must not be described as untouched publisher art.
- We Are Legion (We Are Bob): existing research records that its retouched image differs from the publisher artwork for ISBN 9781668221570. Exact edition matching remains unresolved. Do not silently swap it or mark it verified.
- All 27 Amazon URLs are null; all spines and backs are generated rather than original publisher scans. These are documented missing data, not fabricated replacements. Only Riding the Waves of Culture now has approved personal wording.
- During a language refresh, viewer.open previously returned an extracted book to its shelf. Fixed only for a same-room keepView refresh so the back can switch languages in place.
- Cover images, catalog titles/authors/ISBNs and shelf positions are unchanged by this update. Independent visual/edition limits remain as recorded in the catalog; file existence alone does not establish an exact edition match.

## Complete mapping
| ID | English title | Author | Room | Anchor / order / orientation | Cover |
| --- | --- | --- | --- | --- | --- |
| factfulness | Factfulness | Hans Rosling, Ola Rosling, Anna Rosling Rönnlund | writing | writing-shelf-display-left / 1 / upright | publisher-image-edition-matched |
| thinking-fast-and-slow | Thinking, Fast and Slow | Daniel Kahneman | writing | writing-shelf-display-left / 2 / upright | open-library-image-edition-matched |
| sapiens | Sapiens: A Brief History of Humankind | Yuval Noah Harari | writing | writing-shelf-display-left / 3 / upright | bookseller-image-edition-matched |
| the-weirdest-people | The WEIRDest People in the World | Joseph Henrich | writing | writing-shelf-display-left / 4 / upright | user-image-ai-retouched |
| eve | Eve: How the Female Body Drove 200 Million Years of Human Evolution | Cat Bohannon | writing | writing-shelf-display-right-stack / 1 / horizontal | open-library-image-edition-matched |
| everything-is-tuberculosis | Everything Is Tuberculosis | John Green | writing | writing-shelf-display-right-separate / 1 / horizontal | publisher-image-edition-matched |
| the-hard-sell | The Hard Sell | Evan Hughes | writing | writing-shelf-display-right-stack / 2 / horizontal | user-image-ai-retouched |
| the-fortress | The Fortress: The Great Siege of Przemyśl | Alexander Watson | about | about-cabinet-upper-left / 1 / upright | user-image-ai-retouched |
| prisoners-of-geography | Prisoners of Geography | Tim Marshall | about | about-cabinet-upper-left / 2 / upright | open-library-image-edition-matched |
| autocracy-inc | Autocracy, Inc. | Anne Applebaum | about | about-cabinet-upper-left / 3 / upright | publisher-image-edition-matched |
| the-last-unicorn | The Last Unicorn | Peter S. Beagle | about | about-cabinet-lower-left / 1 / upright | publisher-image-edition-matched |
| the-moral-animal | The Moral Animal | Robert Wright | about | about-cabinet-lower-left / 2 / upright | user-image-ai-retouched |
| the-body | The Body: A Guide for Occupants | Bill Bryson | about | about-cabinet-lower-left / 4 / upright | user-image-ai-retouched |
| red-plenty | Red Plenty | Francis Spufford | about | about-cabinet-lower-right-stack / 1 / horizontal | user-image-ai-retouched |
| a-very-short-history-of-life-on-earth | A (Very) Short History of Life on Earth | Henry Gee | about | about-cabinet-lower-right-stack / 3 / horizontal | user-image-ai-retouched |
| the-wandering-earth | The Wandering Earth | Cixin Liu | about | about-cabinet-lower-right-stack / 2 / horizontal | publisher-image-edition-matched |
| the-master-and-margarita | The Master and Margarita | Mikhail Bulgakov | about | about-cabinet-top-upright / 1 / upright | publisher-image-edition-matched |
| fathers-and-sons | Fathers and Sons | Ivan Turgenev | about | about-cabinet-top-upright / 2 / upright | publisher-image-edition-matched |
| we-are-legion-we-are-bob | We Are Legion (We Are Bob) | Dennis E. Taylor | about | about-cabinet-top-upright / 3 / upright | user-image-ai-retouched |
| project-hail-mary | Project Hail Mary | Andy Weir | about | about-cabinet-top-leaning / 1 / leaning | open-library-image-edition-matched |
| the-wright-brothers | The Wright Brothers | David McCullough | about | about-globe-adjacent / 1 / horizontal | publisher-image-edition-matched |
| bloodlands | Bloodlands: Europe Between Hitler and Stalin | Timothy Snyder | about | about-cabinet-top-upright / 4 / upright | open-library-image-edition-matched |
| guns-germs-and-steel | Guns, Germs, and Steel | Jared Diamond | writing | writing-shelf-display-middle / 1 / upright | open-library-image-edition-matched |
| predictably-irrational | Predictably Irrational | Dan Ariely | writing | writing-shelf-display-middle / 2 / upright | open-library-image-edition-matched |
| the-innovators-dilemma | The Innovator’s Dilemma | Clayton M. Christensen | writing | writing-shelf-display-middle / 3 / upright | open-library-image-edition-matched |
| riding-the-waves-of-culture | Riding the Waves of Culture: Understanding Cultural Diversity in Business | Fons Trompenaars, Charles Hampden-Turner | writing | writing-shelf-display-middle / 4 / upright | open-library-image-edition-matched |
| leviathan-wakes | Leviathan Wakes | James S. A. Corey | about | about-cabinet-lower-left / 3 / upright | open-library-image-edition-matched |

## Validation evidence
The book metadata/assets check, exact-approved-copy and no-clipping layout check, token check, geometry/viewer regression test and production build run before publication. Browser captures and a machine-readable audit report are produced by `scripts/verify-book-browser.mjs` in the Book browser review workflow; its post-deployment run verifies the live build and records desktop/mobile screenshots. Their workflow conclusions, not this document's intentions, determine pass/fail.
