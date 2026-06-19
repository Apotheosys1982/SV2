# SV2 CLI

`sv2` is the project command rail for local agents, CI, and future automation. It wraps the existing SV2 scripts without changing the static-site architecture.

## Run It

From the repo:

```bash
node scripts/sv2.js --help
node scripts/sv2.js doctor
node scripts/sv2.js pr-ready
```

Install a local `sv2` command:

```bash
make install-local
sv2 doctor
```

Or use npm script aliases:

```bash
npm run doctor
npm run pr-ready
```

## Command Contract

| Command | Purpose |
|---|---|
| `sv2 doctor` | Verifies required tools, files, directories, Git remote, and ignored secret paths |
| `sv2 status` | Shows Git branch, upstream, remote status, and latest commit |
| `sv2 check-syntax` | Runs `node --check` over `scripts/*.js` |
| `sv2 seo` | Regenerates SEO snapshots, sitemap, robots, redirects, and SEO report |
| `sv2 seo --check` | Verifies generated SEO artifacts are current without writing files |
| `sv2 validate` | Runs full project validation and writes a validation report |
| `sv2 validate --no-write` | Runs validation without writing timestamped logs |
| `sv2 hash` | Writes a project hash report |
| `sv2 checkpoint` | Runs hash, validation, and receipt generation |
| `sv2 create-lesson` | Wraps the lesson scaffold script |
| `sv2 pr-ready` | Runs the standard PR readiness gates |
| `sv2 run-script <script.js>` | Raw escape hatch for a script in `scripts/` |

## JSON Policy

Commands intended for automation support `--json`:

```bash
sv2 --json doctor
sv2 --json status
sv2 --json seo --check
sv2 --json validate --no-write
sv2 --json pr-ready
```

JSON output uses stable top-level fields:

- `ok`: boolean pass/fail
- `failures` or `results`: detailed machine-readable checks
- `warnings`: non-blocking issues, where applicable
- `steps`: command-gate summaries for `pr-ready`

Commands must not print secret values. `doctor` only verifies that secret-bearing paths such as `scripts/.env` and `.herenow/` are ignored.

## PR Gate

Run this before pushing a branch:

```bash
node scripts/sv2.js pr-ready
```

GitHub Actions runs the same gate on pull requests into `main`.
