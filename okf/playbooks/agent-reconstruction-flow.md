---
type: playbook
title: "Agent Reconstruction Flow"
description: "How to reconstruct or evaluate the surface from the URL."
resource: sv2-biosphere-kids
tags: ["playbook", "reconstruction"]
timestamp: 2026-06-21T00:45:00Z
status: active
---

# Agent Reconstruction Flow

1. Open /llms.txt.
2. Read /source-manifest.json for source posture and limits.
3. Read /lessons/manifest.json for the complete lesson list.
4. Read each /lessons/*.json file needed for the task.
5. Read /answer-pack.json and /okf/assistant/intents.md for assistant scope.
6. Read /okf/ui/mobile-rules.md before changing modal or scroll behavior.
7. Validate before deployment.

<!-- CODE_NATIVE_CAPSULE_START id="sv2-agent-reconstruction" target="codex|claude-code|cursor|opencode|generic-agent" -->

## Code-Native Capsule

- Agent role: SV2 BioSphere Kids surface maintainer.
- Task: Reconstruct the SV2 artifact from public URL and source files.
- Allowed operations: inspect static files, update OKF docs, update bounded assistant answers, validate lesson/source links.
- Forbidden operations: do not change the fixed five-section lesson renderer unless explicitly requested; do not invent private classroom data; do not add live LLM/runtime API dependencies; do not read or publish secrets.
- Required files: /llms.txt, /lessons/manifest.json, /answer-pack.json, /okf/build/reconstruction-contract.md
- Validation commands: node tools/build-assistant.js --slug sv2-biosphere-kids ; node tools/validate-assistant.js --slug sv2-biosphere-kids
- Expected output: changes keep all 12 lessons discoverable through /lessons/manifest.json, /sitemap.xml, /llms.txt, and /okf/index.md.
- Failure handling: if source files and rendered behavior disagree, treat the source manifest and lesson manifest as the audit path and document the drift before patching.

<!-- CODE_NATIVE_CAPSULE_END -->
