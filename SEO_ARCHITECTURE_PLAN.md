# SEO Architecture Plan — SV2 Science Lessons

> **Design-only document.** No code changes are included. This plan describes the smallest possible SEO enhancement layer that preserves the existing rendering engine, JSON workflow, and single-file architecture of SV2.

---

## 1. Executive Summary

SV2 is a client-side single-page application. All lesson content is fetched from static JSON files and rendered into a pre-built HTML shell in the browser. Search engines that execute JavaScript *may* eventually index the rendered DOM, but this is slow, unreliable, and provides no structured metadata for rich results.

The plan below adds a thin **build-time SEO layer** that:

1. Generates a **lesson-aware `sitemap.xml`** for search-engine discovery.
2. Produces **per-lesson static HTML snapshots** containing the lesson's unique metadata (title, description, canonical URL, Open Graph, JSON-LD structured data).
3. Adds a **`<meta name="robots">` and canonical tag strategy** to the existing `index.html` so the SPA shell doesn't compete with lesson pages.
4. Requires **zero changes** to the rendering engine, lesson JSON schema, or authoring workflow.

---

## 2. Current Architecture (What We're Preserving)

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                 │
│                                                          │
│  index.html  ──► reads ?lesson= query param              │
│       │                                                  │
│       ▼                                                  │
│  fetch(lessons/manifest.json)                            │
│       │                                                  │
│       ▼                                                  │
│  fetch(lessons/lesson-XX.json)                           │
│       │                                                  │
│       ▼                                                  │
│  applyLesson(lesson)  ──► DOM injection into shell       │
│       │                    (hero, sections, cards,       │
│       │                     prompts, teacher keys)       │
│       ▼                                                  │
│  User sees lesson; prints via @media print CSS           │
└─────────────────────────────────────────────────────────┘
```

**Key constraints this plan respects:**

| Constraint | Why |
|---|---|
| No build tooling exists (no npm, no bundler) | The SEO layer must be a standalone Node script |
| `index.html` is a single file with inline CSS/JS | We don't split it; we augment it |
| Lesson JSON schema is fixed | We read existing fields; we don't add new required fields |
| Rendering is 100% client-side | We don't change the rendering engine |
| Lessons are authored as JSON files | The SEO script reads the same files |
| Print workflow uses `@media print` | Unchanged |

---

## 3. SEO Problems Identified

| # | Problem | Impact |
|---|---|---|
| 1 | **Single `<title>` and `<meta description>`** hardcoded in `index.html` — identical for all lessons | Search engines see every lesson as the same page |
| 2 | **Open Graph and Twitter Card metadata is static** — always says "Plants & Animals" regardless of which lesson is loaded | Social sharing shows wrong preview for lessons 2–5 |
| 3 | **`<link rel="canonical">` points to `?lesson=lesson-01` always** | All lessons appear to be the same URL to search engines |
| 4 | **No `sitemap.xml`** | Search engines must discover pages by crawling; with an SPA, they may only find the default lesson |
| 5 | **No structured data (JSON-LD / Schema.org)** | No rich results (education snippets, breadcrumbs) in search |
| 6 | **No `<meta name="robots">` guidance** | The SPA shell may be indexed as duplicate content |
| 7 | **Lesson content is invisible without JS execution** | Search engine crawlers that don't execute JS see an empty shell |

---

## 4. Proposed SEO Layer — Four Components

### Component A: Per-Lesson Metadata Extraction

**What:** A Node.js script (`scripts/generate_seo.js`) reads every lesson JSON file and extracts SEO-relevant fields that already exist.

**Source fields in existing lesson JSON:**

| SEO Output | Source Field(s) |
|---|---|
| Page `<title>` | `meta.title` + " — BioSphere Kids" |
| `<meta name="description">` | `heroCopy.whatStudentsLearn` (truncated to 160 chars) |
| `<meta name="keywords">` | Derived from `heroCopy.keyVocabulary[].term` + `meta.kicker` |
| Canonical URL | `https://ariya-science.netlify.app/?lesson={id}` |
| `og:title` | `meta.title` |
| `og:description` | `heroCopy.lede` |
| `og:image` | `hero.screenImage` |
| `og:url` | Canonical URL |
| `og:type` | `article` (more specific than `website`) |
| `twitter:title` | `meta.title` |
| `twitter:description` | `heroCopy.lede` |
| `twitter:image` | `hero.screenImage` |
| JSON-LD `name` | `meta.title` |
| JSON-LD `description` | `heroCopy.whatStudentsLearn` |
| JSON-LD `about` | `heroCopy.keyVocabulary[].term` |
| JSON-LD `educationalLevel` | Extracted from `meta.kicker` (e.g., "Grades 2–4") |
| JSON-LD `timeRequired` | Extracted from `meta.kicker` (e.g., "20–30 min") |

