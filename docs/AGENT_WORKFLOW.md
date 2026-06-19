# SV2 Agent Workflow

This repo uses GitHub `main` as the canonical saved version. Agents should propose changes through branches and pull requests.

## Start New Work

From the canonical local checkout:

```bash
git fetch origin
git worktree add ../SV2-worktrees/<short-task-name> -b codex/<short-task-name> origin/main
cd ../SV2-worktrees/<short-task-name>
node scripts/sv2.js doctor
```

This creates an isolated working folder from the latest cloud `main`.

## Make Changes

Prefer the existing production loop:

```bash
node scripts/sv2.js status
node scripts/sv2.js seo
node scripts/sv2.js validate
node scripts/sv2.js checkpoint \
  --session "<short-task-name>" \
  --worker "Codex" \
  --summary "What changed" \
  --modified "file-a,file-b" \
  --next "Recommended next action"
```

Use `sv2 seo --check` and `sv2 validate --no-write` when you need CI-style checks that do not create timestamped log files.

## Before Push

```bash
node scripts/sv2.js pr-ready
git status -sb
git add <intended-files>
git commit -m "Repo hardening"
git push -u origin codex/<short-task-name>
```

Stage explicit files when the worktree contains unrelated changes.

## Open A Draft PR

```bash
gh pr create \
  --draft \
  --base main \
  --head codex/<short-task-name> \
  --title "[codex] Repo hardening" \
  --body-file /tmp/sv2-pr-body.md
```

Do not merge your own PR as part of implementation unless the user explicitly asks for that.

## Protection Rules

`main` should require PRs and should not accept direct pushes. GitHub Actions runs the `sv2 pr-ready` gate for pull requests into `main`.

## Operating Rules

- Do not read, print, summarize, or commit `.env` files.
- Preserve the fixed five-section renderer unless the user explicitly asks for a renderer refactor.
- Regenerate SEO after lesson or route changes.
- Run validation after meaningful changes.
- Prefer a checkpoint receipt when a work session creates production state.
- Keep PRs scoped to one intentional change.
