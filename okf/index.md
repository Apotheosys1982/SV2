---
type: okf_index
title: "BioSphere Kids OKF Index"
description: "Agent-readable map for the SV2 BioSphere Kids surface."
resource: sv2-biosphere-kids
tags: ["okf", "index", "sv2"]
timestamp: 2026-06-21T00:45:00Z
status: active
---

# BioSphere Kids OKF Index

This directory is the behind-the-scenes OKF-style knowledge bundle for the public BioSphere Kids surface at https://ariya-science.netlify.app.

The rendered page may show one lesson at a time. This bundle exposes the whole artifact: source posture, lesson inventory, assistant boundaries, UI contracts, and validation expectations.

## Read order

1. /llms.txt
2. /source-manifest.json
3. /lessons/manifest.json
4. /okf/sources/source-posture.md
5. /okf/assistant/intents.md
6. /okf/build/reconstruction-contract.md
7. /okf/validation/test-suite.md

## Lesson inventory

- lesson-01: Subject / Lesson 1 — Plants & Animals (lessons/lesson-01.json)
- lesson-02: Subject / Lesson 2 — Food Chains (lessons/lesson-02.json)
- lesson-03: Subject / Lesson 3 — Ecosystems & Interdependence (lessons/lesson-03.json)
- lesson-04: Subject / Lesson 04 — The Water Cycle (lessons/lesson-04.json)
- lesson-05: Subject / Lesson 05 — Trees (lessons/lesson-05.json)
- lesson-06: Subject / Lesson 06 — Habitats (lessons/lesson-06.json)
- geography-01: Subject / Lesson 1 — Maps & Globes (lessons/geography-01.json)
- geography-02: Subject / Lesson 2 — Landforms & Bodies of Water (lessons/geography-02.json)
- geography-03: Subject / Lesson 3 — Regions & Communities (lessons/geography-03.json)
- history-01: Subject / Lesson 1 — History Detectives (lessons/history-01.json)
- history-02: Subject / Lesson 2 — Rivers, Cities & Early America (lessons/history-02.json)
- history-03: Subject / Lesson 3 — American Independence & World Ideas (lessons/history-03.json)

<!-- CODE_NATIVE_CAPSULE_START id="sv2-okf-index" target="codex|claude-code|cursor|opencode|generic-agent" -->

## Code-Native Capsule

- Agent role: SV2 BioSphere Kids surface maintainer.
- Task: Orient an external agent before it edits or evaluates the SV2 surface.
- Allowed operations: inspect static files, update OKF docs, update bounded assistant answers, validate lesson/source links.
- Forbidden operations: do not change the fixed five-section lesson renderer unless explicitly requested; do not invent private classroom data; do not add live LLM/runtime API dependencies; do not read or publish secrets.
- Required files: /llms.txt, /source-manifest.json, /lessons/manifest.json, /okf/index.md
- Validation commands: node tools/build-assistant.js --slug sv2-biosphere-kids ; node tools/validate-assistant.js --slug sv2-biosphere-kids
- Expected output: changes keep all 12 lessons discoverable through /lessons/manifest.json, /sitemap.xml, /llms.txt, and /okf/index.md.
- Failure handling: if source files and rendered behavior disagree, treat the source manifest and lesson manifest as the audit path and document the drift before patching.

<!-- CODE_NATIVE_CAPSULE_END -->
