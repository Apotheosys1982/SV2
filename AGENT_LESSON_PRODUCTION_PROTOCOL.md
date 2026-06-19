# Agent Lesson Production Protocol

**Project:** BioSphere Kids / SV2  
**Purpose:** Define the exact agent-operated workflow for creating or updating lessons.

SV2 is a static lesson engine. The repository does not contain a backend image generator, does not run image search automatically during lesson scaffolding, and does not make `create_lesson.js` responsible for choosing images. The coding agent operating the repo performs those production steps.

## Architecture Boundary

| Component | Responsibility | Must Not Do |
|---|---|---|
| `scripts/create_lesson.js` | Scaffold a lesson JSON file from `lesson_template.json` and register it in `manifest.json` | Call Pexels, call Pixabay, choose images, generate print art, or complete lesson content |
| `scripts/search_lesson_images.js` | Optional agent-run helper that queries configured image providers and writes candidate reports | Auto-select final images or mutate lesson JSON |
| `scripts/prepare_print_assets.js` | Cache selected screen images and write a source-to-target imagegen work order | Generate images internally or invent print art |
| Coding agent | Review candidates, select screen images, use native imagegen, update files, validate, and checkpoint | Expose API keys, skip print assets, or leave stale generated outputs |
| `scripts/generate_seo.js` | Rebuild static snapshots, sitemap, robots, redirects, and SEO report from lesson JSON | Become the source of truth for lesson content |
| `scripts/validate_project.js` | Enforce repo, lesson, print, SEO, route, and handoff contracts | Replace manual review of content quality |

## Canonical Workflow

1. Create the scaffold:

```bash
node scripts/create_lesson.js --id lesson-07 --title "Lesson Title" --subtitle "Lesson Title"
```

2. Complete the lesson JSON:

- Fill the lesson content.
- Keep exactly five sections for the current renderer.
- Fill `hero.imageQuery` and every section `imageQuery`.
- Keep `screenImage` as the web image URL.
- Keep `printImage` as the local PNG target path.

3. Run the agent-operated image provider workflow:

```bash
node scripts/search_lesson_images.js --lesson lesson-07
```

This helper may read local provider keys from `scripts/.env` at runtime. Do not open, print, paste, commit, or expose `.env` contents.

4. Review the candidate report:

- Use Pexels first when quality is acceptable.
- Use Pixabay as fallback when it is the better educational image and the direct URL probe passes.
- Select one screen image for the hero and one for each section.
- Update the lesson `screenImage` fields from selected API candidates.
- Do not paste unrelated random URLs.

5. Cache selected sources and create the imagegen work order:

```bash
node scripts/prepare_print_assets.js --lesson lesson-07
```

This writes cached source images under `assets/source-images/lesson-07/` and a work order under `print-asset-work-orders/`.

6. Use agent-native image generation:

- Use the cached source image as the reference/edit target.
- Convert it into black-and-white coloring-page worksheet art.
- Preserve the subject and educational meaning of the selected screen image.
- Do not create generic diagrams unless the source image itself is a diagram.
- Do not add labels, captions, logos, watermarks, decorative frames, or unrelated objects.
- Save the final PNG exactly to the matching `printImage` path in `assets/images/`.

Preferred Codex imagegen prompt:

```text
Use case: scientific-educational
Asset type: black-and-white printable worksheet image
Primary request: Convert the provided source image into a clean black-and-white coloring-page version for a Grades 2-4 science worksheet.
Input image role: reference/edit target; preserve the main subject, composition, and educational meaning.
Style: crisp outline drawing, white background, high contrast, no grayscale fill, no shadows, no text, no watermark, no decorative frame.
Output: 1024 x 683 PNG, print-safe, kid-friendly, clear enough for a worksheet.
```

7. Rebuild derived artifacts:

```bash
node scripts/generate_seo.js
```

8. Validate:

```bash
node scripts/validate_project.js
```

9. Browser and print proof:

- Open `http://localhost:8000/?lesson=lesson-07`.
- Check the lesson selector, hero, all five sections, teacher mode, and prompts.
- Check print preview.
- Open `/lesson/lesson-07` through the static snapshot route when deployed or served with Netlify-style redirects.

10. Checkpoint:

```bash
node scripts/checkpoint.js \
  --session "lesson-07-production" \
  --worker "Agent Name" \
  --summary "Created lesson 07 with provider-selected screen images, source-based print assets, SEO snapshots, validation, and receipt" \
  --created "lessons/lesson-07.json,assets/images/lesson-07-hero.png,assets/images/lesson-07-s1.png,assets/images/lesson-07-s2.png,assets/images/lesson-07-s3.png,assets/images/lesson-07-s4.png,assets/images/lesson-07-s5.png" \
  --modified "lessons/manifest.json,sitemap.xml,robots.txt,_redirects,SEO_GENERATION_REPORT.md" \
  --next "Review deployed route and print output"
```

## Required Lesson Fields

Each lesson must include:

- `id`
- `meta`
- `hero.ariaLabel`
- `hero.imageQuery`
- `hero.screenImage`
- `hero.printImage`
- `heroCopy.lede`
- `heroCopy.whatStudentsLearn`
- `heroCopy.learningTargets`
- `heroCopy.studentDirections`
- `heroCopy.keyVocabulary`
- five `sections`

Each section must include:

- `id` from `s1` through `s5`
- `chip`
- `imageQuery`
- `screenImage`
- `printImage`
- `title`
- `lede`
- at least two `cards`
- `prompt`, or final-section `promptE` / `promptF`

## Acceptance Gates

A lesson is not production-ready until:

- Candidate image search has been reviewed by the agent.
- Every `screenImage` points to a selected provider image or approved existing source.
- Every `printImage` exists locally.
- Print assets are source-based coloring-page conversions, not unrelated filler.
- `node scripts/generate_seo.js` has been run.
- `node scripts/validate_project.js` passes.
- A checkpoint receipt records what changed and what remains.

## Non-Negotiables

- Do not read or expose `.env` contents.
- Do not put API keys into lesson JSON, reports, receipts, screenshots, or docs.
- Do not make `create_lesson.js` call image APIs.
- Do not claim print assets were generated by the app itself.
- Do not leave stale snapshots after editing lesson JSON.
- Do not skip validation before handoff.
