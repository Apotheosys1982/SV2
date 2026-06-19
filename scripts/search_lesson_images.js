#!/usr/bin/env node

/**
 * search_lesson_images.js
 *
 * Production image-candidate search for SV2 lesson creation.
 *
 * This optional agent-run helper queries the configured Pexels and Pixabay APIs
 * for each lesson image slot, writes candidate reports, and gives the coding
 * agent a stable selection surface. It is not called by create_lesson.js.
 *
 * It does not choose images automatically and it does not create print assets.
 * The agent running the workflow must review candidates, update lesson JSON
 * screenImage fields, cache selected sources with prepare_print_assets.js, then
 * use its native image generator (Codex imagegen preferred) to create
 * black-and-white coloring-page print assets at the lesson printImage paths.
 *
 * Usage:
 *   node scripts/search_lesson_images.js --lesson lesson-04
 *   node scripts/search_lesson_images.js --lesson lesson-07 --limit 8
 *
 * Env:
 *   scripts/.env with PEXELS_API_KEY and/or PIXABAY_API_KEY
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'lessons');
const OUT_DIR = path.join(ROOT, 'image-candidates');
const ENV_FILE = path.join(__dirname, '.env');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key.slice(2)] = next;
      i++;
    } else {
      args[key.slice(2)] = true;
    }
  }
  return args;
}

function loadEnv() {
  const env = {};
  if (!fs.existsSync(ENV_FILE)) return env;

  const content = fs.readFileSync(ENV_FILE, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && value) env[key] = value;
  });
  return env;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function httpsJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 140)}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Failed to parse JSON: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
}

function probeUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (SV2 image candidate probe)',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    }, (res) => {
      const contentType = res.headers['content-type'] || '';
      const ok = res.statusCode >= 200 && res.statusCode < 300 && contentType.startsWith('image/');
      res.resume();
      resolve({ ok, status: res.statusCode, contentType });
    });
    req.on('error', (err) => resolve({ ok: false, status: 'ERROR', contentType: '', error: err.message }));
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ ok: false, status: 'TIMEOUT', contentType: '', error: 'timeout' });
    });
  });
}

function lessonSlots(lesson) {
  const slots = [{
    slot: 'hero',
    topic: lesson.meta.title,
    query: lesson.hero.imageQuery || lesson.meta.title,
    currentScreenImage: lesson.hero.screenImage,
    targetPrintImage: lesson.hero.printImage,
  }];

  (lesson.sections || []).forEach((section) => {
    slots.push({
      slot: section.id,
      topic: section.title,
      query: section.imageQuery || section.title || lesson.meta.title,
      currentScreenImage: section.screenImage,
      targetPrintImage: section.printImage,
    });
  });

  return slots;
}

async function searchPexels(query, apiKey, limit) {
  if (!apiKey) return [];
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limit}&orientation=landscape`;
  const response = await httpsJson(url, { Authorization: apiKey });
  return (response.photos || []).map((photo, idx) => {
    const base = photo.src.large2x || photo.src.large || photo.src.original;
    const screenImage = base.includes('?') ? base : `${base}?auto=compress&cs=tinysrgb&w=1600`;
    return {
      id: `pexels-${photo.id}`,
      provider: 'Pexels',
      rank: idx + 1,
      query,
      screenImage,
      previewUrl: photo.src.medium,
      sourcePageUrl: photo.url,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      width: photo.width,
      height: photo.height,
      altText: photo.alt || '',
    };
  });
}

async function searchPixabay(query, apiKey, limit) {
  if (!apiKey) return [];
  const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=${limit}&image_type=photo&orientation=horizontal&safesearch=true`;
  const response = await httpsJson(url);
  return (response.hits || []).map((hit, idx) => ({
    id: `pixabay-${hit.id}`,
    provider: 'Pixabay',
    rank: idx + 1,
    query,
    screenImage: hit.largeImageURL || hit.webformatURL,
    previewUrl: hit.previewURL || hit.webformatURL,
    sourcePageUrl: hit.pageURL,
    photographer: hit.user,
    photographerUrl: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
    width: hit.imageWidth,
    height: hit.imageHeight,
    altText: hit.tags || '',
  }));
}

function recommendedProvider(candidate) {
  if (!candidate.probe || !candidate.probe.ok) return 'reject - URL probe failed';
  if (candidate.provider === 'Pexels') return 'preferred';
  return 'fallback - use only when Pexels is weaker';
}

function markdownReport(lesson, slots, generatedAt) {
  const lines = [];
  lines.push(`# Image Candidate Report — ${lesson.id}`);
  lines.push('');
  lines.push(`**Lesson:** ${lesson.meta.title}`);
  lines.push(`**Generated:** ${generatedAt}`);
  lines.push('');
  lines.push('## Production Rule');
  lines.push('');
  lines.push('Use this report during lesson creation. Do not hand-paste random image URLs. Pick a candidate from the API results, update the lesson `screenImage`, cache the selected source with `prepare_print_assets.js`, then have the agent generate the matching black-and-white coloring-page `printImage` asset.');
  lines.push('');
  lines.push('Preferred order: Pexels first, Pixabay as fallback when it has the better educational image and the direct URL probe passes.');
  lines.push('');
  lines.push('## Agent Workflow');
  lines.push('');
  lines.push('1. Review candidates for each slot.');
  lines.push('2. Select one screen image per slot.');
  lines.push('3. Update the lesson JSON `screenImage` fields.');
  lines.push('4. Run `node scripts/prepare_print_assets.js --lesson ' + lesson.id + '` to cache sources and refresh the imagegen work order.');
  lines.push('5. Use the agent native image generator to convert each cached source into black-and-white coloring-page art.');
  lines.push('6. Save each generated PNG exactly to the matching `printImage` path.');
  lines.push('7. Run `node scripts/generate_seo.js`, `node scripts/validate_project.js`, and checkpoint.');
  lines.push('');

  slots.forEach((slot) => {
    lines.push(`## ${slot.slot} — ${slot.topic}`);
    lines.push('');
    lines.push(`**Current screen image:** ${slot.currentScreenImage || '_none_'}`);
    lines.push(`**Target print asset:** \`${slot.targetPrintImage || '_missing_'}\``);
    lines.push(`**Query:** \`${slot.query}\``);
    lines.push('');
    lines.push('| Candidate | Provider | Recommendation | Screen URL | Preview | Source | Credit |');
    lines.push('|---|---|---|---|---|---|---|');
    slot.candidates.forEach((candidate) => {
      const rec = recommendedProvider(candidate);
      lines.push(`| ${candidate.id} | ${candidate.provider} | ${rec} | [image](${candidate.screenImage}) | [preview](${candidate.previewUrl}) | [source](${candidate.sourcePageUrl}) | ${candidate.photographer || ''} |`);
    });
    lines.push('');
  });

  return lines.join('\n') + '\n';
}

function selectionTemplate(lesson, slots) {
  return {
    lessonId: lesson.id,
    generatedAt: new Date().toISOString(),
    instructions: [
      'Fill selectedCandidateId for each slot after human/agent review.',
      'Update lesson JSON screenImage fields from selected candidates.',
      'Run prepare_print_assets.js, then use Codex native image generation to create coloring-page PNGs at targetPrintImage paths.',
      'Do not commit API keys or .env content.',
    ],
    selections: slots.map((slot) => ({
      slot: slot.slot,
      topic: slot.topic,
      query: slot.query,
      selectedCandidateId: '',
      selectedScreenImage: '',
      targetPrintImage: slot.targetPrintImage,
    })),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const lessonId = args.lesson;
  const limit = Number(args.limit || 6);

  if (!lessonId) {
    console.error('Usage: node scripts/search_lesson_images.js --lesson lesson-04 [--limit 6]');
    process.exit(1);
  }

  const lessonPath = path.join(LESSONS_DIR, `${lessonId}.json`);
  if (!fs.existsSync(lessonPath)) {
    console.error(`Lesson not found: ${lessonId}`);
    process.exit(1);
  }

  const env = loadEnv();
  const hasPexels = Boolean(env.PEXELS_API_KEY);
  const hasPixabay = Boolean(env.PIXABAY_API_KEY);
  if (!hasPexels && !hasPixabay) {
    console.error('No image provider API keys available. Expected scripts/.env with PEXELS_API_KEY and/or PIXABAY_API_KEY.');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const lesson = readJson(lessonPath);
  const slots = lessonSlots(lesson);

  for (const slot of slots) {
    console.log(`Searching ${slot.slot}: ${slot.query}`);
    let candidates = [];
    try {
      candidates = candidates.concat(await searchPexels(slot.query, env.PEXELS_API_KEY, limit));
    } catch (err) {
      console.warn(`  Pexels failed: ${err.message}`);
    }
    try {
      candidates = candidates.concat(await searchPixabay(slot.query, env.PIXABAY_API_KEY, limit));
    } catch (err) {
      console.warn(`  Pixabay failed: ${err.message}`);
    }

    for (const candidate of candidates) {
      candidate.probe = await probeUrl(candidate.screenImage);
    }

    slot.candidates = candidates;
    const ok = candidates.filter((candidate) => candidate.probe && candidate.probe.ok).length;
    console.log(`  candidates: ${candidates.length}; URL probe passed: ${ok}`);
  }

  const generatedAt = new Date().toISOString();
  const payload = {
    lessonId: lesson.id,
    lessonTitle: lesson.meta.title,
    generatedAt,
    slots,
  };

  const jsonPath = path.join(OUT_DIR, `${lesson.id}.json`);
  const mdPath = path.join(OUT_DIR, `${lesson.id}.md`);
  const selectionPath = path.join(OUT_DIR, `${lesson.id}.selection.template.json`);

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(mdPath, markdownReport(lesson, slots, generatedAt), 'utf8');
  fs.writeFileSync(selectionPath, JSON.stringify(selectionTemplate(lesson, slots), null, 2), 'utf8');

  console.log(`Report written: ${path.relative(ROOT, mdPath)}`);
  console.log(`JSON written: ${path.relative(ROOT, jsonPath)}`);
  console.log(`Selection template written: ${path.relative(ROOT, selectionPath)}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
