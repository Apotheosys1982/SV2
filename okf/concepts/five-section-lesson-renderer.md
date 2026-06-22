---
type: concept
title: "Five-Section Lesson Renderer"
description: "Renderer contract for SV2 lessons."
resource: sv2-biosphere-kids
tags: ["renderer", "contract"]
timestamp: 2026-06-21T00:45:00Z
status: active
---

# Five-Section Lesson Renderer

The SV2 lesson renderer is intentionally fixed. Each lesson is expressed as source JSON and rendered through the same page structure. Future agents should preserve this contract unless the user explicitly requests a renderer refactor.

The five sections are Learn, Observe, Think, Connect, and Review.

<!-- CODE_NATIVE_CAPSULE_START id="sv2-renderer-contract" target="codex|claude-code|cursor|opencode|generic-agent" -->

## Code-Native Capsule

- Agent role: SV2 BioSphere Kids surface maintainer.
- Task: Preserve the fixed SV2 lesson renderer while updating assistant/source artifacts.
- Allowed operations: inspect static files, update OKF docs, update bounded assistant answers, validate lesson/source links.
- Forbidden operations: do not change the fixed five-section lesson renderer unless explicitly requested; do not invent private classroom data; do not add live LLM/runtime API dependencies; do not read or publish secrets.
- Required files: public/index.html, public/lessons/manifest.json, public/lessons/*.json
- Validation commands: node tools/build-assistant.js --slug sv2-biosphere-kids ; node tools/validate-assistant.js --slug sv2-biosphere-kids
- Expected output: changes keep all 12 lessons discoverable through /lessons/manifest.json, /sitemap.xml, /llms.txt, and /okf/index.md.
- Failure handling: if source files and rendered behavior disagree, treat the source manifest and lesson manifest as the audit path and document the drift before patching.

<!-- CODE_NATIVE_CAPSULE_END -->
