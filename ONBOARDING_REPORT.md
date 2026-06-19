# ONBOARDING_REPORT.md

**Project:** SV2 Science Lessons / BioSphere Kids  
**Date:** 2026-06-11  
**Status:** Current repo state inspected and workflow hardened

## 1. What SV2 Is

SV2 is a static, JSON-driven lesson engine. It renders elementary science lessons as a polished browser experience and prints the same lesson as a worksheet.

BioSphere Kids is the product surface. The reusable engine is the combination of lesson JSON, manifest, renderer, print CSS, agent-operated image workflow, SEO snapshots, route files, validation, and receipts.

The project intentionally avoids a backend, database, dashboard, authentication, and runtime AI dependency.

## 2. Current Architecture

| Layer | Current Implementation |
|---|---|
| App shell | `index.html` |
| Content source | `lessons/lesson-01.json` through `lessons/lesson-06.json` |
| Lesson registry | `lessons/manifest.json` |
| Lesson template | `lessons/lesson_template.json` |
| Agent production protocol | `AGENT_LESSON_PRODUCTION_PROTOCOL.md` |
| Image queries | `hero.imageQuery` and section `imageQuery` fields |
| Image candidates | `scripts/search_lesson_images.js`, `image-candidates/` |
| Source cache / imagegen handoff | `scripts/prepare_print_assets.js`, `assets/source-images/`, `print-asset-work-orders/` |
| Print assets | `assets/images/*.png` |
| SEO snapshots | `seo-snapshots/lesson-01.html` through `lesson-06.html` |
| Clean routes | `_redirects` and fallback `netlify.toml` |
| Crawl files | `sitemap.xml`, `robots.txt` |
| Tooling | Node scripts in `scripts/` |
| Receipts/logs | `logs/hashes`, `logs/validation`, `logs/receipts`, `logs/sessions` |

## 3. Current Lessons

The manifest registers six lessons:

1. `lesson-01` - Plants & Animals
2. `lesson-02` - Food Chains
3. `lesson-03` - Ecosystems & Interdependence
4. `lesson-04` - The Water Cycle
5. `lesson-05` - Trees
6. `lesson-06` - Habitats

Each lesson currently uses five sections and now includes image query metadata for the hero and every section.

## 4. Renderer Behavior To Preserve

The browser shell is a fixed five-section lesson renderer. It does not generate arbitrary layouts from scratch. It fills stable DOM regions already present in `index.html`.

Important behaviors:

- reads `?lesson=lesson-XX`
- loads `lessons/manifest.json`
- builds the lesson selector from the manifest
- supports previous/next lesson controls
- fetches the selected lesson JSON
- updates hero, overview, vocabulary, directions, section cards, prompts, teacher keys, and images
- supports `prompt`, `promptE`, and `promptF`
- persists teacher mode and current lesson in localStorage
- autosaves textarea answers per lesson
- supports print mode through dedicated CSS

If an agent changes this renderer, it should explain why and update validation/docs accordingly.

## 5. Agent Image Workflow

Do not make the shipped app responsible for image production.

`scripts/create_lesson.js` is scaffold-only. It creates a lesson JSON file and registers the manifest entry. It must not call Pexels, call Pixabay, choose images, or generate print art.

Canonical order:

```bash
node scripts/create_lesson.js --id lesson-07 --title "Lesson Title" --subtitle "Lesson Title"
```

Then the coding agent:

1. Completes lesson content and `imageQuery` fields.
2. Runs or otherwise performs provider candidate search.
3. Reviews candidates and updates `screenImage` fields.
4. Runs:

```bash
node scripts/prepare_print_assets.js --lesson lesson-07
```

5. Uses Codex imagegen or another capable native image generator to convert cached sources into black-and-white coloring-page PNGs.
6. Saves each PNG exactly to the matching `printImage` path.

Do not read or expose `scripts/.env`. Helper scripts may consume provider keys at runtime, but keys must not be printed, pasted, committed, or summarized.

## 6. SEO And Deployment Behavior

Run:

```bash
node scripts/generate_seo.js
```

This reads the manifest and lessons, then regenerates:

- `seo-snapshots/lesson-XX.html`
- `sitemap.xml`
- `robots.txt`
- `_redirects`
- `SEO_GENERATION_REPORT.md`

The clean URL pattern is:

```text
/lesson/lesson-XX -> /seo-snapshots/lesson-XX.html
```

The SPA still works with:

```text
/?lesson=lesson-XX
```

`_redirects` is the primary Netlify route proof. `netlify.toml` is a fallback and should use valid `[[redirects]]` syntax.

## 7. Validation And Checkpoints

Run:

```bash
node scripts/validate_project.js
```

Current validation checks required files, agent protocol, lesson template, lesson JSON, image queries, local print assets, manifest integrity, SEO coverage, routes, Netlify TOML syntax, and log directories.

Run a full checkpoint after meaningful edits:

```bash
node scripts/checkpoint.js \
  --session "short-session-name" \
  --worker "Agent Name" \
  --summary "What changed" \
  --created "file1,file2" \
  --modified "file3,file4" \
  --next "Recommended next action"
```

The checkpoint writes:

- `logs/hashes/LATEST.md`
- `logs/validation/LATEST.md`
- `logs/receipts/LATEST.md`

## 8. Current Fixes Applied In This Cleanup

- `netlify.toml` redirect syntax corrected to `[[redirects]]`.
- `scripts/generate_seo.js` updated so SEO snapshots include `promptE` and `promptF`.
- `scripts/create_lesson.js` confirmed as scaffold-only and updated with correct agent next steps.
- `scripts/search_lesson_images.js` added as an optional agent-run image candidate helper.
- `scripts/prepare_print_assets.js` added as the source-cache and imagegen handoff helper.
- `AGENT_LESSON_PRODUCTION_PROTOCOL.md` added as the canonical production contract.
- Existing lessons updated with `imageQuery` metadata.
- `scripts/validate_project.js` expanded to enforce template, image-query, script, protocol, lesson, print asset, SEO, route, and TOML checks.
- Current-state docs replaced so future agents do not inherit stale assumptions.

## 9. Remaining Caveats

- Screen image URLs are external and are not fetched by default validation.
- Validation proves print asset existence, not visual quality. Print assets still need visual review.
- The renderer is fixed to five sections; this is intentional for the current product.
- Historical summary files may still describe the state at the time they were created. Use `PROJECT_STATE.md` and `AGENT_LESSON_PRODUCTION_PROTOCOL.md` as the current source of truth.
- Do not read `scripts/.env`; it is for local provider use only and should never be exposed.

## 10. First Files For A New Agent

Read these first:

- `AGENT_LESSON_PRODUCTION_PROTOCOL.md`
- `PROJECT_STATE.md`
- `index.html`
- `lessons/manifest.json`
- `lessons/lesson_template.json`
- one complete lesson file such as `lessons/lesson-06.json`
- `scripts/create_lesson.js`
- `scripts/search_lesson_images.js`
- `scripts/prepare_print_assets.js`
- `scripts/generate_seo.js`
- `scripts/validate_project.js`
- `CHECKPOINT_PROTOCOL.md`

Then run validation before editing.
