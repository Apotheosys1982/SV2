#!/usr/bin/env node

/**
 * generate_seo.js
 *
 * Generates the SEO snapshot layer for SV2 Science Lessons.
 *
 * Outputs:
 *   - seo-snapshots/lesson-XX.html  (one static snapshot per lesson)
 *   - sitemap.xml
 *   - robots.txt
 *   - _redirects                    (Netlify redirects — always regenerated)
 *   - netlify.toml                  (only if it does not already exist)
 *   - SEO_GENERATION_REPORT.md
 *
 * Usage:
 *   node scripts/generate_seo.js
 *
 * The script is idempotent — safe to re-run after any lesson edit.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'https://ariya-science.netlify.app';
const SNAPSHOTS_DIR = path.join(ROOT, 'seo-snapshots');
const MANIFEST_FILE = path.join(ROOT, 'lessons', 'manifest.json');
const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');
const ROBOTS_FILE = path.join(ROOT, 'robots.txt');
const NETLIFY_FILE = path.join(ROOT, 'netlify.toml');
const REDIRECTS_FILE = path.join(ROOT, '_redirects');
const REPORT_FILE = path.join(ROOT, 'SEO_GENERATION_REPORT.md');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function truncate(str, maxLen) {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1).replace(/\s+\S*$/, '') + '…';
}

function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractKickerField(kicker, pattern) {
  if (!Array.isArray(kicker)) return '';
  const match = kicker.find((k) => pattern.test(k));
  return match ? match : '';
}

function kickerToEducationalLevel(kicker) {
  const raw = extractKickerField(kicker, /Grades?\s*\d/i);
  if (!raw) return 'Elementary';
  const m = raw.match(/Grades?\s*(\d+)\s*[–-]\s*(\d+)/i);
  if (m) return `Grade ${m[1]}–${m[2]}`;
  const s = raw.match(/Grades?\s*(\d+)/i);
  if (s) return `Grade ${s[1]}`;
  return raw;
}

function kickerToTimeRequired(kicker) {
  const raw = extractKickerField(kicker, /\d+\s*–\s*\d+\s*min/i);
  if (!raw) return '';
  const m = raw.match(/(\d+)\s*–\s*(\d+)\s*min/i);
  if (m) {
    const avg = Math.round((parseInt(m[1], 10) + parseInt(m[2], 10)) / 2);
    return `PT${avg}M`;
  }
  return '';
}

// ─── Snapshot Template ───────────────────────────────────────────────────────

function buildSnapshot(lesson, canonicalUrl) {
  const meta = lesson.meta || {};
  const hero = lesson.hero || {};
  const heroCopy = lesson.heroCopy || {};
  const sections = Array.isArray(lesson.sections) ? lesson.sections : [];
  const kicker = meta.kicker || [];

  const title = (meta.title ? meta.title + ' — ' : '') + 'BioSphere Kids';
  const description = truncate(heroCopy.whatStudentsLearn || heroCopy.lede || '', 160);
  const ogDescription = heroCopy.lede || heroCopy.whatStudentsLearn || '';
  const ogImage = hero.screenImage || '';
  const imageAlt = hero.ariaLabel || meta.title || 'Lesson image';

  const educationalLevel = kickerToEducationalLevel(kicker);
  const timeRequired = kickerToTimeRequired(kicker);
  const vocabTerms = Array.isArray(heroCopy.keyVocabulary)
    ? heroCopy.keyVocabulary
    : [];
  const learningTargets = Array.isArray(heroCopy.learningTargets)
    ? heroCopy.learningTargets
    : [];
  const studentDirections = Array.isArray(heroCopy.studentDirections)
    ? heroCopy.studentDirections
    : [];

  // Build JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': ['Article', 'LearningResource'],
    name: meta.title || '',
    description: heroCopy.whatStudentsLearn || '',
    url: canonicalUrl,
    image: ogImage,
    author: {
      '@type': 'Organization',
      name: 'BioSphere Kids',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'BioSphere Kids',
    },
    educationalLevel: educationalLevel,
    timeRequired: timeRequired || undefined,
    about: vocabTerms.map((v) => ({
      '@type': 'DefinedTerm',
      name: v.term || '',
    })),
    learningResourceType: 'Lesson plan',
    inLanguage: 'en',
    isAccessibleForFree: true,
  };

  // Remove undefined fields from JSON-LD
  Object.keys(jsonLd).forEach((key) => {
    if (jsonLd[key] === undefined) delete jsonLd[key];
  });

  // Build visible lesson content as HTML
  let contentHtml = '';

  // Hero / intro
  contentHtml += `<header class="seo-hero">\n`;
  contentHtml += `  <h1>${escapeHtml(meta.title || '')}</h1>\n`;
  if (meta.subtitle) {
    contentHtml += `  <p class="seo-subtitle">${escapeHtml(meta.subtitle)}</p>\n`;
  }
  if (ogImage) {
    contentHtml += `  <img class="seo-hero-img" src="${escapeHtml(ogImage)}" alt="${escapeHtml(imageAlt)}" />\n`;
  }
  contentHtml += `</header>\n\n`;

  // Lede
  if (heroCopy.lede) {
    contentHtml += `<section class="seo-intro">\n`;
    contentHtml += `  <p class="seo-lede">${escapeHtml(heroCopy.lede)}</p>\n`;
    contentHtml += `</section>\n\n`;
  }

  // What students learn
  if (heroCopy.whatStudentsLearn) {
    contentHtml += `<section class="seo-learn">\n`;
    contentHtml += `  <h2>What Students Will Learn</h2>\n`;
    contentHtml += `  <p>${escapeHtml(heroCopy.whatStudentsLearn)}</p>\n`;
    contentHtml += `</section>\n\n`;
  }

  // Learning targets
  if (learningTargets.length > 0) {
    contentHtml += `<section class="seo-targets">\n`;
    contentHtml += `  <h2>Learning Targets</h2>\n`;
    contentHtml += `  <ul>\n`;
    learningTargets.forEach((t) => {
      contentHtml += `    <li>${escapeHtml(t)}</li>\n`;
    });
    contentHtml += `  </ul>\n`;
    contentHtml += `</section>\n\n`;
  }

  // Student directions
  if (studentDirections.length > 0) {
    contentHtml += `<section class="seo-directions">\n`;
    contentHtml += `  <h2>Student Directions</h2>\n`;
    contentHtml += `  <ul>\n`;
    studentDirections.forEach((d) => {
      contentHtml += `    <li>${escapeHtml(d)}</li>\n`;
    });
    contentHtml += `  </ul>\n`;
    contentHtml += `</section>\n\n`;
  }

  // Key vocabulary
  if (vocabTerms.length > 0) {
    contentHtml += `<section class="seo-vocab">\n`;
    contentHtml += `  <h2>Key Vocabulary</h2>\n`;
    contentHtml += `  <dl>\n`;
    vocabTerms.forEach((v) => {
      contentHtml += `    <dt>${escapeHtml(v.term || '')}</dt>\n`;
      contentHtml += `    <dd>${escapeHtml(v.def || '')}</dd>\n`;
    });
    contentHtml += `  </dl>\n`;
    contentHtml += `</section>\n\n`;
  }

  // Sections
  sections.forEach((section, idx) => {
    contentHtml += `<section class="seo-section" id="${escapeHtml(section.id || `s${idx + 1}`)}">\n`;
    contentHtml += `  <h2>${escapeHtml(section.chip || `Section ${idx + 1}`)}: ${escapeHtml(section.title || '')}</h2>\n`;

    if (section.lede) {
      contentHtml += `  <p class="seo-section-lede">${escapeHtml(section.lede)}</p>\n`;
    }

    if (section.screenImage) {
      contentHtml += `  <img class="seo-section-img" src="${escapeHtml(section.screenImage)}" alt="${escapeHtml(section.title || `Section ${idx + 1} image`)}" />\n`;
    }

    // Cards
    if (Array.isArray(section.cards) && section.cards.length > 0) {
      contentHtml += `  <div class="seo-cards">\n`;
      section.cards.forEach((card) => {
        contentHtml += `    <div class="seo-card">\n`;
        contentHtml += `      <h3>${escapeHtml(card.title || '')}</h3>\n`;
        if (Array.isArray(card.items) && card.items.length > 0) {
          contentHtml += `      <ul>\n`;
          card.items.forEach((item) => {
            contentHtml += `        <li>${escapeHtml(item)}</li>\n`;
          });
          contentHtml += `      </ul>\n`;
        }
        contentHtml += `    </div>\n`;
      });
      contentHtml += `  </div>\n`;
    }

    // Callout
    if (section.callout) {
      contentHtml += `  <div class="seo-callout">\n`;
      contentHtml += `    <p>${escapeHtml(section.callout)}</p>\n`;
      contentHtml += `  </div>\n`;
    }

    // Prompts. The browser renderer supports prompt plus the section-5
    // promptE/promptF pair, so snapshots must expose the same student work.
    const prompts = [section.prompt, section.promptE, section.promptF].filter(Boolean);
    prompts.forEach((prompt) => {
      contentHtml += `  <div class="seo-prompt">\n`;
      contentHtml += `    <h3>${escapeHtml(prompt.label || 'Writing Prompt')}</h3>\n`;
      if (prompt.hint) {
        contentHtml += `    <p class="seo-hint">${escapeHtml(prompt.hint)}</p>\n`;
      }
      if (prompt.placeholder) {
        contentHtml += `    <p class="seo-placeholder">${escapeHtml(prompt.placeholder)}</p>\n`;
      }
      contentHtml += `  </div>\n`;
    });

    contentHtml += `</section>\n\n`;
  });

  // Assemble full HTML page
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />

  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="BioSphere Kids" />
  <meta property="og:title" content="${escapeHtml(meta.title || '')}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(meta.title || '')}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />

  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      color: #1a202c;
      background: #ffffff;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 20px 48px;
    }
    a { color: #2b6cb0; }
    .seo-hero { margin-bottom: 32px; }
    .seo-hero h1 { font-size: 2rem; line-height: 1.2; margin-bottom: 8px; color: #1a365d; }
    .seo-subtitle { font-size: 0.95rem; color: #4a5568; margin-bottom: 16px; }
    .seo-hero-img { width: 100%; max-height: 320px; object-fit: cover; border-radius: 12px; margin-top: 12px; }
    .seo-intro { margin-bottom: 24px; }
    .seo-lede { font-size: 1.1rem; color: #2d3748; }
    section { margin-bottom: 28px; }
    h2 { font-size: 1.35rem; color: #2c5282; margin-bottom: 10px; }
    h3 { font-size: 1.05rem; color: #2d3748; margin-bottom: 6px; }
    ul, ol { padding-left: 22px; margin-bottom: 12px; }
    li { margin-bottom: 4px; }
    dl { margin-bottom: 12px; }
    dt { font-weight: 700; color: #2c5282; margin-top: 8px; }
    dd { margin-left: 0; color: #4a5568; }
    .seo-section { border-top: 2px solid #e2e8f0; padding-top: 24px; }
    .seo-section-lede { color: #4a5568; margin-bottom: 12px; }
    .seo-section-img { width: 100%; max-height: 240px; object-fit: cover; border-radius: 8px; margin: 12px 0; }
    .seo-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
    .seo-card { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .seo-card ul { padding-left: 18px; }
    .seo-callout { background: #ebf8ff; border-left: 4px solid #3182ce; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 12px 0; }
    .seo-prompt { background: #f0fff4; border: 1px dashed #68d391; border-radius: 8px; padding: 14px; margin: 16px 0; }
    .seo-hint { font-size: 0.85rem; color: #718096; }
    .seo-placeholder { font-style: italic; color: #a0aec0; margin-top: 6px; }
    .seo-nav { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; }
    .seo-nav a { display: inline-block; padding: 8px 16px; background: #2c5282; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .seo-nav a:hover { background: #1a365d; }
    @media (max-width: 600px) {
      .seo-cards { grid-template-columns: 1fr; }
      .seo-hero h1 { font-size: 1.5rem; }
    }
  </style>
</head>
<body>
  <nav class="seo-nav" aria-label="Back to lessons">
    <a href="${BASE_URL}/">← All Lessons</a>
  </nav>

${contentHtml}

  <nav class="seo-nav" aria-label="Back to lessons">
    <a href="${BASE_URL}/">← All Lessons</a>
  </nav>
</body>
</html>`;
}

// ─── Sitemap ─────────────────────────────────────────────────────────────────

function buildSitemap(lessons) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${BASE_URL}/</loc>`,
    '    <changefreq>weekly</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>',
  ];

  lessons.forEach((l) => {
    const lessonUrl = `${BASE_URL}/lesson/${l.id}`;
    lines.push('  <url>');
    lines.push(`    <loc>${lessonUrl}</loc>`);
    lines.push('    <changefreq>monthly</changefreq>');
    lines.push('    <priority>0.9</priority>');
    lines.push('  </url>');
  });

  lines.push('</urlset>');
  return lines.join('\n') + '\n';
}

// ─── Robots.txt ──────────────────────────────────────────────────────────────

function buildRobots() {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${BASE_URL}/sitemap.xml`,
    '',
  ].join('\n');
}

// ─── netlify.toml ────────────────────────────────────────────────────────────

function buildNetlifyToml() {
  return [
    '# Netlify configuration for SV2 SEO snapshot layer',
    '# Clean lesson URLs: /lesson/lesson-XX → seo-snapshots/lesson-XX.html',
    '',
    '[[redirects]]',
    '  from = "/lesson/:id"',
    '  to = "/seo-snapshots/:id.html"',
    '  status = 200',
    '  force = true',
    '',
  ].join('\n');
}

// ─── _redirects ──────────────────────────────────────────────────────────────

function buildRedirects(lessons) {
  const lines = [
    '# Netlify redirects — SV2 SEO snapshot layer',
    '# Clean lesson URLs → static snapshot files (served at same URL, status 200)',
    '# These are explicit rules for maximum compatibility.',
    '',
  ];
  lessons.forEach((l) => {
    lines.push(`/lesson/${l.id} /seo-snapshots/${l.id}.html 200`);
  });
  lines.push('');
  return lines.join('\n');
}

// ─── Check Mode ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = new Set(argv);
  return {
    check: args.has('--check'),
    json: args.has('--json'),
  };
}

function compareGeneratedFile(relPath, expected) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    return { file: relPath, status: 'FAIL', detail: 'File is missing' };
  }

  const actual = fs.readFileSync(abs, 'utf-8');
  if (actual !== expected) {
    return { file: relPath, status: 'FAIL', detail: 'File is out of date; run node scripts/generate_seo.js' };
  }

  return { file: relPath, status: 'PASS', detail: 'Generated artifact is current' };
}

function summarizeCheck(results) {
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  return {
    ok: failed === 0,
    passed,
    failed,
    total: results.length,
  };
}

function runCheckMode(args) {
  const results = [];
  let manifest;

  try {
    manifest = readJson(MANIFEST_FILE);
  } catch (err) {
    results.push({ file: 'lessons/manifest.json', status: 'FAIL', detail: err.message });
    const summary = summarizeCheck(results);
    if (args.json) {
      console.log(JSON.stringify({ ok: summary.ok, summary, results }, null, 2));
    } else {
      console.log('SEO check failed: cannot read lessons/manifest.json.');
    }
    process.exit(1);
  }

  const lessons = manifest.lessons || [];

  lessons.forEach((entry) => {
    const lessonPath = path.join(ROOT, entry.file);
    let lesson;
    try {
      lesson = readJson(lessonPath);
    } catch (err) {
      results.push({ file: entry.file, status: 'FAIL', detail: err.message });
      return;
    }

    const expected = buildSnapshot(lesson, `${BASE_URL}/lesson/${entry.id}`);
    results.push(compareGeneratedFile(`seo-snapshots/${entry.id}.html`, expected));
  });

  results.push(compareGeneratedFile('sitemap.xml', buildSitemap(lessons)));
  results.push(compareGeneratedFile('robots.txt', buildRobots()));
  results.push(compareGeneratedFile('_redirects', buildRedirects(lessons)));

  if (fs.existsSync(NETLIFY_FILE)) {
    results.push({ file: 'netlify.toml', status: 'PASS', detail: 'File exists; syntax is covered by validation' });
  } else {
    results.push(compareGeneratedFile('netlify.toml', buildNetlifyToml()));
  }

  const summary = summarizeCheck(results);

  if (args.json) {
    console.log(JSON.stringify({
      ok: summary.ok,
      summary,
      results,
    }, null, 2));
  } else {
    console.log(`SEO check: ${summary.passed}/${summary.total} current`);
    results.filter((r) => r.status === 'FAIL').forEach((r) => {
      console.log(`  ✗ ${r.file}: ${r.detail}`);
    });
    if (summary.ok) {
      console.log('All generated SEO artifacts are current.');
    }
  }

  if (!summary.ok) {
    process.exit(1);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const timestamp = new Date().toISOString();
  const reportLines = [
    '# SEO Generation Report',
    '',
    `**Generated:** ${timestamp}`,
    `**Base URL:** ${BASE_URL}`,
    '',
  ];

  let allOk = true;

  // 1. Read manifest
  console.log('Reading manifest...');
  let manifest;
  try {
    manifest = readJson(MANIFEST_FILE);
  } catch (err) {
    console.error('FATAL: Cannot read manifest.json:', err.message);
    process.exit(1);
  }

  const lessons = manifest.lessons || [];
  console.log(`  Found ${lessons.length} lessons in manifest.`);

  // 2. Ensure snapshots directory
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  console.log('Snapshots directory ready.');

  // 3. Generate snapshots
  console.log('\nGenerating lesson snapshots...');
  const snapshotResults = [];

  for (const entry of lessons) {
    const lessonPath = path.join(ROOT, entry.file);
    let lesson;
    try {
      lesson = readJson(lessonPath);
    } catch (err) {
      console.error(`  ✗ ${entry.id}: FAILED to read ${entry.file}: ${err.message}`);
      snapshotResults.push({ id: entry.id, status: 'FAIL', error: err.message });
      allOk = false;
      continue;
    }

    const canonicalUrl = `${BASE_URL}/lesson/${entry.id}`;
    const snapshotHtml = buildSnapshot(lesson, canonicalUrl);
    const snapshotFile = path.join(SNAPSHOTS_DIR, `${entry.id}.html`);

    try {
      fs.writeFileSync(snapshotFile, snapshotHtml, 'utf-8');
      const sizeKb = (Buffer.byteLength(snapshotHtml, 'utf-8') / 1024).toFixed(1);
      console.log(`  ✓ ${entry.id}: ${entry.file} → seo-snapshots/${entry.id}.html (${sizeKb} KB)`);
      snapshotResults.push({ id: entry.id, status: 'PASS', file: `seo-snapshots/${entry.id}.html`, sizeKb });
    } catch (err) {
      console.error(`  ✗ ${entry.id}: FAILED to write snapshot: ${err.message}`);
      snapshotResults.push({ id: entry.id, status: 'FAIL', error: err.message });
      allOk = false;
    }
  }

  reportLines.push('## Lesson Snapshots');
  reportLines.push('');
  reportLines.push('| Lesson | Status | File | Size |');
  reportLines.push('|--------|--------|------|------|');
  snapshotResults.forEach((r) => {
    const sizeCol = r.sizeKb ? `${r.sizeKb} KB` : (r.error || '');
    const fileCol = r.file || '';
    reportLines.push(`| ${r.id} | ${r.status === 'PASS' ? '✓' : '✗'} ${r.status} | ${fileCol} | ${sizeCol} |`);
  });
  reportLines.push('');

  // 4. Generate sitemap
  console.log('\nGenerating sitemap.xml...');
  try {
    const sitemapXml = buildSitemap(lessons);
    fs.writeFileSync(SITEMAP_FILE, sitemapXml, 'utf-8');
    console.log(`  ✓ sitemap.xml (${lessons.length + 1} URLs)`);
    reportLines.push('## Sitemap');
    reportLines.push('');
    reportLines.push(`- **File:** sitemap.xml`);
    reportLines.push(`- **URLs:** ${lessons.length + 1} (root + ${lessons.length} lessons)`);
    reportLines.push('');
  } catch (err) {
    console.error('  ✗ sitemap.xml FAILED:', err.message);
    allOk = false;
    reportLines.push('## Sitemap');
    reportLines.push('');
    reportLines.push(`- **Status:** ✗ FAILED — ${err.message}`);
    reportLines.push('');
  }

  // 5. Generate robots.txt
  console.log('Generating robots.txt...');
  try {
    const robotsTxt = buildRobots();
    fs.writeFileSync(ROBOTS_FILE, robotsTxt, 'utf-8');
    console.log('  ✓ robots.txt');
    reportLines.push('## Robots');
    reportLines.push('');
    reportLines.push('- **File:** robots.txt');
    reportLines.push('- **Status:** ✓ generated');
    reportLines.push('');
  } catch (err) {
    console.error('  ✗ robots.txt FAILED:', err.message);
    allOk = false;
    reportLines.push('## Robots');
    reportLines.push('');
    reportLines.push(`- **Status:** ✗ FAILED — ${err.message}`);
    reportLines.push('');
  }

  // 6. Generate netlify.toml (only if it doesn't exist)
  console.log('Checking netlify.toml...');
  if (fs.existsSync(NETLIFY_FILE)) {
    console.log('  ⊙ netlify.toml already exists — not overwriting.');
    reportLines.push('## Netlify Configuration');
    reportLines.push('');
    reportLines.push('- **File:** netlify.toml');
    reportLines.push('- **Status:** ⊙ already exists (not modified)');
    reportLines.push('');
  } else {
    try {
      const netlifyToml = buildNetlifyToml();
      fs.writeFileSync(NETLIFY_FILE, netlifyToml, 'utf-8');
      console.log('  ✓ netlify.toml created.');
      reportLines.push('## Netlify Configuration');
      reportLines.push('');
      reportLines.push('- **File:** netlify.toml');
      reportLines.push('- **Status:** ✓ created');
      reportLines.push('- **Routing:** `/lesson/:id` → `/seo-snapshots/:id.html` (status 200)');
      reportLines.push('');
    } catch (err) {
      console.error('  ✗ netlify.toml FAILED:', err.message);
      allOk = false;
      reportLines.push('## Netlify Configuration');
      reportLines.push('');
      reportLines.push(`- **Status:** ✗ FAILED — ${err.message}`);
      reportLines.push('');
    }
  }

  // 6b. Generate _redirects (always overwrite — must stay in sync with lessons)
  console.log('Generating _redirects...');
  try {
    const redirectsContent = buildRedirects(lessons);
    fs.writeFileSync(REDIRECTS_FILE, redirectsContent, 'utf-8');
    const ruleCount = lessons.length;
    console.log(`  ✓ _redirects (${ruleCount} explicit lesson rules)`);
    reportLines.push('## Netlify Redirects (_redirects)');
    reportLines.push('');
    reportLines.push('- **File:** _redirects');
    reportLines.push('- **Status:** ✓ generated');
    reportLines.push(`- **Rules:** ${ruleCount} explicit lesson routes`);
    reportLines.push('');
  } catch (err) {
    console.error('  ✗ _redirects FAILED:', err.message);
    allOk = false;
    reportLines.push('## Netlify Redirects (_redirects)');
    reportLines.push('');
    reportLines.push(`- **Status:** ✗ FAILED — ${err.message}`);
    reportLines.push('');
  }

  // 7. Write report
  reportLines.push('## Summary');
  reportLines.push('');
  const passCount = snapshotResults.filter((r) => r.status === 'PASS').length;
  const failCount = snapshotResults.filter((r) => r.status === 'FAIL').length;
  reportLines.push(`- **Snapshots generated:** ${passCount}/${lessons.length}`);
  reportLines.push(`- **Failures:** ${failCount}`);
  reportLines.push(`- **Overall:** ${allOk ? '✓ All systems operational' : '✗ Some components failed — review above'}`);
  reportLines.push('');
  reportLines.push('---');
  reportLines.push('');
  reportLines.push('*Generated by scripts/generate_seo.js*');

  try {
    fs.writeFileSync(REPORT_FILE, reportLines.join('\n'), 'utf-8');
    console.log(`\n✓ Report written to SEO_GENERATION_REPORT.md`);
  } catch (err) {
    console.error('\n✗ Failed to write report:', err.message);
  }

  console.log('\n' + (allOk ? '✓ SEO generation complete.' : '✗ SEO generation completed with errors.'));

  if (!allOk) process.exit(1);
}

const cliArgs = parseArgs(process.argv.slice(2));
if (cliArgs.check) {
  runCheckMode(cliArgs);
} else {
  main();
}
