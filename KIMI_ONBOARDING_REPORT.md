# Kimi Onboarding Report — SV2 Science Lessons

**Project:** SV2  
**Type:** Lightweight static site delivering printable elementary science lessons (Grades 2–4)  
**Date:** 2026-06-10  
**Status:** Operational — no application files modified during this onboarding

---

## 1. Project Description

SV2 is a single-page static site that renders elementary science lessons as premium-looking web pages which degrade to clean worksheets when printed. The entire experience is JSON-driven and client-side rendered.

### Core Architecture
- **Entry point:** `index.html` reads a `?lesson=` query parameter, fetches the corresponding lesson JSON, and builds the DOM.
- **Data layer:** Standalone lesson JSON files under `lessons/` following the canonical shape in `lessons/lesson_template.json`.
- **Registry:** `lessons/manifest.json` maps lesson IDs to labels and file paths. `defaultLessonId` is `lesson-01`.
- **Images:** On-screen images are external Pexels URLs embedded in lesson JSON. Print images are local PNGs in `assets/images/`.
- **Tooling:** Vanilla Node.js scripts under `scripts/`; no build system, no bundler, no CI.
- **Deployment target:** `https://ariya-science.netlify.app/`

### Recently Added Infrastructure
- **SEO Snapshot Layer (2026-06-10):** `scripts/generate_seo.js` produces static, crawlable snapshot pages (`seo-snapshots/lesson-XX.html`), a `sitemap.xml`, and `robots.txt`. Netlify routing serves clean `/lesson/:id` URLs.
- **Checkpoint System:** `scripts/checkpoint.js` generates hash reports, validation reports, and receipts under `logs/`. Protocol documented in `CHECKPOINT_PROTOCOL.md`.
- **Lesson Creation Scripts:** `scripts/create_lesson.js` scaffolds new lessons; `scripts/update_manifest.js` regenerates the manifest from files.
- **Image Provider Testing:** `scripts/test_image_providers.js` and `IMAGE_PROVIDER_TEST.md` exist for evaluating image sources.
- **Contributor Documentation:** `CONTRIBUTING.md` describes the workflow and JSON schema expectations.

### Existing Lessons
| Lesson | Title | Status |
|--------|-------|--------|
| lesson-01 | Plants & Animals | Complete |
| lesson-02 | Food Chains | Complete |
| lesson-03 | Ecosystems & Interdependence | Complete |
| lesson-04 | The Water Cycle | **Missing print assets** |

---

## 2. Current Bottlenecks (Ranked by Impact × Complexity)

### 🔴 1. Missing Print Assets for lesson-04 — High Impact, Low Complexity
`lessons/lesson-04.json` references six PNG print images (`water-cycle.png`, `water-ocean.png`, `water-sun.png`, `water-clouds.png`, `water-rain.png`, `water-river.png`) that do **not** exist in `assets/images/`. Printed worksheets for lesson-04 will be broken until these are added.

### 🔴 2. No Automated JSON Validation / CI — High Impact, Medium Complexity
There is no JSON Schema, lint step, or CI. Typos or missing keys in lesson JSON cause runtime rendering failures only visible in the browser console. As the lesson catalog grows, this becomes a major quality risk.

### 🟡 3. Manifest Drift Risk — Medium Impact, Low Complexity
`scripts/update_manifest.js` exists but is not enforced by any pre-commit hook, CI check, or npm script. Contributors can forget to run it, leaving `manifest.json` out of sync with the actual files in `lessons/`.

### 🟡 4. Image Curation & Relevance Filtering — Medium Impact, Medium Complexity
`IMAGE_PROVIDER_TEST.md` shows several returned images are poor fits for elementary science (e.g., unrelated stock photos for "water cycle" and "evaporation"). No automated relevance filtering exists, and no formal workflow vets images before they are committed.

### 🟡 5. Duplicated Rendering Code in `index.html` — Low→Medium Impact, Medium→High Complexity
The client-side renderer repeats similar DOM construction for each section type. This increases maintenance burden and makes new UI patterns harder to introduce. Refactoring into reusable templates or a lightweight templating engine would help.

