# Repository Analysis

**Project:** SV2 Science Lessons / BioSphere Kids  
**Date:** 2026-06-11  
**Status:** Current architecture analysis after workflow hardening

## Executive Summary

SV2 is a static educational content engine. It uses structured lesson JSON as the source of truth, a single `index.html` renderer as the app shell, local print images for worksheet output, generated SEO snapshots for clean crawlable lesson URLs, and checkpoint tooling for agent handoff.

The important architecture decision is that lesson production is agent-operated while the shipped app stays static. The coding agent scaffolds content, reviews provider image candidates, chooses screen images, converts selected source images into print-safe coloring-page assets with native imagegen, regenerates SEO, validates, and records a receipt. The app itself does not call image APIs or generate images at runtime.

## Current File And Folder Inventory

```text
SV2/
├── index.html
├── AGENT_LESSON_PRODUCTION_PROTOCOL.md
├── PROJECT_STATE.md
├── assets/
│   ├── images/
│   └── source-images/
├── image-candidates/
├── print-asset-work-orders/
├── lessons/
│   ├── manifest.json
│   ├── lesson_template.json
│   ├── lesson-01.json
│   ├── lesson-02.json
│   ├── lesson-03.json
│   ├── lesson-04.json
│   ├── lesson-05.json
│   └── lesson-06.json
├── seo-snapshots/
├── scripts/
│   ├── create_lesson.js
│   ├── search_lesson_images.js
│   ├── prepare_print_assets.js
│   ├── update_manifest.js
│   ├── generate_seo.js
│   ├── validate_project.js
│   ├── hash_project.js
│   ├── create_receipt.js
│   ├── checkpoint.js
│   └── test_image_providers.js
├── logs/
│   ├── hashes/
│   ├── validation/
│   ├── receipts/
│   └── sessions/
├── sitemap.xml
├── robots.txt
├── _redirects
└── netlify.toml
```

Do not inspect or expose `.env` files. `scripts/.env` may exist locally for provider keys, but it is not public architecture.

## Data Model

Each lesson file is a structured JSON object with:

- `id`
- `meta`
- `hero`
- `heroCopy`
- `sections`

The renderer expects five sections with IDs `s1` through `s5`.

Each hero and section carries two separate image concepts:

- `imageQuery`: the production search query for the coding agent.
- `screenImage`: the selected web image URL.
- `printImage`: the local black-and-white worksheet PNG target.

Each section also carries:

- `chip`
- `title`
- `lede`
- `cards`
- one or more prompts

Prompt support includes `prompt`, `promptE`, and `promptF`. The `promptE` / `promptF` pattern is important because several lessons use two final activities in section 5.

## Rendering Model

`index.html` is a fixed browser shell. It contains the visible DOM regions and JavaScript fills those regions from the selected lesson object.

Renderer jobs:

- read the selected lesson from URL, localStorage, or manifest default
- fetch `lessons/manifest.json`
- build the lesson selector
- wire previous/next lesson buttons
- fetch the selected lesson JSON
- fill hero copy, learning targets, student directions, vocabulary, sections, cards, prompts, and teacher keys
- normalize Pexels image URLs
- set screen images as background images
- set local print image paths
- persist teacher mode and answers with lesson-aware localStorage keys
- support print mode through CSS

This is not currently a fully dynamic arbitrary layout engine. It is a five-section educational lesson renderer.

## Image Production Model

Image production is intentionally outside the shipped app runtime.

| Step | Owner | Artifact |
|---|---|---|
| scaffold lesson | `scripts/create_lesson.js` | `lessons/lesson-XX.json`, manifest entry |
| complete content and queries | coding agent | filled lesson JSON |
| fetch provider candidates | coding agent via `scripts/search_lesson_images.js` or equivalent provider workflow | `image-candidates/lesson-XX.md/json` |
| choose screen image URLs | coding agent | updated `screenImage` fields |
| cache selected sources | `scripts/prepare_print_assets.js` | `assets/source-images/lesson-XX/*`, work order |
| create print assets | coding agent using native imagegen | `assets/images/*.png` |
| prove completeness | validation/checkpoint | reports and receipt |

