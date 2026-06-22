# SV2 Science Lessons

SV2 is a static lesson engine for elementary science and social-studies learning surfaces. The current surface includes six original science lessons plus expanded geography and history lesson tracks, SEO snapshots, agent-readable source posture, and a bounded in-browser assistant layer.

## Repository

- GitHub: `https://github.com/Apotheosys1982/SV2`
- Default branch: `main`
- Local checkout: `/Users/johnbarros/Documents/Codex/SV2`

## Run Locally

```bash
python3 -m http.server 8899
```

Open:

```bash
http://127.0.0.1:8899/index.html
```

## Project CLI

Use the project CLI instead of ad hoc scripts:

```bash
npm run doctor
npm run seo:check
npm run validate:ci
npm run pr-ready
```

The direct CLI form is also available:

```bash
node scripts/sv2.js pr-ready
```

## Current Surface Areas

- Lesson renderer: `index.html`, `script.js`, `styles.css`
- Lesson data: `lessons/`
- Static images: `assets/images/`
- SEO snapshots: `seo-snapshots/`
- Source/agent posture: `okf/`, `llms.txt`, `source-manifest.json`
- Assistant runtime data: `assistant/`, `answer-pack.json`

## Workflow Rules

- Keep `.env`, `.herenow/`, `.DS_Store`, and local generated noise out of commits.
- Use `sv2 pr-ready` before pushing a branch.
- Preserve the fixed five-section lesson renderer unless a renderer refactor is explicitly requested.
- After lesson, image, route, or print-asset changes, run SEO and validation through the CLI.

