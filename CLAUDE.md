# CLAUDE.md: Family Learning Library

## What we are building
This is a private web app that costs nothing to run. It holds ALL the learning material I make for my 12-year-old in one place: coding, English, maths, physics, microprocessors and more.

It replaces single-file HTML lessons that are scattered across 3–4 devices. We are no longer limited to one self-contained file, so the app uses shared layouts, shared components, multi-page sections and one design system.

The system has four parts, and each has one job:
- **Vault**: this GitHub repo (public). It is the one master copy of all content.
- **Robot**: a GitHub Action (`.github/workflows/site.yml`). On every push to `main` it checks, builds and deploys. On pull requests it only checks and builds, to catch errors.
- **Shell**: a static site on **GitHub Pages**, installable as a PWA: https://arhaanbeta.github.io/learning-library-ayu/
- **Memory**: stores progress only, never content. There is no login. Planned: Firestore (Firebase Spark plan, set up in the Firebase console only, no Google Cloud console, no service account). If Firebase is unavailable, a different free store is plugged in behind the same small adapter (see Progress).

> Hosting changed from Firebase Hosting to GitHub Pages (Nov 2026): deploying to Firebase needs a Google Cloud service-account key, which the owner's Google Cloud account cannot create. GitHub Pages needs no extra account, no billing and no secret.

## Hard constraints (never break these)
- **Zero cost.** No billing account anywhere. No paid API or service.
- If Firebase is used for progress: **Spark** plan only. Never Cloud Storage, Cloud Functions, App Hosting or anything that needs Blaze.
- The build is static only. There is no server.
- Do not add analytics, trackers, ads or third-party cookies.
- **Keep security basic. Do not over-engineer it.** This is ordinary learning material, not private data.
  - There is NO login, NO sign-in screen and NO permission prompt, ever. The plain site link must just work on every device, every time.
  - There are no deploy secrets: GitHub Pages deploys with GitHub's built-in token.
  - Any Firebase *web config* is public by design, so commit it.