`create_lesson.js` must remain scaffold-only. It should not call Pexels, Pixabay, or image generation.

## Print Model

Print output is a first-class product surface, not a separate manual PDF.

`@media print` in `index.html`:

- hides screen-only controls
- sets letter page size
- removes app chrome
- locks hero and section image heights
- uses local print PNGs
- forces section page breaks
- protects against browser print fragmentation
- keeps prompts and answer areas readable on paper

Validation checks that local print assets exist. Production review must also confirm those print assets are source-based coloring-page conversions, not unrelated filler.

## SEO Model

`scripts/generate_seo.js` reads the manifest and lessons, then writes:

- one static snapshot per lesson
- `sitemap.xml`
- `robots.txt`
- `_redirects`
- `SEO_GENERATION_REPORT.md`

Each snapshot contains visible lesson content, metadata, Open Graph tags, and JSON-LD. The generator includes `prompt`, `promptE`, and `promptF` so static snapshots match the interactive lesson content.

Clean route strategy:

- SPA URL: `/?lesson=lesson-06`
- SEO URL: `/lesson/lesson-06`
- Netlify route file: `_redirects`
- Fallback config: `netlify.toml`

## Tooling Analysis

| Tool | Current Role |
|---|---|
| `create_lesson.js` | Creates a scaffolded lesson and appends a manifest entry |
| `search_lesson_images.js` | Agent-run provider candidate helper; does not mutate lessons |
| `prepare_print_assets.js` | Caches selected source images and writes imagegen work orders |
| `update_manifest.js` | Rebuilds manifest entries from lesson JSON files |
| `generate_seo.js` | Rebuilds snapshots, sitemap, robots, redirects, and report |
| `validate_project.js` | Runs repo, template, lesson, image-query, print asset, SEO, route, and log checks |
| `hash_project.js` | Hashes project files while excluding secrets/logs |
| `create_receipt.js` | Writes timestamped receipt markdown |
| `checkpoint.js` | Runs hash, validation, and receipt in one flow |
| `test_image_providers.js` | Historical provider test helper; depends on local env configuration |

## Strengths

- Small static surface area.
- Source-of-truth lesson JSON.
- Manifest-driven lesson inventory.
- Reusable browser shell.
- Explicit agent workflow for images.
- Real print mode.
- Crawlable SEO snapshot layer.
- Explicit clean-route files.
- Agent-friendly validation, hash, and receipt tooling.
- No backend dependency for the core product.

## Constraints And Risks

- The renderer is fixed to five sections; flexible lesson lengths require a renderer refactor.
- Screen images are external and may fail if providers change URLs.
- Default validation does not perform external URL reachability checks.
- Historical docs may be stale if they are not explicitly updated after production sessions.
- `create_lesson.js` creates a scaffold, not a finished lesson.
- Provider helpers depend on local secrets and should not expose `.env` content.
- Print assets require visual review, because validation can prove existence but not educational quality.

## Recommended Operating Rules

1. Read `AGENT_LESSON_PRODUCTION_PROTOCOL.md` before lesson work.
2. Do not change `index.html` for routine content production.
3. Create or edit lesson JSON first.
4. Use provider candidates for `screenImage` selection.
5. Use source-based imagegen conversions for every `printImage`.
6. Run `node scripts/generate_seo.js`.
7. Run `node scripts/validate_project.js`.
8. Run `node scripts/checkpoint.js` after meaningful edits.
9. Update `PROJECT_STATE.md` when architecture, lesson count, validation gates, or route strategy changes.
10. Treat `_redirects` as the primary Netlify clean-route proof.
11. Do not add backend infrastructure until the static engine loop is preserved.

## Next Improvement Opportunities

- Add optional external image URL reachability checks behind a flag.
- Add a formal JSON Schema for editor integration.
- Add a browser smoke test for lesson selector, prompt rendering, print output, and snapshot content.
- Add a visual QA checklist for print-image quality.
- Refactor the fixed renderer only if the product needs variable-length lessons.
