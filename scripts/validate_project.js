#!/usr/bin/env node

/**
 * validate_project.js
 *
 * Validates the current SV2 project state and writes a timestamped report to
 * logs/validation/.
 *
 * Checks:
 *   - Required root files and script files exist
 *   - manifest.json and lesson JSON files parse correctly
 *   - Manifest entries point to real lessons and include the default lesson
 *   - Lesson files follow the SV2 five-section contract used by index.html
 *   - Screen/print image fields exist, and local print assets exist on disk
 *   - Teacher prompts exist for each section, including promptE/promptF support
 *   - SEO snapshots, sitemap, robots.txt, _redirects, and netlify.toml are coherent
 *   - logs/ directory structure is present
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOG_DIR = path.join(ROOT, 'logs', 'validation');
const BASE_URL = 'https://ariya-science.netlify.app';

const REQUIRED_ROOT_FILES = [
  { path: 'index.html', label: 'Application entry point' },
  { path: 'PROJECT_STATE.md', label: 'Project state document' },
  { path: 'AGENT_LESSON_PRODUCTION_PROTOCOL.md', label: 'Agent lesson production protocol' },
  { path: 'CONTRIBUTING.md', label: 'Contributor guide' },
  { path: 'IMAGE_PROVIDER_TEST.md', label: 'Image provider test report' },
  { path: 'SEO_GENERATION_REPORT.md', label: 'SEO generation report' },
  { path: 'sitemap.xml', label: 'Sitemap' },
  { path: 'robots.txt', label: 'Robots file' },
  { path: '_redirects', label: 'Netlify redirects file' },
  { path: 'netlify.toml', label: 'Netlify TOML configuration' },
];

const REQUIRED_LESSON_FILES = [
  { path: 'lessons/lesson_template.json', label: 'Lesson template' },
  { path: 'lessons/manifest.json', label: 'Lesson manifest' },
];

const REQUIRED_SCRIPTS = [
  { path: 'scripts/hash_project.js', label: 'Hash script' },
  { path: 'scripts/validate_project.js', label: 'Validation script' },
  { path: 'scripts/create_receipt.js', label: 'Receipt script' },
  { path: 'scripts/checkpoint.js', label: 'Checkpoint script' },
  { path: 'scripts/create_lesson.js', label: 'Lesson creation script' },
  { path: 'scripts/update_manifest.js', label: 'Manifest update script' },
  { path: 'scripts/generate_seo.js', label: 'SEO generation script' },
  { path: 'scripts/test_image_providers.js', label: 'Image provider test script' },
  { path: 'scripts/search_lesson_images.js', label: 'Agent image candidate search helper' },
  { path: 'scripts/prepare_print_assets.js', label: 'Agent print asset preparation helper' },
];

const REQUIRED_LOG_DIRS = [
  { path: 'logs/receipts', label: 'Receipts directory' },
  { path: 'logs/validation', label: 'Validation directory' },
  { path: 'logs/hashes', label: 'Hashes directory' },
  { path: 'logs/sessions', label: 'Sessions directory' },
];

function cleanDetail(value) {
  return String(value || 'OK').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function checkExists(relPath, label) {
  const abs = path.join(ROOT, relPath);
  const exists = fs.existsSync(abs);
  return { relPath, label, status: exists ? 'PASS' : 'FAIL', detail: exists ? 'OK' : 'File not found' };
}

function readJson(relPath) {
  const abs = path.join(ROOT, relPath);
  const content = fs.readFileSync(abs, 'utf-8');
  return JSON.parse(content);
}

function checkJson(relPath, label) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    return { relPath, label, status: 'FAIL', detail: 'File not found' };
  }
  try {
    readJson(relPath);
    return { relPath, label, status: 'PASS', detail: 'Valid JSON' };
  } catch (err) {
    return { relPath, label, status: 'FAIL', detail: err.message };
  }
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function arrayWithItems(value, min = 1) {
  return Array.isArray(value) && value.length >= min;
}

function validatePrompt(prompt, label, errors) {
  if (!prompt || typeof prompt !== 'object') {
    errors.push(`${label} is missing`);
    return;
  }
  ['label', 'hint', 'placeholder', 'teacherKey'].forEach((key) => {
    if (!nonEmptyString(prompt[key])) errors.push(`${label}.${key} is missing`);
  });
}

function checkTemplateContract() {
  const relPath = 'lessons/lesson_template.json';
  const errors = [];
  let template;

  try {
    template = readJson(relPath);
  } catch (err) {
    return { relPath, label: 'Lesson template contract', status: 'FAIL', detail: err.message };
  }

  if (template.id !== 'lesson-XX') errors.push('template id must stay lesson-XX');
  if (!nonEmptyString(template.meta && template.meta.title)) errors.push('template meta.title is missing');
  if (!nonEmptyString(template.hero && template.hero.imageQuery)) errors.push('template hero.imageQuery is missing');
  if (!nonEmptyString(template.hero && template.hero.screenImage)) errors.push('template hero.screenImage is missing');
  if (!nonEmptyString(template.hero && template.hero.printImage)) errors.push('template hero.printImage is missing');

  if (!Array.isArray(template.sections)) {
    errors.push('template sections must be an array');
  } else {
    if (template.sections.length !== 5) errors.push('template must contain exactly 5 sections');
    template.sections.forEach((section, idx) => {
      const prefix = `template.sections[${idx}]`;
      if (section.id !== `s${idx + 1}`) errors.push(`${prefix}.id must be s${idx + 1}`);
      if (!nonEmptyString(section.imageQuery)) errors.push(`${prefix}.imageQuery is missing`);
      if (!nonEmptyString(section.screenImage)) errors.push(`${prefix}.screenImage is missing`);
      if (!nonEmptyString(section.printImage)) errors.push(`${prefix}.printImage is missing`);
      const promptKeys = ['prompt', 'promptE', 'promptF'].filter((key) => section[key]);
      if (promptKeys.length === 0) errors.push(`${prefix} needs prompt, promptE, or promptF`);
    });
  }

  return {
    relPath,
    label: 'Lesson template contract',
    status: errors.length ? 'FAIL' : 'PASS',
    detail: errors.length ? errors.join('; ') : 'Five-section scaffold and image workflow fields OK',
  };
}

function checkLessonContract(relPath) {
  const errors = [];
  let lesson;

  try {
    lesson = readJson(relPath);
  } catch (err) {
    return { relPath, label: `Lesson contract: ${relPath}`, status: 'FAIL', detail: err.message };
  }

  const expectedId = path.basename(relPath, '.json');
  if (lesson.id !== expectedId) errors.push(`id must be ${expectedId}`);

  if (!lesson.meta || typeof lesson.meta !== 'object') errors.push('meta is missing');
  if (!nonEmptyString(lesson.meta && lesson.meta.title)) errors.push('meta.title is missing');
  if (!nonEmptyString(lesson.meta && lesson.meta.subtitle)) errors.push('meta.subtitle is missing');
  if (!arrayWithItems(lesson.meta && lesson.meta.kicker, 4)) errors.push('meta.kicker needs at least 4 entries');

  if (!lesson.hero || typeof lesson.hero !== 'object') errors.push('hero is missing');
  if (!nonEmptyString(lesson.hero && lesson.hero.ariaLabel)) errors.push('hero.ariaLabel is missing');
  if (!nonEmptyString(lesson.hero && lesson.hero.imageQuery)) errors.push('hero.imageQuery is missing');
  if (!nonEmptyString(lesson.hero && lesson.hero.screenImage)) errors.push('hero.screenImage is missing');
  if (!nonEmptyString(lesson.hero && lesson.hero.printImage)) {
    errors.push('hero.printImage is missing');
  } else if (!fs.existsSync(path.join(ROOT, lesson.hero.printImage))) {
    errors.push(`hero.printImage missing on disk: ${lesson.hero.printImage}`);
  }

  const heroCopy = lesson.heroCopy || {};
  if (!nonEmptyString(heroCopy.lede)) errors.push('heroCopy.lede is missing');
  if (!nonEmptyString(heroCopy.whatStudentsLearn)) errors.push('heroCopy.whatStudentsLearn is missing');
  if (!arrayWithItems(heroCopy.learningTargets, 3)) errors.push('heroCopy.learningTargets needs at least 3 entries');
  if (!arrayWithItems(heroCopy.studentDirections, 3)) errors.push('heroCopy.studentDirections needs at least 3 entries');
  if (!arrayWithItems(heroCopy.keyVocabulary, 4)) errors.push('heroCopy.keyVocabulary needs at least 4 entries');
  (heroCopy.keyVocabulary || []).forEach((v, idx) => {
    if (!nonEmptyString(v.term) || !nonEmptyString(v.def)) {
      errors.push(`heroCopy.keyVocabulary[${idx}] needs term and def`);
    }
  });

  if (!Array.isArray(lesson.sections)) {
    errors.push('sections must be an array');
  } else {
    if (lesson.sections.length !== 5) errors.push('sections must contain exactly 5 sections for the current renderer');

    lesson.sections.forEach((section, idx) => {
      const expectedSectionId = `s${idx + 1}`;
      const prefix = `sections[${idx}]`;
      if (section.id !== expectedSectionId) errors.push(`${prefix}.id must be ${expectedSectionId}`);
      if (!nonEmptyString(section.chip)) errors.push(`${prefix}.chip is missing`);
      if (!nonEmptyString(section.imageQuery)) errors.push(`${prefix}.imageQuery is missing`);
      if (!nonEmptyString(section.title)) errors.push(`${prefix}.title is missing`);
      if (!nonEmptyString(section.lede)) errors.push(`${prefix}.lede is missing`);
      if (!nonEmptyString(section.screenImage)) errors.push(`${prefix}.screenImage is missing`);
      if (!nonEmptyString(section.printImage)) {
        errors.push(`${prefix}.printImage is missing`);
      } else if (!fs.existsSync(path.join(ROOT, section.printImage))) {
        errors.push(`${prefix}.printImage missing on disk: ${section.printImage}`);
      }

      if (!Array.isArray(section.cards) || section.cards.length < 2) {
        errors.push(`${prefix}.cards needs at least 2 cards`);
      } else {
        section.cards.slice(0, 2).forEach((card, cardIdx) => {
          if (!nonEmptyString(card.title)) errors.push(`${prefix}.cards[${cardIdx}].title is missing`);
          if (!arrayWithItems(card.items, 2)) errors.push(`${prefix}.cards[${cardIdx}].items needs at least 2 entries`);
        });
      }

      const promptKeys = ['prompt', 'promptE', 'promptF'].filter((key) => section[key]);
      if (promptKeys.length === 0) {
        errors.push(`${prefix} needs prompt, promptE, or promptF`);
      }
      promptKeys.forEach((key) => validatePrompt(section[key], `${prefix}.${key}`, errors));
    });
  }

  return {
    relPath,
    label: `Lesson contract: ${relPath}`,
    status: errors.length ? 'FAIL' : 'PASS',
    detail: errors.length ? errors.join('; ') : 'Schema, image queries, prompts, and local print assets OK',
  };
}

function loadManifest() {
  try {
    return readJson('lessons/manifest.json');
  } catch {
    return null;
  }
}

function checkManifestIntegrity() {
  const manifest = loadManifest();
  if (!manifest) {
    return { label: 'Manifest integrity', status: 'FAIL', detail: 'manifest.json not found or invalid' };
  }

  const errors = [];
  if (!manifest.defaultLessonId) errors.push('Missing defaultLessonId');
  if (!Array.isArray(manifest.lessons) || manifest.lessons.length === 0) errors.push('No lessons in manifest');

  const ids = new Set();
  for (const entry of manifest.lessons || []) {
    if (!nonEmptyString(entry.id)) errors.push('Manifest entry missing id');
    if (!nonEmptyString(entry.label)) errors.push(`${entry.id || 'unknown'} missing label`);
    if (!nonEmptyString(entry.file)) errors.push(`${entry.id || 'unknown'} missing file`);
    if (ids.has(entry.id)) errors.push(`Duplicate lesson id: ${entry.id}`);
    ids.add(entry.id);
    if (entry.file && !fs.existsSync(path.join(ROOT, entry.file))) errors.push(`Missing lesson file: ${entry.file}`);
  }
  if (manifest.defaultLessonId && !ids.has(manifest.defaultLessonId)) {
    errors.push(`defaultLessonId not present in lessons: ${manifest.defaultLessonId}`);
  }

  return {
    label: 'Manifest integrity',
    status: errors.length ? 'FAIL' : 'PASS',
    detail: errors.length ? errors.join('; ') : `${manifest.lessons.length} lessons registered`,
  };
}

function checkSeoArtifacts() {
  const manifest = loadManifest();
  if (!manifest || !Array.isArray(manifest.lessons)) {
    return { label: 'SEO artifact coverage', status: 'FAIL', detail: 'Manifest unavailable' };
  }

  const errors = [];
  const sitemap = fs.existsSync(path.join(ROOT, 'sitemap.xml'))
    ? fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf-8')
    : '';
  const robots = fs.existsSync(path.join(ROOT, 'robots.txt'))
    ? fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf-8')
    : '';
  const redirects = fs.existsSync(path.join(ROOT, '_redirects'))
    ? fs.readFileSync(path.join(ROOT, '_redirects'), 'utf-8')
    : '';

  if (!sitemap.includes(`${BASE_URL}/`)) errors.push('sitemap missing root URL');
  if (!robots.includes(`${BASE_URL}/sitemap.xml`)) errors.push('robots.txt missing sitemap reference');

  manifest.lessons.forEach((entry) => {
    const snapshot = `seo-snapshots/${entry.id}.html`;
    const cleanUrl = `${BASE_URL}/lesson/${entry.id}`;
    const redirectLine = `/lesson/${entry.id} /seo-snapshots/${entry.id}.html 200`;

    if (!fs.existsSync(path.join(ROOT, snapshot))) errors.push(`Missing snapshot: ${snapshot}`);
    if (!sitemap.includes(cleanUrl)) errors.push(`sitemap missing ${cleanUrl}`);
    if (!redirects.includes(redirectLine)) errors.push(`_redirects missing ${redirectLine}`);
  });

  return {
    label: 'SEO artifact coverage',
    status: errors.length ? 'FAIL' : 'PASS',
    detail: errors.length ? errors.join('; ') : `${manifest.lessons.length} snapshots, sitemap URLs, and redirects covered`,
  };
}

function checkNetlifyToml() {
  const relPath = 'netlify.toml';
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    return { relPath, label: 'Netlify TOML syntax', status: 'FAIL', detail: 'netlify.toml missing' };
  }
  const content = fs.readFileSync(abs, 'utf-8');
  const ok = content.includes('[[redirects]]')
    && content.includes('from = "/lesson/:id"')
    && content.includes('to = "/seo-snapshots/:id.html"')
    && content.includes('status = 200');
  return {
    relPath,
    label: 'Netlify TOML syntax',
    status: ok ? 'PASS' : 'FAIL',
    detail: ok ? 'Redirect fallback syntax OK' : 'Expected [[redirects]] block for /lesson/:id',
  };
}

function parseArgs(argv) {
  const args = new Set(argv);
  return {
    json: args.has('--json'),
    noWrite: args.has('--no-write') || args.has('--check'),
  };
}

function buildResults() {
  const results = [];

  REQUIRED_ROOT_FILES.forEach((file) => results.push(checkExists(file.path, file.label)));
  REQUIRED_LESSON_FILES.forEach((file) => results.push(checkJson(file.path, file.label)));
  results.push(checkTemplateContract());

  const lessonsDir = path.join(ROOT, 'lessons');
  if (fs.existsSync(lessonsDir)) {
    const lessonFiles = fs.readdirSync(lessonsDir).filter((f) => /^lesson-\d+\.json$/.test(f)).sort();
    lessonFiles.forEach((file) => {
      const relPath = `lessons/${file}`;
      results.push(checkJson(relPath, `Lesson JSON: ${file}`));
      results.push(checkLessonContract(relPath));
    });
  }

  REQUIRED_SCRIPTS.forEach((file) => results.push(checkExists(file.path, file.label)));

  REQUIRED_LOG_DIRS.forEach((dir) => {
    const abs = path.join(ROOT, dir.path);
    const exists = fs.existsSync(abs) && fs.statSync(abs).isDirectory();
    results.push({ relPath: dir.path, label: dir.label, status: exists ? 'PASS' : 'FAIL', detail: exists ? 'OK' : 'Directory not found' });
  });

  results.push(checkManifestIntegrity());
  results.push(checkSeoArtifacts());
  results.push(checkNetlifyToml());

  return results;
}

function summarizeResults(results) {
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const total = results.length;

  return {
    ok: failed === 0,
    passed,
    failed,
    total,
  };
}

function buildReport(results, summary, timestamp) {
  let md = `# Validation Report\n\n`;
  md += `**Generated:** ${timestamp}\n`;
  md += `**Project:** SV2 Science Lessons\n`;
  md += `**Result:** ${summary.passed}/${summary.total} passed, ${summary.failed} failed\n\n`;

  md += `## Summary\n\n`;
  md += `| Status | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| PASS | ${summary.passed} |\n`;
  md += `| FAIL | ${summary.failed} |\n`;
  md += `| **Total** | **${summary.total}** |\n\n`;

  md += `## Details\n\n`;
  md += `| Check | Status | Detail |\n`;
  md += `|-------|--------|--------|\n`;
  results.forEach((r) => {
    md += `| ${cleanDetail(r.label)} | ${r.status} | ${cleanDetail(r.detail)} |\n`;
  });

  return md;
}

function writeReport(md, timestamp) {
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const stamp = timestamp.replace(/[:.]/g, '-');
  const reportName = `validation-report-${stamp}.md`;
  const reportPath = path.join(LOG_DIR, reportName);

  fs.writeFileSync(reportPath, md, 'utf8');
  fs.writeFileSync(path.join(LOG_DIR, 'LATEST.md'), md, 'utf8');

  return path.relative(ROOT, reportPath);
}

function printHuman(summary, results, reportPath) {
  if (reportPath) {
    console.log(`✓ Validation report written: ${reportPath}`);
  } else {
    console.log('Validation report not written (--no-write).');
  }
  console.log(`  Passed: ${summary.passed}/${summary.total}`);

  if (summary.failed > 0) {
    console.log(`  Failed: ${summary.failed}`);
    results.filter((r) => r.status === 'FAIL').forEach((r) => {
      console.log(`    ✗ ${r.label}: ${r.detail}`);
    });
    return;
  }

  console.log('  All checks passed.');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const timestamp = new Date().toISOString();
  const results = buildResults();
  const summary = summarizeResults(results);
  const md = buildReport(results, summary, timestamp);
  const reportPath = args.noWrite ? null : writeReport(md, timestamp);

  if (args.json) {
    console.log(JSON.stringify({
      ok: summary.ok,
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      report: reportPath,
      results,
    }, null, 2));
  } else {
    printHuman(summary, results, reportPath);
  }

  if (!summary.ok) {
    process.exit(1);
  }
}

main();