**No new fields are added to the lesson JSON schema.** All metadata is derived from existing content.

---

### Component B: Sitemap Generation

**What:** `scripts/generate_seo.js` also produces `/sitemap.xml` at the project root.

**Structure:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ariya-science.netlify.app/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://ariya-science.netlify.app/?lesson=lesson-01</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- ... one <url> entry per lesson in manifest ... -->
</urlset>
```

**Source:** `lessons/manifest.json` — one `<url>` block per lesson, plus the root.

**Integration:** The script runs after `update_manifest.js` or standalone. A `robots.txt` is also generated:

```
User-agent: *
Allow: /
Sitemap: https://ariya-science.netlify.app/sitemap.xml
```

---

### Component C: SPA Shell `<head>` Modifications (Minimal)

**What:** Three small changes to the existing `index.html` `<head>`:

#### C1. Dynamic `<title>` and `<meta description>` via JS

Replace the static `<title>` and `<meta name="description">` with a JS block in `<head>` that updates them after the lesson loads:

```js
// Inside <head>, after existing meta tags:
<script>
  // Placeholder — will be overwritten by lesson engine
  document.title = "BioSphere Kids — Science Lessons";
</script>
```

Then in the existing `applyLesson()` function, add:

```js
// After applying lesson content:
document.title = (lesson?.meta?.title || "BioSphere Kids") + " — BioSphere Kids";
const descMeta = document.querySelector('meta[name="description"]');
if (descMeta && lesson?.heroCopy?.whatStudentsLearn) {
  descMeta.setAttribute("content", lesson.heroCopy.whatStudentsLearn.substring(0, 160));
}
```

**Impact:** Search engines that execute JS will see per-lesson titles. The static fallback remains for the initial HTML parse.

#### C2. Canonical URL update via JS

Replace the static `<link rel="canonical">` with a dynamic update in `applyLesson()`:

```js
const canon = document.querySelector('link[rel="canonical"]');
if (canon) canon.href = `https://ariya-science.netlify.app/?lesson=${lesson.id}`;
```

#### C3. Add `<meta name="robots">`

```html
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
```

This is a one-line addition to the existing `<head>`.

---

### Component D: Per-Lesson Static HTML Snapshots (Optional — Highest Impact)

**What:** `scripts/generate_seo.js` also produces a set of static HTML files:

```
seo-snapshots/
  lesson-01.html
  lesson-02.html
  lesson-03.html
  lesson-04.html
  lesson-05.html
```

Each snapshot is a **complete, self-contained HTML page** for one lesson with:

- Lesson-specific `<title>`, `<meta description>`, Open Graph, Twitter Card
- Canonical URL pointing to `?lesson=lesson-XX`
- JSON-LD structured data (`Article`, `LearningResource`, `EducationalAudience`)
- The same CSS and rendering engine as `index.html` (inlined copy)
- The lesson JSON data inlined into the boot script (no `fetch()` needed)

**Purpose:** These snapshots are served to search engine crawlers via **Netlify redirects** or **Cloudflare Workers** — URL stays the same (`?lesson=lesson-03`), but crawlers receive pre-rendered HTML with all content visible in the initial response.

**Netlify `_redirects` approach (zero-cost):**

```
# _redirects file — Netlify serves snapshots to crawlers
/  /index.html  200
# No redirect needed for crawlers; snapshots are linked via <link rel="canonical">
```

**Alternative: Netlify `_headers` for crawler detection:**

A simpler approach — the snapshots are published as **separate deployable pages** at paths like `/lesson/lesson-01`, and the canonical tag in the SPA points to these paths. This avoids any server-side logic.

```
Public URLs:
  https://ariya-science.netlify.app/lesson/lesson-01  → static snapshot
  https://ariya-science.netlify.app/lesson/lesson-02  → static snapshot
  ...

