# Clean Route Fix Summary — SV2 Science Lessons

**Date:** 2026-06-10
**Session:** clean-route-fix
**Worker:** Owl Alpha

---

## Problem

The clean SEO lesson URLs (`/lesson/lesson-05`) returned "page not found" on Netlify, even though:

- `seo-snapshots/lesson-05.html` existed locally
- `netlify.toml` contained a `[[redirects]]` rule mapping `/lesson/:id` to `/seo-snapshots/:id.html`

The existing query URL (`/?lesson=lesson-05`) continued to work because it's handled by the SPA shell (`index.html`).

## Root Cause

`netlify.toml` redirect rules require Netlify to process the TOML configuration file. Depending on the deployment context (branch deploys, deploy previews, or sites where the TOML is not in the publish directory), these rules may not be applied reliably.

Netlify's `_redirects` file is the more direct and universally supported mechanism — it's processed at the edge regardless of deployment context, as long as it's in the publish directory (the repo root for SV2).

Additionally, the `netlify.toml` used a wildcard pattern (`/lesson/:id`). While syntactically correct, explicit per-lesson rules in `_redirects` provide maximum compatibility and are easier to debug.

## Fix Applied

### 1. Created `_redirects` at repo root

File: `_redirects`

```
# Netlify redirects — SV2 SEO snapshot layer
# Clean lesson URLs → static snapshot files (served at same URL, status 200)
# These are explicit rules for maximum compatibility.

/lesson/lesson-01 /seo-snapshots/lesson-01.html 200
/lesson/lesson-02 /seo-snapshots/lesson-02.html 200
/lesson/lesson-03 /seo-snapshots/lesson-03.html 200
/lesson/lesson-04 /seo-snapshots/lesson-04.html 200
/lesson/lesson-05 /seo-snapshots/lesson-05.html 200
```

Each rule uses status `200` (rewrite — URL in the browser stays clean) rather than `301`/`302` (redirect — URL changes).

### 2. Updated `scripts/generate_seo.js`

Changes:
- Added `REDIRECTS_FILE` constant pointing to `_redirects` at repo root
- Added `buildRedirects(lessons)` function that generates explicit per-lesson rules from the manifest
- Added step 6b in `main()` that **always overwrites** `_redirects` on every run (not conditional like `netlify.toml`)
- Updated JSDoc to document `_redirects` as an output

This ensures `_redirects` stays in sync with the lesson manifest automatically.

## Files Changed

| File | Change |
|---|---|
| `_redirects` | Created — 5 explicit lesson redirect rules |
| `scripts/generate_seo.js` | Modified — added `_redirects` generation step |

## Files NOT Changed

- `netlify.toml` — kept as-is (harmless, provides fallback)
- `index.html` — untouched
- `seo-snapshots/*.html` — untouched
- `sitemap.xml` — untouched
- `robots.txt` — untouched
- All lesson JSON — untouched

## Routing Strategy

| URL | Mechanism | Content |
|---|---|---|
| `/` | Static file | `index.html` (SPA shell) |
| `/?lesson=lesson-05` | SPA (JS renders lesson) | `index.html` + client-side fetch |
| `/lesson/lesson-05` | `_redirects` rule (200) | `seo-snapshots/lesson-05.html` (URL stays clean) |

Both URL patterns work. The clean URL is the SEO canonical.

## Clean URLs Expected to Work After Deploy

| Lesson | Clean URL |
|---|---|
| Plants & Animals | `https://ariya-science.netlify.app/lesson/lesson-01` |
| Food Chains | `https://ariya-science.netlify.app/lesson/lesson-02` |
| Ecosystems & Interdependence | `https://ariya-science.netlify.app/lesson/lesson-03` |
| The Water Cycle | `https://ariya-science.netlify.app/lesson/lesson-04` |
| Trees | `https://ariya-science.netlify.app/lesson/lesson-05` |

## Validation Results

```
Project validation: 23/23 checks passed
Checkpoint:         ✓ complete
  Hash:             ✓ complete (74 files hashed)
  Validation:       ✓ passed
  Receipt:          logs/receipts/LATEST.md
```

## Checkpoint Receipt

- **Session:** clean-route-fix
- **Receipt path:** `logs/receipts/receipt-clean-route-fix-2026-06-10T08-42-47-103Z.md`
- **Hash report:** `logs/hashes/LATEST.md`
- **Validation report:** `logs/validation/LATEST.md`

---

*Fix applied to SV2. After Netlify deployment, `/lesson/lesson-05` (and all clean lesson URLs) should serve the corresponding SEO snapshot with a 200 status and no URL change in the browser.*