- The repo is public: never commit personal details (the child's full name, school, photos, address). Reader ids stay generic (`child`, `parent`). Check legacy files before importing them.
- Keep the site out of search engines, so strangers don't use up the free quota:
  - `noindex` meta tag on every page (in `BaseLayout.astro`).
  - `public/robots.txt` disallows everything. (On a GitHub Pages *project* site this file isn't at the domain root, so the `noindex` tag is the part that really works.)
- Use UK English everywhere, in both the UI and the content.
- Ask me before using any Firebase project ID. Never guess it.

## Stack
- **Astro 7** with content collections, MDX and strict TypeScript. Node 22 (`.nvmrc`).
- Content lives in `/content`, loaded with Astro's glob loader (`src/content.config.ts`).
- Interactive widgets are small islands in vanilla TS (Preact only if a widget really needs it, and only after asking). Keep JS light on content pages.
- Maths uses KaTeX (remark-math + rehype-katex via `unified()` in `astro.config.mjs`), rendered at build time. Code highlighting uses Astro's built-in Shiki.
- Search (Phase 4): Pagefind, static, runs in the browser.
- PWA (Phase 2): `@vite-pwa/astro`, so visited pages can be read offline.
- Site path: `site` and `base` in `astro.config.mjs` (`/learning-library-ayu`). Internal links always go through `url()` in `src/lib/url.ts`, so moving the site is a one-line change.
- GitHub Pages sends a short cache time for everything; hashed assets in `_astro/` are safe because their names change when they change.

## Content model: Subject → Section → Pages
Each subject is a complete area of the site. A subject has many sections, and each section has many pages. Each page covers one idea and takes 5–10 minutes to read.

```
content/
  physics/
    subject.json            # title, accent, icon, order, blurb
    forces/
      section.json          # title, order, summary
      01-what-is-a-force.mdx
      02-balanced-forces.mdx
  coding/
  maths/
  english/
  microprocessors/
```

`subject.json` → `accent` is a colour *name* from `src/lib/accents.ts` (teal, blue, violet, orange, green, rose); its light and dark values live in `src/styles/tokens.css`.

Page frontmatter is validated with zod:

```yaml
id: phy-forces-what-is-a-force   # PERMANENT. Never change or reuse. Progress is keyed on it.
title: What is a force?
summary: One plain-English line.
order: 1
minutes: 8
tags: [push, pull, newton]
legacy: /legacy/physics/levers.html   # optional, only for wrapped old files
```

- The subject and section come from the folder path. The page URL comes from the file name without its `01-` prefix.
- Filenames may change. The `id` may never change.
- The build fails if any page `id` is missing, badly formed or duplicated, or if a folder lacks its `subject.json` / `section.json`.

## Routes
- `/` shows "Continue where you left off" (Phase 2) and subject tiles with progress.
- `/[subject]/` is the subject home. It lists the sections, each with a progress bar (Phase 2).
- `/[subject]/[section]/` is the section's contents page.
- `/[subject]/[section]/[page]/` is a lesson page: breadcrumb, sidebar with the section's contents, previous and next links, "Mark as done" (Phase 2).
- `/search/` (Phase 4) and `/me/` (Phase 2: progress and switch reader; a parent view comes later).
- On the first visit on a device, show a one-tap "Who's learning?" picker (Phase 2), remembered in localStorage.

## Where things live (so refactors stay small)
- `src/styles/tokens.css`: every colour, size, space, radius and tap size. Light and dark. Subject accents.
- `src/styles/base.css` (page frame, buttons) and `src/styles/prose.css` (lesson text, code, maths): tokens only.
- `src/layouts/`: `BaseLayout` (head, header, footer, theme) → `LessonLayout` (breadcrumb, sidebar, prev/next, done spot).
- `src/components/`: shared pieces. `mdx.ts` lists the components every lesson can use without importing.
- `src/sims/`: interactive simulations, imported by the lessons that use them (`import X from '@sims/X.astro'`).
- `src/lib/content.ts`: the only code that reads the collections; builds the subject → section → page tree.
- Components use tokens, never raw colours or sizes. Lessons contain words and components, never styling.

## Shared components
Build each component once and use it everywhere from MDX:
- Callouts: `<KeyIdea>`, `<Tip>`, `<Remember>` and `<Warning>` (all share `Callout.astro`).
- `<RealWorld>`: a box for real-world examples.
- `<Figure caption="…">`: SVG diagrams with captions. Draw with `currentColor` and token variables so they work in dark mode.
- `<Sim title="…">`: a frame for small interactive simulations.
- `<Code code={…} lang="…">`: a code block with a copy button (plain ``` blocks get the button too). A sandboxed `<RunCode>` can come later.
- Phase 4: `<Term word="…">` (meanings from `content/glossary.json`) and `<SeeAlso>` (cross-links between subjects).

## Design
- Calm, focused and friendly to a child.
- Body text 18px or larger, lines 70ch or shorter, high contrast.
- Each subject has its own accent colour. All tokens live in `src/styles/tokens.css`. Light and dark mode (follows the device; a switch in the header remembers the choice per device).
- Tablet and phone first, then desktop. Tap targets at least 48px.
- Fast, with minimal JS on content pages.

## Progress (no login) — Phase 2
- No sign-in of any kind. Progress is shared across devices through one family space.
- Readers work like Netflix profiles, e.g. `child` and `parent`. Each device remembers its reader in localStorage.
- Always saved on the device first; cloud sync sits behind one adapter file, so the store can be swapped without touching pages.
- Data (Firestore shape; any other store keeps the same shape):
  - `family/main/readers/{readerId}`: name, lastPageId, updatedAt
  - `family/main/readers/{readerId}/progress/{pageId}`: status (`seen` | `done`), firstSeen, lastSeen, visits, secondsSpent
- Keep writes low: on "Mark as done", and when the reader leaves a page (`visibilitychange`). Never on scroll.
- Firestore rules: read/write only under `family/main/**` with simple checks on field names and sizes; deny everything else. Open-rules warning emails are expected. Worst case a stranger uses up the free quota; on Spark that pauses saving until the daily reset and never creates a bill.
- If the store is unreachable or offline, the site must still work fully.

## Legacy single-file lessons — Phase 3
- `inbox/` is the front door for old files (drag-and-drop on github.com).
- `scripts/import-legacy.ts`: moves each file to `public/legacy/<subject>/<slug>.html`, reads its `<title>`, creates a stub `.mdx` with `legacy:` in the frontmatter.
- The lesson layout shows legacy files in a full-height iframe with `sandbox="allow-scripts allow-same-origin allow-popups allow-forms"`.

## Writing style for new lessons
- Write for a bright 12-year-old, in UK English, with short sentences.
- Start with the intuition (why it works), then the structure, then the details.
- Explain every technical term in plain words the first time it appears (with `<Term>` once it exists).
- Keep every fact technically accurate. Simplify the words, never the facts.
- Prefer diagrams and small `<Sim>`s over walls of text.
- End each page with 2–3 real-world examples, using `<RealWorld>`.

## ON HOLD (do not build yet)
- Knowledge checks and recall questions.
- Spaced revision (FSRS) and "Today's Review".

Keep the door open: page `id`s stay stable, and the progress model can gain `family/main/readers/{readerId}/cards/{cardId}` later without migration.

## Phases
1. **Skeleton and deploy** (done): Astro project and schemas, layouts, navigation, tokens, core components, Physics → Forces (3 pages), GitHub Pages workflow. Done when a push to `main` updates the live site.
2. **Progress**: "Who's learning?" picker, store + rules, "Mark as done", "Continue", progress bars, PWA offline reading.
3. **Legacy import**: `inbox/`, the import script, the iframe wrapper.
4. **Search, glossary and cross-links**: Pagefind, `<Term>`, `<SeeAlso>`.

## How to work with me
- Build one phase at a time. Start each phase with a short plan, and wait for my OK.
- Make small commits with clear messages.
- Run `npm run check` (astro check) and `npm run build` before every push.
- When something needs me (GitHub settings, Firebase console), stop and give me numbered, click-by-click steps, with direct links, describing exactly what I will see.
- Explain decisions briefly, in simple English.
- Ask before adding any new dependency or service.
