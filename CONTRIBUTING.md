# Contributing to SV2 Science Lessons

SV2 is the BioSphere Kids static lesson engine. Content lives in lesson JSON, the browser shell renders it, SEO snapshots are generated from it, and print assets are local PNGs referenced by each lesson.

Read `AGENT_LESSON_PRODUCTION_PROTOCOL.md` before creating or modifying lessons. That file is the production contract.

## What This Repo Is

| Layer | File or Folder | Role |
|---|---|---|
| Renderer | `index.html` | Fixed five-section browser shell, teacher mode, autosave, print CSS |
| Registry | `lessons/manifest.json` | Lesson list and default lesson |
| Content | `lessons/lesson-XX.json` | Source of truth for each lesson |
| Template | `lessons/lesson_template.json` | Scaffold used by `create_lesson.js` |
| Screen media | `screenImage` fields | Web images selected from reviewed provider results |
| Print media | `assets/images/*.png` | Local black-and-white worksheet assets |
| SEO | `seo-snapshots/`, `sitemap.xml`, `robots.txt`, `_redirects` | Crawlable lesson layer |
| Quality gates | `scripts/validate_project.js`, `scripts/checkpoint.js` | Validation, hashes, and receipts |

## Create a New Lesson

```bash
node scripts/create_lesson.js --id lesson-07 --title "Your Lesson Title" --subtitle "Your Lesson Title"
```

This command only scaffolds the lesson and registers it in the manifest. It does not search image providers, choose images, write final content, or generate print assets.

## Complete the Lesson JSON

Edit `lessons/lesson-07.json`.

Required top-level fields:

- `id`
- `meta`
- `hero`
- `heroCopy`
- `sections`

Required hero fields:

- `ariaLabel`
- `imageQuery`
- `screenImage`
- `printImage`

Required section fields:

- `id` from `s1` through `s5`
- `chip`
- `imageQuery`
- `screenImage`
- `printImage`
- `title`
- `lede`
- at least two `cards`
- `prompt`, or final-section `promptE` / `promptF`

The current renderer expects exactly five sections. Variable-length lessons require a renderer refactor and should not be introduced during routine content production.

## Image Workflow

The coding agent performs the image workflow. The static app does not.

1. Fill `imageQuery` for the hero and all five sections.
2. Run the optional candidate helper:

```bash
node scripts/search_lesson_images.js --lesson lesson-07
```

3. Review `image-candidates/lesson-07.md`.
4. Select one provider image per slot.
5. Update the lesson `screenImage` fields.
6. Cache selected sources and create the imagegen handoff:

```bash
node scripts/prepare_print_assets.js --lesson lesson-07
```

7. Use the agent's native image generator, preferably Codex imagegen, to convert each cached source image into a black-and-white coloring-page PNG.
8. Save each PNG exactly to its `printImage` path.

Do not read or expose `scripts/.env`. The helper script may use local provider keys at runtime, but keys must never be printed, pasted, committed, or summarized.

## Print Asset Standard

Print assets must be:

- Source-based conversions of the selected screen images.
- Black-and-white coloring-page style.
- Clear enough for elementary worksheets.
- Saved locally under `assets/images/`.
- The exact files referenced by `printImage`.

Do not use unrelated decorative art. Do not use a generic diagram when the lesson selected a real source image that should be converted.

## Rebuild Derived Files

After editing lesson JSON or images:

```bash
node scripts/generate_seo.js
node scripts/validate_project.js
```

`generate_seo.js` rebuilds:

- `seo-snapshots/lesson-XX.html`
- `sitemap.xml`
- `robots.txt`
- `_redirects`
- `SEO_GENERATION_REPORT.md`

Validation must pass before handoff.

## Local Test

Serve the static site:

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/?lesson=lesson-07
```

Check:

- lesson selector
- hero image and copy
- all five section images
- all prompts
- teacher mode
- print preview

## Checkpoint

Run a checkpoint after meaningful changes:

```bash
node scripts/checkpoint.js \
  --session "lesson-07-production" \
  --worker "Agent Name" \
  --summary "Created lesson 07 with selected screen images, source-based print assets, SEO snapshots, validation, and receipt" \
  --created "lessons/lesson-07.json" \
  --modified "lessons/manifest.json,sitemap.xml,robots.txt,_redirects,SEO_GENERATION_REPORT.md" \
  --next "Review deployed route and print output"
```

## Common Mistakes

| Mistake | Impact | Fix |
|---|---|---|
| Expecting `create_lesson.js` to search APIs | Blurs the agent/app boundary | Use it only for scaffolding |
| Missing `imageQuery` | Future agents cannot reproduce image sourcing | Fill query fields before image search |
| Random external image URLs | Weak provenance and fragile lessons | Use reviewed provider candidates |
| Generic print art | Print output no longer matches the lesson | Convert selected screen sources into coloring pages |
| Stale SEO snapshots | Clean URLs describe old lesson content | Re-run `generate_seo.js` |
| Skipping validation | Handoff inherits unknown breakage | Run `validate_project.js` |
| Reading `.env` manually | Secret exposure risk | Let scripts consume env at runtime only |

## Reference Files

- `AGENT_LESSON_PRODUCTION_PROTOCOL.md`
- `PROJECT_STATE.md`
- `REPOSITORY_ANALYSIS.md`
- `CHECKPOINT_PROTOCOL.md`
- `lessons/lesson_template.json`
- `scripts/create_lesson.js`
- `scripts/search_lesson_images.js`
- `scripts/prepare_print_assets.js`
- `scripts/generate_seo.js`
- `scripts/validate_project.js`