SPA canonical tag:
  <link rel="canonical" href="https://ariya-science.netlify.app/lesson/lesson-01">
```

**Snapshot generation approach:**

The script reads `index.html`, clones it, and for each lesson:

1. Replaces the static `<title>` with the lesson-specific title.
2. Replaces the static `<meta description>` with the lesson-specific description.
3. Replaces all Open Graph and Twitter Card tags with lesson-specific values.
4. Adds a `<script type="application/ld+json">` block with JSON-LD.
5. Inlines the lesson JSON directly into the boot script (replacing the `fetch()` call).
6. Writes the result to `seo-snapshots/lesson-XX.html`.

**File structure after generation:**

```
SV2/
├── index.html                    # SPA shell (unchanged engine)
├── seo-snapshots/
│   ├── lesson-01.html            # Static snapshot for crawlers
│   ├── lesson-02.html
│   ├── lesson-03.html
│   ├── lesson-04.html
│   └── lesson-05.html
├── sitemap.xml                   # Generated sitemap
├── robots.txt                    # Generated robots.txt
└── lessons/
    └── ...                       # Unchanged
```

---

## 5. Structured Data (JSON-LD) Design

Each lesson snapshot includes a `<script type="application/ld+json">` block:

```json
{
  "@context": "https://schema.org",
  "@type": ["Article", "LearningResource"],
  "name": "Plants & Animals",
  "description": "In this lesson, students explore what makes something a living thing...",
  "url": "https://ariya-science.netlify.app/?lesson=lesson-01",
  "image": "https://images.pexels.com/photos/247431/pexels-photo-247431.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "author": {
    "@type": "Organization",
    "name": "BioSphere Kids",
    "url": "https://ariya-science.netlify.app"
  },
  "publisher": {
    "@type": "Organization",
    "name": "BioSphere Kids"
  },
  "educationalLevel": "Grade 2–4",
  "timeRequired": "PT25M",
  "about": [
    { "@type": "DefinedTerm", "name": "Living thing" },
    { "@type": "DefinedTerm", "name": "Needs" },
    { "@type": "DefinedTerm", "name": "Habitat" },
    { "@type": "DefinedTerm", "name": "Adaptation" }
  ],
  "learningResourceType": "Lesson plan",
  "inLanguage": "en",
  "isAccessibleForFree": true
}
```

**Source mapping:**

| JSON-LD Field | Lesson JSON Source |
|---|---|
| `name` | `meta.title` |
| `description` | `heroCopy.whatStudentsLearn` |
| `url` | `https://ariya-science.netlify.app/?lesson={id}` |
| `image` | `hero.screenImage` |
| `educationalLevel` | Parsed from `meta.kicker` entry matching `Grades X–Y` |
| `timeRequired` | Parsed from `meta.kicker` entry matching `XX–XX min` → ISO 8601 duration |
| `about` | `heroCopy.keyVocabulary[].term` |

---

## 6. URL Strategy

| URL | Purpose | Content |
|---|---|---|
| `https://ariya-science.netlify.app/` | SPA shell — default lesson | `index.html` (client-rendered) |
| `https://ariya-science.netlify.app/?lesson=lesson-01` | SPA — lesson 1 | Same `index.html`, JS renders lesson |
| `https://ariya-science.netlify.app/lesson/lesson-01` | Static snapshot for crawlers | `seo-snapshots/lesson-01.html` |

**Canonical strategy:** Every page (SPA and snapshots) uses:

```html
<link rel="canonical" href="https://ariya-science.netlify.app/?lesson=lesson-01">
```

This consolidates all signals to the `?lesson=` URL. The snapshots are supplementary and self-canonical to the same URL.

**Netlify configuration (`_redirects` or `netlify.toml`):**

