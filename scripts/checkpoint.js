#!/usr/bin/env node

/**
 * checkpoint.js
 *
 * Runs a full project checkpoint:
 *   1. hash_project.js  → logs/hashes/
 *   2. validate_project.js → logs/validation/
 *   3. create_receipt.js  → logs/receipts/
 *   4. Prints a final checkpoint summary to stdout
 *
 * Usage:
 *   node scripts/checkpoint.js \
 *     --session "checkpoint-2026-06-09" \
 *     --worker "Owl Alpha" \
 *     --summary "Formalized receipts, logs, and checkpoint validation infrastructure" \
 *     --created "scripts/hash_project.js,scripts/validate_project.js,scripts/create_receipt.js,scripts/checkpoint.js,CHECKPOINT_PROTOCOL.md" \
 *     --modified "PROJECT_STATE.md" \
 *     --next "Run checkpoint after every meaningful work session"
 *
 * If validation fails the script exits with a non-zero status after printing
 * the failure details.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');

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

function runScript(scriptName, label) {
  const scriptPath = path.join(SCRIPTS, scriptName);
  console.log(`\n── ${label} ──`);
  try {
    execSync(`node ${scriptPath}`, { cwd: ROOT, stdio: 'inherit' });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const session = args.session || `checkpoint-${new Date().toISOString().slice(0, 10)}`;
  const worker = args.worker || 'unknown-worker';
  const model = args.model || '';
  const summary = args.summary || 'Project checkpoint.';
  const created = args.created || '';
  const modified = args.modified || '';
  const deleted = args.deleted || '';
  const next = args.next || 'Continue development.';

  console.log('═══════════════════════════════════════════');
  console.log('  SV2 CHECKPOINT');
  console.log(`  Session: ${session}`);
  console.log(`  Time:    ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════');

  // Step 1: Hash
  const hashResult = runScript('hash_project.js', 'STEP 1 — Hash Project');

  // Step 2: Validate
  const validationResult = runScript('validate_project.js', 'STEP 2 — Validate Project');

  // Step 3: Receipt
  var receiptArgs = [
    '--session', session,
    '--worker', worker,
  ];
  if (model) receiptArgs.push('--model', model);
  receiptArgs.push('--summary', summary);
  if (created) receiptArgs.push('--created', created);
  if (modified) receiptArgs.push('--modified', modified);
  if (deleted) receiptArgs.push('--deleted', deleted);
  receiptArgs.push('--validation', validationResult.ok ? 'passed' : 'FAILED');
  receiptArgs.push('--hash-report', 'logs/hashes/LATEST.md');
  receiptArgs.push('--validation-report', 'logs/validation/LATEST.md');
  receiptArgs.push('--next', next);

  console.log('\n-- STEP 3 - Create Receipt --');
  try {
    var receiptCmd = 'node ' + path.join(SCRIPTS, 'create_receipt.js') + ' ' + receiptArgs.map(function(a){ return '"' + a + '"'; }).join(' ');
    execSync(receiptCmd, { cwd: ROOT, stdio: 'inherit' });
  } catch (err) {
    console.error('Receipt creation failed:', err.message);
  }

  // Final summary
  console.log('\n═══════════════════════════════════════════');
  console.log('  CHECKPOINT SUMMARY');
  console.log('═══════════════════════════════════════════');
  console.log(`  Session:     ${session}`);
  console.log(`  Worker:      ${worker}`);
  console.log(`  Hash:        ${hashResult.ok ? '✓ complete' : '✗ failed'}`);
  console.log(`  Validation:  ${validationResult.ok ? '✓ passed' : '✗ FAILED'}`);
  console.log(`  Receipt:     logs/receipts/LATEST.md`);
  console.log(`  Hashes:      logs/hashes/LATEST.md`);
  console.log(`  Validation:  logs/validation/LATEST.md`);
  console.log('═══════════════════════════════════════════');

  if (!validationResult.ok) {
    console.log('\n⚠ Validation failed. Review logs/validation/LATEST.md for details.');
    process.exit(1);
  }

  console.log('\n✓ Checkpoint complete.');
}

main();
