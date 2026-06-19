# SV2 Project State

**Project:** BioSphere Kids / SV2 Science Lessons  
**Current state:** Static JSON lesson engine with six lessons, agent-operated image workflow, SEO snapshots, print assets, validation, hashes, and receipts  
**Last updated:** 2026-06-11

## Current Architecture

SV2 is a lightweight static site that publishes elementary science lessons from structured JSON objects. The visible site is one browser shell; the product system is the repeatable production loop around it:

```text
Lesson JSON -> Manifest -> Browser Renderer -> Print CSS -> SEO Snapshots -> Sitemap/Routes -> Validation -> Checkpoint Receipt
```

The image-production loop is agent-operated:

```text
imageQuery -> Provider Candidates -> Agent Selection -> Source Cache -> Codex Imagegen Print Asset -> Validation
```

Core files:

- `index.html` is the single-page lesson renderer.
- `lessons/manifest.json` is the lesson registry and default selector.
- `lessons/lesson-01.json` through `lessons/lesson-06.json` are the current lesson objects.
- `lessons/lesson_template.json` is the scaffold used by `scripts/create_lesson.js`.
- `assets/images/` contains local print PNG assets.
- `assets/source-images/` can cache selected screen sources for imagegen conversion.
- `image-candidates/` can hold agent-reviewed provider candidate reports.
- `print-asset-work-orders/` can hold imagegen handoff instructions.
- `seo-snapshots/` contains static crawlable lesson pages.
- `sitemap.xml`, `robots.txt`, `_redirects`, and `netlify.toml` support clean lesson URLs.
- `scripts/` contains lesson creation, image candidate search, print-asset preparation, SEO generation, validation, hashing, receipts, and checkpoint tooling.
- `logs/` contains validation, hash, and receipt artifacts.

No bundler, framework, database, login system, or runtime AI API is required for the core product.

## Current Lesson Inventory

| ID | Title | Sections | Image Queries | Notes |
|---|---|---:|---|---|
| `lesson-01` | Plants & Animals | 5 | present | baseline science lesson |
| `lesson-02` | Food Chains | 5 | present | ecosystem sequence lesson |
| `lesson-03` | Ecosystems & Interdependence | 5 | present | interdependence lesson |
| `lesson-04` | The Water Cycle | 5 | present | water cycle lesson with cached source-image workflow |
| `lesson-05` | Trees | 5 | present | tree structure and benefits lesson |
| `lesson-06` | Habitats | 5 | present | habitat comparison lesson |

The manifest registers six lessons and defaults to `lesson-01`.

## Renderer Contract

The renderer is not a blank page builder. It is a fixed, reusable lesson shell with stable regions:

- topbar brand
- teacher mode toggle
- lesson selector
- previous/next lesson controls
- print button
- jump navigation
- hero media and hero copy
- fixed section regions `s1` through `s5`
- card slots inside each section
- prompt slots, including the section-5 `promptE` / `promptF` pattern
- per-lesson autosave for textareas
- localStorage persistence for teacher mode, current lesson, and answers

Important JavaScript functions in `index.html`:

- `normalizePexelsImageUrl()`
- `initTeacherToggle()`
- `initAutosave()`
- `fetchJSON()`
- `setHeroMedia()`
- `setSectionMedia()`
- `applyLesson()`
- `initLessons()`
- `loadLesson()`

Future agents should preserve this fixed five-section shell unless explicitly asked to refactor the renderer.

## Lesson Object Contract

Each `lesson-XX.json` file uses:

- `id`
- `meta`
- `hero`
- `heroCopy`
- `sections`

Required behavior:

- `id` matches the filename.
- `meta.kicker` contains lesson number, duration, grade band, and print-ready status.
- `hero.imageQuery` gives the agent an image search query.
- `hero.screenImage` points to the selected screen image.
- `hero.printImage` points to a local print asset.
- `heroCopy` contains lede, learning summary, learning targets, directions, and vocabulary.
- `sections` contains exactly five sections for the current renderer.
- Each section has `id`, `chip`, `imageQuery`, `screenImage`, `printImage`, `title`, `lede`, `cards`, and at least one prompt.
- Section 5 may use `promptE` and `promptF`; the renderer and SEO generator support both.
- Prompt objects include `label`, `hint`, `placeholder`, and `teacherKey`.

Validation now fails when required `imageQuery` fields are missing.

## Agent-Operated Image Workflow

`scripts/create_lesson.js` is scaffold-only. It must not call Pexels, call Pixabay, choose images, create print assets, or use image generation.

Canonical lesson image workflow:

1. Fill lesson content and `imageQuery` fields.
2. Run the optional provider helper:

```bash
node scripts/search_lesson_images.js --lesson lesson-XX
```

3. Review generated candidates.
4. Select one provider image per slot.
5. Update `screenImage` fields.
6. Cache selected sources and create an imagegen handoff:

```bash
node scripts/prepare_print_assets.js --lesson lesson-XX
```

