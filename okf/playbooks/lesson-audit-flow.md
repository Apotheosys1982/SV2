---
type: playbook
title: "Lesson Audit Flow"
description: "How to verify all lessons are visible to humans and agents."
resource: sv2-biosphere-kids
tags: ["lesson", "audit"]
timestamp: 2026-06-21T00:45:00Z
status: active
---

# Lesson Audit Flow

- Confirm /lessons/manifest.json lists 12 lessons.
- Confirm /sitemap.xml includes subject and lesson URLs.
- Confirm /llms.txt lists every lesson JSON file.
- Confirm /answer-pack.json has lesson summary and answer-guidance records for every lesson.
- Confirm the public lesson selector can access every lesson.