### 🟢 6. No Child-Readability Audits — Low Impact, Medium Complexity
Lessons target Grades 2–4, but no readability scoring (e.g., Flesch-Kincaid) or formal review artifacts exist in the repository.

### 🟢 7. Asset Duplication Across Lessons — Low Impact, Low Complexity
Similar print icons are repeated across lessons. A shared asset registry or sprite sheet could reduce duplication.

---

## 3. Recommended Next Actions

### Immediate (Do First)
1. **Add Missing Print Images for lesson-04**
   - **What:** Create or source six PNG illustrations and place them in `assets/images/`.
   - **Why:** Unblocks the newest lesson for print use; highest user-facing impact with lowest effort.
   - **Files involved:** `assets/images/water-*.png` (new files only; no application changes).

### Short-Term (Next 1–2 Sessions)
2. **Add JSON Schema + Lightweight Validation**
   - **What:** Define a lesson JSON Schema and add a `node` validation script (e.g., using `ajv` or plain `JSON.parse` + key checks). Wire it into an npm script or simple CI step.
   - **Why:** Prevents runtime failures as the lesson catalog expands.
   - **Complexity:** Medium.

3. **Automate Manifest Regeneration**
   - **What:** Wire `scripts/update_manifest.js` into a pre-commit hook, GitHub Action, or at minimum an npm script that contributors run before committing.
   - **Why:** Eliminates manifest drift and forgotten registrations.
   - **Complexity:** Low.

### Medium-Term (After Above)
4. **Formalize Image-Provider Workflow**
   - **What:** Document a standard operating procedure: run `scripts/test_image_providers.js`, review `IMAGE_PROVIDER_TEST.md`, manually vet images for relevance and attribution, then copy approved assets to `assets/images/`.
   - **Why:** Improves image relevance and avoids inappropriate stock photos in elementary materials.
   - **Complexity:** Medium (procedural + occasional manual curation).

5. **Refactor Rendering into Reusable Templates**
   - **What:** Extract duplicated DOM-building code in `index.html` into a small templating function or adopt a minimal client-side templating library (Mustache, Handlebars, or a micro-template).
   - **Why:** Reduces maintenance burden and enables richer lesson layouts.
   - **Complexity:** Medium–High.

### Optional / Deferred
6. **Add Readability Scoring**
   - Integrate a Flesch-Kincaid or similar check into the validation pipeline to ensure lesson text stays within Grades 2–4 reading levels.

7. **Consolidate Print Assets**
   - Create a shared `assets.json` mapping logical names to file paths so lessons reference IDs instead of hard-coded paths, reducing duplication.

---

## 4. Key Files to Inspect First

| File | Purpose |
|------|---------|
| `index.html` | Single-page entry; client-side renderer |
| `lessons/manifest.json` | Lesson registry |
| `lessons/lesson_template.json` | Canonical lesson JSON shape |
| `lessons/lesson-04.json` | Newest lesson (missing print assets) |
| `CONTRIBUTING.md` | Contributor workflow and schema reference |
| `PROJECT_STATE.md` | Single source of truth for repo state |
| `REPOSITORY_ANALYSIS.md` | Architecture analysis and bottleneck identification |
| `scripts/create_lesson.js` | Lesson scaffolding utility |
| `scripts/update_manifest.js` | Manifest regeneration utility |
| `scripts/generate_seo.js` | SEO snapshot generator |
| `scripts/checkpoint.js` | Checkpoint / validation reporter |

---

## 5. Quick Start for Local Testing

```bash
# Serve the site locally
python3 -m http.server 8000

# Open a lesson
open http://localhost:8000/?lesson=lesson-04

# Scaffold a new lesson
node scripts/create_lesson.js --id lesson-05 --title "New Lesson" --subtitle "Subtitle"

# Regenerate manifest
node scripts/update_manifest.js

# Generate SEO snapshots
node scripts/generate_seo.js

# Run checkpoint / validation
node scripts/checkpoint.js
```

---

*This report was produced by reading `PROJECT_STATE.md`, `ONBOARDING_REPORT.md`, and `REPOSITORY_ANALYSIS.md`. No application files were modified.*
