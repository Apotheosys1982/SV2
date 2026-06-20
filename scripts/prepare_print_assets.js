#!/usr/bin/env node

/**
 * prepare_print_assets.js
 *
 * Prepares the print-asset conversion workflow for one lesson or all lessons.
 *
 * This script does not call an AI image generator directly. Agent-native image
 * generators such as Codex imagegen live outside this static repository. The
 * script does the repo-native part of the workflow:
 *
 *   1. Reads lesson JSON screenImage -> printImage mappings.
 *   2. Downloads/caches the screen source images under assets/source-images/.
 *   3. Writes an image-agent work order with exact source and target paths.
 *   4. Writes PRINT_ASSET_GENERATION_REPORT.md.
 *
 * An image-capable coding agent then edits each cached source image into a
 * black-and-white coloring-page worksheet asset and saves it to the printImage
 * target path already referenced by the lesson JSON.
 *
 * Usage:
 *   node scripts/prepare_print_assets.js --lesson lesson-04
 *   node scripts/prepare_print_assets.js --lessons geography-01,geography-02,history-01
 *   node scripts/prepare_print_assets.js --all
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'lessons');
const SOURCE_ROOT = path.join(ROOT, 'assets', 'source-images');
const WORK_ORDER_DIR = path.join(ROOT, 'print-asset-work-orders');
const REPORT_FILE = path.join(ROOT, 'PRINT_ASSET_GENERATION_REPORT.md');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith('--')) {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key.slice(2)] = next;
        i++;
      } else {
        args[key.slice(2)] = true;
      }
    }
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function extensionFromUrl(url) {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return '.png';
  if (clean.endsWith('.webp')) return '.webp';
  if (clean.endsWith('.jpeg')) return '.jpg';
  if (clean.endsWith('.jpg')) return '.jpg';
  return '.jpg';
}

function requestUrl(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error('Too many redirects'));
      return;
    }

    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (SV2 print asset pipeline)',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://ariya-science.netlify.app/',
      },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        requestUrl(next, redirects + 1).then(resolve, reject);
        return;
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timed out'));
    });
  });
}

async function cacheSourceImage(lessonId, slot, url) {
  const lessonSourceDir = path.join(SOURCE_ROOT, lessonId);
  ensureDir(lessonSourceDir);

  const ext = extensionFromUrl(url);
  const relSource = `assets/source-images/${lessonId}/${slot}${ext}`;
  const absSource = path.join(ROOT, relSource);

  if (!/^https?:\/\//i.test(url)) {
    const abs = path.join(ROOT, url);
    if (!fs.existsSync(abs)) throw new Error(`Local source not found: ${url}`);
    fs.copyFileSync(abs, absSource);
    return { relSource, bytes: fs.statSync(absSource).size, cached: true };
  }

  const data = await requestUrl(url);
  fs.writeFileSync(absSource, data);
  return { relSource, bytes: data.length, cached: true };
}

function lessonMappings(lesson) {
  const mappings = [];
  mappings.push({
    slot: 'hero',
    title: `${lesson.meta.title} hero`,
    screenImage: lesson.hero && lesson.hero.screenImage,
    printImage: lesson.hero && lesson.hero.printImage,
  });

  (lesson.sections || []).forEach((section) => {
    mappings.push({
      slot: section.id,
      title: section.title || section.id,
      screenImage: section.screenImage,
      printImage: section.printImage,
    });
  });

  return mappings;
}

function workOrderForLesson(lesson, rows) {
  const lessonId = lesson.id;
  const lines = [];

  lines.push(`# Print Asset Work Order — ${lessonId}`);
  lines.push('');
  lines.push(`**Lesson:** ${lesson.meta.title}`);
  lines.push(`**Purpose:** Convert the actual screen images used by this lesson into black-and-white coloring-page worksheet assets.`);
  lines.push('');
  lines.push('## Operator Rule');
  lines.push('');
  lines.push('- Use each cached source image as the reference image.');
  lines.push('- Preserve the main subject, framing, and educational meaning of the source image.');
  lines.push('- Convert to black-and-white coloring-page line art suitable for elementary worksheets.');
  lines.push('- Use clean outlines, large simple shapes, white background, and minimal interior detail.');
  lines.push('- Do not add labels, captions, watermarks, logos, or decorative borders.');
  lines.push('- Do not invent unrelated objects.');
  lines.push('- Save the final PNG exactly to the target `printImage` path.');
  lines.push('- Final target size should be 1024 x 683 PNG unless the lesson explicitly requires another ratio.');
  lines.push('');
  lines.push('## Image Generator Prompt Template');
  lines.push('');
  lines.push('```text');
  lines.push('Use case: elementary educational lesson');
  lines.push('Asset type: black-and-white printable worksheet image');
  lines.push('Primary request: Convert the provided source image into a clean black-and-white coloring-page version for a Grades 2-4 printable worksheet.');
  lines.push('Input image role: reference/edit target; preserve subject and composition.');
  lines.push('Style: crisp outline drawing, white background, no grayscale fill, no shadows, no text, no watermark, no decorative frame.');
  lines.push('Output: 1024 x 683 PNG, high contrast, print-safe, kid-friendly, clear enough for a worksheet.');
  lines.push('```');
  lines.push('');
  lines.push('## Required Assets');
  lines.push('');
  lines.push('| Slot | Topic | Source Image | Target Print Asset | Status |');
  lines.push('|---|---|---|---|---|');
  rows.forEach((row) => {
    const source = row.relSource ? `\`${row.relSource}\`` : `SOURCE FETCH FAILED: ${row.error}`;
    const status = row.relSource ? 'ready for imagegen conversion' : 'fix screenImage URL first';
    lines.push(`| ${row.slot} | ${row.title} | ${source} | \`${row.printImage}\` | ${status} |`);
  });
  lines.push('');
  lines.push('## Acceptance Check');
  lines.push('');
  lines.push('After conversion, run:');
  lines.push('');
  lines.push('```bash');
  lines.push('node scripts/generate_seo.js');
  lines.push('node scripts/validate_project.js');
  lines.push('```');
  lines.push('');
  lines.push('Validation must pass and every `printImage` target must exist on disk.');

  return lines.join('\n') + '\n';
}

async function prepareLesson(lessonId) {
  const lessonPath = path.join(LESSONS_DIR, `${lessonId}.json`);
  if (!fs.existsSync(lessonPath)) {
    throw new Error(`Lesson not found: ${lessonId}`);
  }

  const lesson = readJson(lessonPath);
  const rows = [];

  for (const mapping of lessonMappings(lesson)) {
    const row = { ...mapping };
    try {
      if (!mapping.screenImage) throw new Error('Missing screenImage');
      if (!mapping.printImage) throw new Error('Missing printImage');
      const cached = await cacheSourceImage(lesson.id, mapping.slot, mapping.screenImage);
      row.relSource = cached.relSource;
      row.bytes = cached.bytes;
    } catch (err) {
      row.error = err.message;
    }
    rows.push(row);
  }

  ensureDir(WORK_ORDER_DIR);
  const workOrderPath = path.join(WORK_ORDER_DIR, `${lesson.id}.md`);
  fs.writeFileSync(workOrderPath, workOrderForLesson(lesson, rows), 'utf-8');

  return {
    lessonId: lesson.id,
    title: lesson.meta.title,
    workOrder: path.relative(ROOT, workOrderPath).replace(/\\/g, '/'),
    rows,
  };
}

function discoverLessonIds() {
  return fs.readdirSync(LESSONS_DIR)
    .filter((file) => /^[a-z][a-z0-9-]*-\d+\.json$/.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => file.replace('.json', ''));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let lessonIds = [];

  if (args.all) {
    lessonIds = discoverLessonIds();
  } else if (args.lessons) {
    lessonIds = String(args.lessons)
      .split(',')
      .map((lessonId) => lessonId.trim())
      .filter(Boolean);
  } else if (args.lesson) {
    lessonIds = [args.lesson];
  } else {
    console.error('Usage: node scripts/prepare_print_assets.js --lesson lesson-04');
    console.error('   or: node scripts/prepare_print_assets.js --lessons lesson-04,lesson-05');
    console.error('   or: node scripts/prepare_print_assets.js --all');
    process.exit(1);
  }

  const results = [];
  for (const lessonId of lessonIds) {
    console.log(`Preparing print asset workflow for ${lessonId}...`);
    const result = await prepareLesson(lessonId);
    results.push(result);
    const ok = result.rows.filter((row) => row.relSource).length;
    const failed = result.rows.length - ok;
    console.log(`  cached: ${ok}/${result.rows.length}; failed: ${failed}; work order: ${result.workOrder}`);
  }

  const timestamp = new Date().toISOString();
  const lines = [];
  lines.push('# Print Asset Generation Report');
  lines.push('');
  lines.push(`**Generated:** ${timestamp}`);
  lines.push('');
  lines.push('This report prepares the image-generator handoff for turning lesson screen images into black-and-white coloring-page print assets.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Lesson | Title | Cached Sources | Failed Sources | Work Order |');
  lines.push('|---|---|---:|---:|---|');
  results.forEach((result) => {
    const ok = result.rows.filter((row) => row.relSource).length;
    const failed = result.rows.length - ok;
    lines.push(`| ${result.lessonId} | ${result.title} | ${ok}/${result.rows.length} | ${failed} | \`${result.workOrder}\` |`);
  });
  lines.push('');
  lines.push('## Source-To-Target Map');
  lines.push('');
  results.forEach((result) => {
    lines.push(`### ${result.lessonId} — ${result.title}`);
    lines.push('');
    lines.push('| Slot | Source | Target | Status |');
    lines.push('|---|---|---|---|');
    result.rows.forEach((row) => {
      const source = row.relSource ? `\`${row.relSource}\`` : row.screenImage;
      const status = row.relSource ? 'cached' : `FAILED: ${row.error}`;
      lines.push(`| ${row.slot} | ${source} | \`${row.printImage}\` | ${status} |`);
    });
    lines.push('');
  });

  fs.writeFileSync(REPORT_FILE, lines.join('\n'), 'utf-8');
  console.log(`Report written: ${path.relative(ROOT, REPORT_FILE)}`);

  const failed = results.flatMap((result) => result.rows).filter((row) => !row.relSource);
  if (failed.length > 0) {
    console.log(`\n${failed.length} source image(s) failed to cache. Fix those screenImage URLs before final print-asset conversion.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
