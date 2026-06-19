#!/usr/bin/env node

/**
 * create_receipt.js
 *
 * Creates a timestamped project receipt after a work session.
 *
 * Usage:
 *   node scripts/create_receipt.js \
 *     --session "lesson-04-image-patch" \
 *     --worker "Owl Alpha" \
 *     --summary "Patched 6 screen image URLs in lesson-04.json" \
 *     --created "lessons/lesson-04.json" \
 *     --modified "logs/..." \
 *     --deleted "" \
 *     --validation passed \
 *     --hash-report "logs/hashes/LATEST.md" \
 *     --validation-report "logs/validation/LATEST.md" \
 *     --next "Add missing print images for lesson-04"
 *
 * All flags are optional; sensible defaults are used when omitted.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RECEIPTS_DIR = path.join(ROOT, 'logs', 'receipts');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith('--') && i + 1 < argv.length) {
      const value = argv[i + 1];
      if (!value.startsWith('--')) {
        args[key.slice(2)] = value;
        i++;
      }
    }
  }
  return args;
}

function splitList(value) {
  if (!value || !value.trim()) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const timestamp = new Date().toISOString();
  const stamp = timestamp.replace(/[:.]/g, '-');

  const session = args.session || 'unspecified-session';
  const worker = args.worker || 'unknown-worker';
  const model = args.model || '';
  const summary = args.summary || 'No summary provided.';
  const created = splitList(args.created);
  const modified = splitList(args.modified);
  const deleted = splitList(args.deleted);
  const validation = args.validation || 'not-run';
  const hashReport = args['hash-report'] || 'logs/hashes/LATEST.md';
  const validationReport = args['validation-report'] || 'logs/validation/LATEST.md';
  const next = args.next || 'No next action specified.';

  fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

  const safeSession = session.replace(/[^a-zA-Z0-9._-]/g, '-');
  const fileName = `receipt-${safeSession}-${stamp}.md`;
  const filePath = path.join(RECEIPTS_DIR, fileName);

  let md = `# Project Receipt\n\n`;
  md += `| Field | Value |\n`;
  md += `|-------|-------|\n`;
  md += `| **Timestamp** | ${timestamp} |\n`;
  md += `| **Project** | SV2 Science Lessons |\n`;
  md += `| **Session** | ${session} |\n`;
  md += `| **Worker** | ${worker} |\n`;
  if (model) md += `| **Model** | ${model} |\n`;
  md += `| **Validation** | ${validation} |\n\n`;

  md += `## Summary\n\n${summary}\n\n`;

  md += `## Files Created\n\n`;
  if (created.length > 0) {
    for (const f of created) md += `- \`${f}\`\n`;
  } else {
    md += `_None_\n`;
  }
  md += '\n';

  md += `## Files Modified\n\n`;
  if (modified.length > 0) {
    for (const f of modified) md += `- \`${f}\`\n`;
  } else {
    md += `_None_\n`;
  }
  md += '\n';

  md += `## Files Deleted\n\n`;
  if (deleted.length > 0) {
    for (const f of deleted) md += `- \`${f}\`\n`;
  } else {
    md += `_None_\n`;
  }
  md += '\n';

  md += `## Artifacts\n\n`;
  md += `- **Hash report:** \`${hashReport}\`\n`;
  md += `- **Validation report:** \`${validationReport}\`\n\n`;

  md += `## Next Recommended Action\n\n${next}\n`;

  fs.writeFileSync(filePath, md, 'utf8');

  const latestPath = path.join(RECEIPTS_DIR, 'LATEST.md');
  fs.writeFileSync(latestPath, md, 'utf8');

  console.log('Receipt written: ' + path.relative(ROOT, filePath));
  console.log('  Session: ' + session);
  console.log('  Worker: ' + worker);
  console.log('  Validation: ' + validation);
}

main();