7. Use the agent's native image generator, preferably Codex imagegen, to convert each cached source into a black-and-white coloring-page PNG.
8. Save each generated PNG exactly to its `printImage` path.

Do not read or expose `scripts/.env`. Helper scripts may use it at runtime, but keys must never be printed, summarized, or committed.

## SEO And Routing

The SEO layer is generated by:

```bash
node scripts/generate_seo.js
```

Generated outputs:

- `seo-snapshots/lesson-01.html` through `seo-snapshots/lesson-06.html`
- `sitemap.xml` with root plus six clean lesson URLs
- `robots.txt` pointing at the sitemap
- `_redirects` with explicit Netlify rewrite rules
- `SEO_GENERATION_REPORT.md`

Route behavior:

- Interactive SPA: `/?lesson=lesson-06`
- Static SEO snapshot: `/lesson/lesson-06`
- Netlify rewrite source of truth: `_redirects`
- `netlify.toml` is retained as a fallback and uses valid `[[redirects]]` syntax.

Run the SEO generator after every lesson edit.

## Print Layer

The product promise is: modern web lesson on screen, clean worksheet on paper.

`index.html` contains the print layer under `@media print`.

Important behavior:

- hides app chrome and screen-only controls
- sets `@page` to letter
- locks hero and section media sizing
- swaps screen background images for local print images
- forces section page breaks
- avoids Chromium flex/grid print fragmentation problems
- keeps prompt boxes usable on paper

Local print assets are required for every hero and section image. Validation checks that these files exist.

## Tooling

| Script | Purpose |
|---|---|
| `scripts/create_lesson.js` | Scaffolds a new lesson from `lesson_template.json` and appends it to the manifest |
| `scripts/search_lesson_images.js` | Optional agent-run provider candidate helper; uses local provider keys at runtime without printing them |
| `scripts/prepare_print_assets.js` | Caches selected screen sources and writes imagegen work orders |
| `scripts/update_manifest.js` | Rebuilds `manifest.json` from `lesson-XX.json` files |
| `scripts/generate_seo.js` | Builds snapshots, sitemap, robots, redirects, and SEO report |
| `scripts/validate_project.js` | Validates repo files, template, lesson contracts, image queries, print assets, SEO artifacts, routes, and logs |
| `scripts/hash_project.js` | Hashes project files while excluding logs, hidden files, and env files |
| `scripts/create_receipt.js` | Writes timestamped project receipts |
| `scripts/checkpoint.js` | Runs hash, validation, and receipt in one command |
| `scripts/sv2.js` | Project CLI for doctor, status, syntax, SEO, validation, checkpoint, and PR readiness gates |
| `scripts/test_image_providers.js` | Historical provider test helper; requires local env configuration |

## Quality Gates

Run these after meaningful changes:

```bash
node scripts/sv2.js seo
node scripts/sv2.js validate
node scripts/checkpoint.js \
  --session "descriptive-session-name" \
  --worker "Agent Name" \
  --summary "What changed" \
  --created "new-file.ext" \
  --modified "changed-file.ext" \
  --next "Recommended next action"
```

For pull requests and CI-style no-write checks:

```bash
node scripts/sv2.js pr-ready
node scripts/sv2.js seo --check
node scripts/sv2.js validate --no-write
```

Validation checks:

- required project files
- required agent production protocol
- lesson template contract
- lesson JSON parsing
- lesson schema contract
- required `imageQuery` fields
- fixed five-section renderer contract
- prompt and teacher-key presence
- local print image existence
- manifest integrity
- SEO snapshot coverage
- sitemap URL coverage
- `_redirects` coverage
- `netlify.toml` redirect syntax
- checkpoint log directories

## Known Caveats

- The app is intentionally static. Do not add a backend, dashboard, auth system, database, payment flow, or runtime AI service before preserving the static engine loop.
- Screen image URLs are external and are not fetched by the default validation command.
- The renderer uses a fixed five-section shell. A fully dynamic section renderer would be a deliberate refactor.
- Historical summary documents may describe older states. Treat this file and `AGENT_LESSON_PRODUCTION_PROTOCOL.md` as the current operating truth.

## Agent Onboarding Summary

1. Read `AGENT_LESSON_PRODUCTION_PROTOCOL.md` and this file first.
2. Inspect `index.html`, `lessons/manifest.json`, `lessons/lesson_template.json`, and one current lesson JSON.
3. Preserve the fixed `s1` through `s5` renderer contract unless explicitly asked to refactor it.
4. Create new lessons with `scripts/create_lesson.js`.
5. Fill lesson JSON before changing renderer code.
6. Use provider candidates and source-based imagegen for print assets.
7. Run `node scripts/generate_seo.js`.
8. Run `node scripts/validate_project.js`.
9. Run `node scripts/checkpoint.js` with a clear session name and receipt summary.
10. Do not read `.env` files or expose secrets.
