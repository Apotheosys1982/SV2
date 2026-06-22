# SV2 Surface Assistant Notes

The SV2 surface assistant is a bounded static assistant layer shipped with the lesson site. It is not a live model integration.

## Files

- `answer-pack.json`
- `assistant/answer-pack.json`
- `assistant/foundational-context.json`
- `assistant/intent-taxonomy.json`
- `assistant/fixtures/`
- `okf/`
- `llms.txt`
- `source-manifest.json`

## Boundaries

- Answers must stay inside the approved SV2 lesson/source context.
- The assistant should route to lesson concepts, source posture, and learning support rather than improvising unsupported claims.
- Source links and agent-readable documents are part of the surface contract.

## Validation

Run:

```bash
npm run pr-ready
```

For no-write CI style checks:

```bash
npm run seo:check
npm run validate:ci
```

