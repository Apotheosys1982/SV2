#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');

const REQUIRED_FILES = [
  'index.html',
  'lessons/manifest.json',
  'lessons/lesson_template.json',
  'scripts/create_lesson.js',
  'scripts/generate_seo.js',
  'scripts/validate_project.js',
  'scripts/hash_project.js',
  'scripts/checkpoint.js',
  'scripts/sv2.js',
  'package.json',
  '.github/workflows/sv2-checks.yml',
  '.github/pull_request_template.md',
];

const REQUIRED_DIRS = [
  'assets',
  'lessons',
  'logs/hashes',
  'logs/receipts',
  'logs/sessions',
  'logs/validation',
  'scripts',
  'seo-snapshots',
];

const MUST_IGNORE = [
  'scripts/.env',
  '.herenow/state.json',
  '.DS_Store',
];

function parseCli(argv) {
  const json = argv.includes('--json');
  const help = argv.includes('--help') || argv.includes('-h');
  const args = argv.filter((arg) => arg !== '--json' && arg !== '--help' && arg !== '-h');
  const command = args[0] || 'help';
  return {
    command,
    commandArgs: args.slice(1),
    json,
    help,
  };
}

function commandExists(command) {
  const result = spawnSync('which', [command], { encoding: 'utf-8' });
  return {
    command,
    ok: result.status === 0,
    path: result.stdout.trim() || null,
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    encoding: options.encoding || 'utf-8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function runGit(args, options = {}) {
  return run('git', args, { ...options, cwd: ROOT, capture: true });
}

function runNodeScript(scriptName, args, options = {}) {
  return run(process.execPath, [path.join(SCRIPTS_DIR, scriptName), ...args], {
    ...options,
    cwd: ROOT,
  });
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function readJsonFromCommand(scriptName, args) {
  const result = runNodeScript(scriptName, args, { capture: true });
  let payload = null;
  try {
    payload = result.stdout ? JSON.parse(result.stdout) : null;
  } catch (err) {
    payload = { parseError: err.message, stdout: result.stdout };
  }
  return { ...result, payload };
}

function collectDoctor() {
  const tools = ['node', 'git', 'gh'].map(commandExists);
  const gitRoot = runGit(['rev-parse', '--show-toplevel']);
  const branch = runGit(['branch', '--show-current']);
  const upstream = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  const remote = runGit(['remote', 'get-url', 'origin']);
  const status = runGit(['status', '--porcelain']);

  const files = REQUIRED_FILES.map((relPath) => ({
    path: relPath,
    ok: fileExists(relPath),
  }));

  const directories = REQUIRED_DIRS.map((relPath) => {
    const abs = path.join(ROOT, relPath);
    return {
      path: relPath,
      ok: fs.existsSync(abs) && fs.statSync(abs).isDirectory(),
    };
  });

  const ignored = MUST_IGNORE.map((relPath) => {
    const result = runGit(['check-ignore', '-q', relPath]);
    return {
      path: relPath,
      ok: result.status === 0,
    };
  });

  const failures = [
    ...tools.filter((tool) => !tool.ok).map((tool) => `Missing command: ${tool.command}`),
    ...files.filter((file) => !file.ok).map((file) => `Missing file: ${file.path}`),
    ...directories.filter((dir) => !dir.ok).map((dir) => `Missing directory: ${dir.path}`),
    ...ignored.filter((entry) => !entry.ok).map((entry) => `Path is not ignored: ${entry.path}`),
  ];

  if (!gitRoot.ok) failures.push('Not inside a Git repository');
  if (!remote.ok) failures.push('Missing origin remote');

  const warnings = [];
  if (status.stdout.trim()) {
    warnings.push('Working tree has local changes');
  }
  if (!upstream.ok) {
    warnings.push('Current branch has no upstream tracking branch');
  }

  return {
    ok: failures.length === 0,
    project: 'SV2',
    root: ROOT,
    node: process.version,
    git: {
      root: gitRoot.stdout.trim() || null,
      branch: branch.stdout.trim() || null,
      upstream: upstream.ok ? upstream.stdout.trim() : null,
      origin: remote.ok ? remote.stdout.trim() : null,
      dirty: Boolean(status.stdout.trim()),
      status: status.stdout.trim().split('\n').filter(Boolean),
    },
    tools,
    files,
    directories,
    ignored,
    warnings,
    failures,
  };
}

function printDoctor(result) {
  console.log('SV2 doctor');
  console.log(`Root: ${result.root}`);
  console.log(`Branch: ${result.git.branch || 'unknown'}`);
  console.log(`Origin: ${result.git.origin || 'missing'}`);
  console.log(`Node: ${result.node}`);

  if (result.failures.length) {
    console.log('\nFailures:');
    result.failures.forEach((failure) => console.log(`  - ${failure}`));
  }

  if (result.warnings.length) {
    console.log('\nWarnings:');
    result.warnings.forEach((warning) => console.log(`  - ${warning}`));
  }

  console.log(`\nResult: ${result.ok ? 'PASS' : 'FAIL'}`);
}

function collectStatus() {
  const branch = runGit(['branch', '--show-current']);
  const upstream = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  const shortStatus = runGit(['status', '-sb']);
  const lastCommit = runGit(['log', '--oneline', '--decorate', '-1']);
  const remote = runGit(['remote', '-v']);

  return {
    ok: shortStatus.ok,
    branch: branch.stdout.trim() || null,
    upstream: upstream.ok ? upstream.stdout.trim() : null,
    status: shortStatus.stdout.trim(),
    lastCommit: lastCommit.stdout.trim() || null,
    remotes: remote.stdout.trim().split('\n').filter(Boolean),
  };
}

function printStatus(status) {
  console.log(status.status || 'No Git status available.');
  if (status.lastCommit) console.log(status.lastCommit);
}

function checkSyntax(options = {}) {
  const scripts = fs.readdirSync(SCRIPTS_DIR)
    .filter((file) => file.endsWith('.js'))
    .sort();

  const results = scripts.map((script) => {
    const relPath = `scripts/${script}`;
    const result = run(process.execPath, ['--check', path.join(SCRIPTS_DIR, script)], {
      cwd: ROOT,
      capture: true,
    });
    return {
      file: relPath,
      ok: result.ok,
      status: result.status,
      stderr: result.stderr.trim(),
    };
  });

  const failed = results.filter((result) => !result.ok);
  const payload = {
    ok: failed.length === 0,
    checked: results.length,
    failed: failed.length,
    results,
  };

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else if (!options.silent) {
    results.forEach((result) => {
      console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.file}`);
      if (result.stderr) console.log(result.stderr);
    });
  }

  return payload;
}

function prReady(options = {}) {
  const steps = [];

  const doctor = collectDoctor();
  steps.push({ name: 'doctor', ok: doctor.ok, payload: doctor });

  const syntax = checkSyntax({ json: false, silent: options.json });
  steps.push({ name: 'check-syntax', ok: syntax.ok, payload: syntax });

  const seo = readJsonFromCommand('generate_seo.js', ['--check', '--json']);
  steps.push({ name: 'seo-check', ok: seo.ok && seo.payload && seo.payload.ok, payload: seo.payload });

  const validation = readJsonFromCommand('validate_project.js', ['--no-write', '--json']);
  steps.push({ name: 'validation', ok: validation.ok && validation.payload && validation.payload.ok, payload: validation.payload });

  const payload = {
    ok: steps.every((step) => step.ok),
    steps,
  };

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log('\nSV2 PR readiness');
    steps.forEach((step) => console.log(`${step.ok ? 'PASS' : 'FAIL'} ${step.name}`));
  }

  return payload;
}

function printHelp() {
  console.log(`SV2 project CLI

Usage:
  sv2 <command> [options]
  node scripts/sv2.js <command> [options]

Commands:
  doctor                  Check local repo, tools, required files, and ignored secret paths
  status                  Print Git branch, upstream, remote, and short status
  check-syntax            Run node --check over scripts/*.js
  seo [--check]           Generate SEO artifacts, or verify they are current with --check
  validate [--no-write]   Run project validation; --no-write avoids timestamped reports
  hash                    Run the project hash report
  checkpoint [args...]    Run the full hash + validation + receipt checkpoint
  create-lesson [args...] Create a lesson via scripts/create_lesson.js
  pr-ready                Run doctor, syntax, SEO check, and validation gates
  run-script <file>       Raw escape hatch for a script in scripts/

Global options:
  --json                  Emit JSON for commands that support it
  --help                  Show this help

Examples:
  sv2 doctor
  sv2 --json pr-ready
  sv2 seo --check
  sv2 checkpoint --session "lesson-07" --worker "Codex" --summary "Added lesson 07"
`);
}

function passthrough(scriptName, args) {
  const result = runNodeScript(scriptName, args);
  process.exit(result.status || 0);
}

function rawRunScript(args) {
  const scriptName = args[0];
  if (!scriptName || scriptName.includes('/') || scriptName.includes('\\') || !scriptName.endsWith('.js')) {
    console.error('Usage: sv2 run-script <script.js> [args...]');
    process.exit(1);
  }

  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) {
    console.error(`Script not found: scripts/${scriptName}`);
    process.exit(1);
  }

  passthrough(scriptName, args.slice(1));
}

function main() {
  const cli = parseCli(process.argv.slice(2));

  if (cli.help || cli.command === 'help') {
    printHelp();
    return;
  }

  if (cli.command === 'doctor') {
    const result = collectDoctor();
    if (cli.json) console.log(JSON.stringify(result, null, 2));
    else printDoctor(result);
    process.exit(result.ok ? 0 : 1);
  }

  if (cli.command === 'status') {
    const result = collectStatus();
    if (cli.json) console.log(JSON.stringify(result, null, 2));
    else printStatus(result);
    process.exit(result.ok ? 0 : 1);
  }

  if (cli.command === 'check-syntax' || cli.command === 'syntax') {
    const result = checkSyntax({ json: cli.json });
    process.exit(result.ok ? 0 : 1);
  }

  if (cli.command === 'seo' || cli.command === 'generate-seo') {
    const args = [...cli.commandArgs];
    if (cli.json && !args.includes('--json')) args.push('--json');
    passthrough('generate_seo.js', args);
  }

  if (cli.command === 'validate') {
    const args = [...cli.commandArgs];
    if (cli.json && !args.includes('--json')) args.push('--json');
    passthrough('validate_project.js', args);
  }

  if (cli.command === 'hash') {
    passthrough('hash_project.js', cli.commandArgs);
  }

  if (cli.command === 'checkpoint') {
    passthrough('checkpoint.js', cli.commandArgs);
  }

  if (cli.command === 'create-lesson') {
    passthrough('create_lesson.js', cli.commandArgs);
  }

  if (cli.command === 'pr-ready') {
    const result = prReady({ json: cli.json });
    process.exit(result.ok ? 0 : 1);
  }

  if (cli.command === 'run-script') {
    rawRunScript(cli.commandArgs);
  }

  console.error(`Unknown command: ${cli.command}`);
  console.error('Run sv2 --help for usage.');
  process.exit(1);
}

main();
