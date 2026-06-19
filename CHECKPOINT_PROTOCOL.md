# Checkpoint Protocol

## What a Checkpoint Is

A checkpoint is a durable, timestamped snapshot of the SV2 project state produced after a meaningful work session. It consists of three artifacts:

1. **Hash report** (`logs/hashes/`) — SHA-256 hashes of every tracked project file.
2. **Validation report** (`logs/validation/`) — pass/fail results for structural and content checks.
3. **Receipt** (`logs/receipts/`) — a human-readable summary of what changed, who did it, and what to do next.

Together these artifacts form an audit trail that any future worker can use to verify the project is in a known-good state before continuing work.

## When to Run a Checkpoint

Run a checkpoint:

- **After every meaningful work session** — any session that creates, modifies, or deletes project files.
- **Before handing off to another worker** — so the next worker can verify the state they are inheriting.
- **After completing a work order** — as the final step of the work order.
- **After completing lesson image production** — after provider candidate review, source caching, imagegen print assets, SEO regeneration, and validation.
- **When recovering from a failure** — to establish a new known-good baseline.

Do **not** run a checkpoint for trivial read-only inspection sessions that change nothing.

## How Agents Should Use It

### Full checkpoint (recommended)

```bash
node scripts/checkpoint.js \
  --session "descriptive-session-name" \
  --worker "Agent Name" \
  --summary "What was accomplished" \
  --created "file1.js,file2.md" \
  --modified "file3.json" \
  --deleted "old-file.txt" \
  --next "Recommended next action"
```

### Individual components

```bash
# Hashes only
node scripts/hash_project.js

# Validation only
node scripts/validate_project.js

# Receipt only
node scripts/create_receipt.js \
  --session "session-name" \
  --worker "Agent Name" \
  --summary "What was done" \
  --validation passed
```

### Reading artifacts

- `logs/hashes/LATEST.md` — most recent hash report (overwritten each run).
- `logs/validation/LATEST.md` — most recent validation report.
- `logs/receipts/LATEST.md` — most recent receipt.
- Timestamped copies are retained alongside `LATEST.md` for historical reference.

## How to Name Sessions

Use a short, descriptive kebab-case name:

- `lesson-04-image-patch`
- `checkpoint-infrastructure`
- `lesson-05-creation`
- `print-assets-water-cycle`
- `lesson-07-production`
- `agent-image-workflow-hardening`

Avoid generic names like `session-1` or `work`.

## How to Read Receipts

Each receipt contains:

| Field | Purpose |
|-------|---------|
| Timestamp | When the work was done |
| Session | Short label for the work |
| Worker | Which agent performed the work |
| Summary | What was accomplished |
| Files Created / Modified / Deleted | Exact file paths touched |
| Validation | Whether validation passed |
| Hash / Validation report paths | Links to supporting artifacts |
| Next Recommended Action | Suggested follow-up |

## How to Recover from Failed Validation

1. Read `logs/validation/LATEST.md` — identify which checks failed.
2. Fix the underlying issue (missing file, broken JSON, etc.).
3. Re-run `node scripts/validate_project.js` until all checks pass.
4. Re-run `node scripts/checkpoint.js` to produce a clean receipt.
5. Do not proceed with new work until validation passes.

## Lesson Production Receipt Requirements

When a checkpoint covers lesson creation or lesson image updates, the receipt summary should state:

- which lesson JSON files changed
- whether image provider candidates were reviewed
- whether `screenImage` fields were selected from provider results or approved existing sources
- whether `prepare_print_assets.js` was run
- whether source-based black-and-white print PNGs were saved to the `printImage` paths
- whether `generate_seo.js` and `validate_project.js` passed
- what browser or print proof remains, if any

## Files Excluded from Hashing

The following are **never** hashed or included in reports:

- `scripts/.env` — contains API keys.
- `logs/` — generated artifacts (would cause recursive noise).
- `node_modules/` — external dependencies.
- `.git/`, `.vscode/` — tool metadata.
- Hidden files (dot-prefixed) — `.DS_Store`, etc.

## Files Included in Hashing

- `index.html`
- `lessons/*.json` (including `manifest.json` and `lesson_template.json`)
- `scripts/*.js`
- `assets/images/*.png`
- `assets/source-images/*`
- `image-candidates/*`
- `print-asset-work-orders/*`
- Project markdown documents (`*.md` at repo root)

## Example Commands

```bash
# After completing a work order
node scripts/checkpoint.js \
  --session "lesson-04-image-patch" \
  --worker "Owl Alpha" \
  --summary "Patched 6 screen image URLs in lesson-04.json from IMAGE_PROVIDER_TEST.md" \
  --modified "lessons/lesson-04.json" \
  --validation passed \
  --next "Add missing print images for lesson-04"

# Periodic health check (no changes)
node scripts/checkpoint.js \
  --session "weekly-health-check" \
  --worker "Owl Alpha" \
  --summary "Routine project health check — no changes made" \
  --next "Continue with next work order"
```
