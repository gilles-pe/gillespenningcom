# AGENTS.md - Instructions for AI collaborators
Version: 0.1 | Date: 2026-11-16

## Mission
Build and maintain the personal landing page of Gilles Penning at `gillespenning.com`.
It is an orientation layer above his projects and a portfolio that makes visitors
curious about the person. It serves four goals at once:

1. Reference for job applications.
2. Speaker bookings.
3. Positioning as an expert.
4. Promotion of his projects.

## Status
Draft phase, publishing prepared. A first version of the home page exists on the branch `draft/four-room-home`
(Vite and Three.js, four-room model). Direction, projects and confirmed links are in
`docs/decisions.md`. `PRODUCT.md` has not been written yet.

## Read before work
1. This file.
2. `docs/decisions.md` - dated owner decisions and open questions. Decisions there are binding.
3. `TODO.md` - active backlog.
4. `DESIGN.md` - palette, fonts and image slots.
5. `docs/design-review.md` - latest design review with open points.
6. `PRODUCT.md` - who the page is for and what it must do (does not exist yet, see Design tooling).

## Projects the page presents
- **AI in Medicine Monitor** - live at `https://ai.gillespenning.com`, repository
  `gilles-pe/ai-in-medicine-monitor`. It has its own strict evidence rules. This page
  links to it and may quote it, but never restates or re-interprets its evidence.
  Any quantified claim about medical AI links to the monitor or the original source.
- **Wimmelbild** - live at `https://wimmelbild.gillespenning.com/en/`.
- **DocEase** and **Elbstrand** - name only until the owner supplies text and links.

## Design constraints - binding (owner decision 2026-11-16)
The owner wants a small, fixed set of sizes so the page stays consistent over time.
The limits on the number of steps are decided. The exact values are provisional until
the visual direction is set, and are then recorded in `DESIGN.md`.

| Scale | Limit | Provisional values |
|---|---|---|
| Spacing | 7 steps | 4, 8, 16, 24, 40, 64, 104 px |
| Corner radii | 3 steps | 0, 6 px, full (pill) |
| Control heights | 3 steps | 32, 40, 48 px |
| Font sizes | 6 steps | 14, 16, 20, 28, 40, 64 px |
| Font families | 2 | undecided |
| Colours | 1 accent plus neutrals, each with a light and a dark variant | undecided |
| Shadows | 1 step at most | undecided |

Rules:
- Every value lives once, as a CSS custom property in a single token file.
- Components use tokens only. No raw pixel, colour or radius values in component code.
- No in-between values. If a layout seems to need one, change the layout.
- Adding, removing or changing a step needs an owner decision logged in `docs/decisions.md`.
- `npm run check` (`scripts/check-tokens.mjs`) fails on off-scale values in `src/style.css`. Run it before declaring
  work ready. Its documented exceptions (0, 1px and 2px hairlines) are listed at the top of the script.

## Design tooling - Impeccable
The Impeccable design skill is vendored in `.claude/skills/impeccable/` with its
subagents in `.claude/agents/` (skill version 4.9.2, upstream commit `d41d986`,
Apache 2.0, see `LICENSE` and `NOTICE.md` in the skill folder). Use `/impeccable` for
design, critique, audit and polish work.

- `PRODUCT.md` is written through the `/impeccable init` interview with the owner.
  Do not write it from assumptions.
- `DESIGN.md` is written when the visual direction is established. It must stay inside
  the limits in the table above.
- The skill's launcher downloads a prebuilt engine binary from the Impeccable GitHub
  releases on first use and verifies it against `scripts/engine-checksums.txt`.
- The automatic design hook (runs that engine after every edit) is **not** enabled.
  Enabling it is an owner decision. Do not add hooks to `.claude/settings.json` without it.
- Do not edit the vendored skill files. To upgrade, replace the folder from upstream
  and record the new version and commit here.

## Operating rules
- Plan before building. Never program or redesign unless asked.
- Never invent facts about the owner: positions, employers, degrees, talks, clients,
  testimonials, press, logos, numbers or dates. If it is not supplied by the owner, ask.
- Publish only contact details and personal information the owner has approved for this page.
- Keep content (texts, projects, talks) separate from code, so the owner can edit it
  without programming.
- Avoid exaggerated claims. The tone is credible and concrete, like the monitor.
- Log every owner decision in `docs/decisions.md` with its date. Never infer approval
  from silence.

## Image slots
- Pictures in the 3D model are swapped only by slot filename: put `public/slots/<slot>.webp` in place. Never edit image code for a content swap.
- Slot names, aspect ratios and minimum sizes are listed in `DESIGN.md` and in `public/slots/README.md`.
- A new picture surface needs a row in `DESIGN.md` and an entry in the `SLOTS` table in `src/scene.js`.

## Hosting and domain
`gillespenning.com` is reserved for this site. The monitor stays on the subdomain
`ai.gillespenning.com` and must keep working.

- Stack: Vite and Three.js, static build into `dist/` (`npm run build`).
- Target: GitHub Pages, deployed by `.github/workflows/pages.yml` on push to `main` (and manual dispatch).
  `public/CNAME` holds the domain. Nothing is live until the owner enables Pages (source "GitHub Actions") and merges to `main`.
- The domain switch (DNS of `gillespenning.com`) is an owner step and must not touch `ai.gillespenning.com`.
- No analytics, no cookies, no external fonts or scripts. The page stores only the language choice and loads the news list
  from `ai.gillespenning.com` (see D-020). Legal imprint and privacy policy are not written: the owner supplies them.