```toml
[[redirects]]
  from = "/lesson/:id"
  to = "/seo-snapshots/:id.html"
  status = 200
```

This serves the static snapshot at the `/lesson/` path without changing the URL.

---

## 7. Integration with Existing Workflow

### 7.1. New Script: `scripts/generate_seo.js`

```
Usage:
  node scripts/generate_seo.js

What it does:
  1. Reads lessons/manifest.json
  2. For each lesson, reads the lesson JSON
  3. Generates sitemap.xml at project root
  4. Generates robots.txt at project root
  5. Generates seo-snapshots/lesson-XX.html for each lesson
  6. Reports any missing fields or warnings
```

### 7.2. When to Run

| Trigger | Command |
|---|---|
| After creating a new lesson | `node scripts/create_lesson.js ... && node scripts/generate_seo.js` |
| After editing lesson content | `node scripts/generate_seo.js` |
| Before deploying | `node scripts/generate_seo.js` |

### 7.3. Integration with `create_lesson.js`

The existing `create_lesson.js` can be extended with a post-creation hook:

```js
// At end of create_lesson.js:
const { execSync } = require("child_process");
execSync("node scripts/generate_seo.js", { stdio: "inherit" });
```

### 7.4. `.gitignore` Addition

```
# SEO snapshots — generated, not committed (optional; can also commit them)
# seo-snapshots/
```

**Recommendation:** Commit the snapshots. They're static HTML, they're small, and they ensure the deploy works even if the generation script isn't run at build time.

---

## 8. What This Plan Does NOT Change

| Item | Status |
|---|---|
| `index.html` rendering engine | **Unchanged.** `applyLesson()` continues to work identically |
| Lesson JSON schema | **Unchanged.** No new required fields |
| `lessons/manifest.json` format | **Unchanged** |
| `scripts/create_lesson.js` workflow | **Unchanged** (optional hook addition) |
| Print stylesheet (`@media print`) | **Unchanged** |
| Teacher mode, autosave, jump nav | **Unchanged** |
| Image pipeline (Pexels + local PNGs) | **Unchanged** |
| Deployment target (Netlify) | **Unchanged** |
| No build tools / no npm | **Preserved.** `generate_seo.js` is a standalone Node script |

---

## 9. Implementation Priority

| Priority | Component | Effort | SEO Impact |
|---|---|---|---|
| **1 (P0)** | `sitemap.xml` + `robots.txt` generation | Low | High — enables discovery |
| **2 (P0)** | Dynamic `<title>` + `<meta description>` in `applyLesson()` | Low | High — per-lesson identity |
| **3 (P1)** | Dynamic canonical URL in `applyLesson()` | Low | Medium — prevents duplicate content |
| **4 (P1)** | JSON-LD structured data in snapshots | Medium | High — rich results eligibility |
| **5 (P2)** | Per-lesson static HTML snapshots | Medium | Very High — content visible to all crawlers |
| **6 (P2)** | Dynamic Open Graph / Twitter Card updates | Low | Medium — social sharing accuracy |

---

## 10. Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Snapshots diverge from SPA rendering | Medium | Snapshots use the same `index.html` as a template; CSS/JS is inlined from the source |
| `generate_seo.js` not run after lesson edits | Medium | Add hook to `create_lesson.js`; add to `CONTRIBUTING.md` |
| Netlify routing for `/lesson/` paths | Low | Use `netlify.toml` redirects — well-supported feature |
| JSON-LD validation errors | Low | Script validates against Schema.org types before writing |
| Crawlers still don't see JS-rendered content | Medium | Snapshots solve this for all crawlers; JS dynamic tags help Google |

---

## 11. Success Metrics

After implementation, verify with:

1. **Google Search Console** — all `?lesson=` URLs appear in coverage report.
2. **Sitemap submission** — `sitemap.xml` accepted without errors.
3. **Rich Results Test** — `https://search.google.com/test/rich-results` passes for snapshot URLs.
4. **OG Debugger** — `https://developers.facebook.com/tools/debug/` shows correct per-lesson previews.
5. **Mobile-Friendly Test** — All lesson URLs pass.

---

*Document prepared for SV2. This is a design document — no code changes have been made.*
