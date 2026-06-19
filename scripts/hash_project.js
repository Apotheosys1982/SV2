#!/usr/bin/env node

/**
 * hash_project.js
 *
 * Generates SHA-256 hashes for important SV2 project files and writes a
 * timestamped report to logs/hashes/.
 *
 * Included:
 *   - index.html
 *   - lessons/*.json (including manifest.json and lesson_template.json)
 *   - scripts/*.js
 *   - project markdown documents (*.md) at repo root
 *   - assets/ image files, source caches, image-candidate reports, and print work orders
 *
 * Excluded:
 *   - logs/
 *   - scripts/.env
 *   - node_modules/
 *   - hidden files (.DS_Store, .git, etc.)
 *   - temporary/scratch files
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const LOG_DIR = path.join(ROOT, 'logs', 'hashes');

const EXCLUDE_DIRS = new Set(['logs', 'node_modules', '.git', '.vscode']);
const EXCLUDE_FILES = new Set(['.env', '.DS_Store']);
const EXCLUDE_PREFIXES = ['.'];

function shouldExcludeDir(name) {
  return EXCLUDE_DIRS.has(name) || EXCLUDE_PREFIXES.some((p) => name.startsWith(p));
}

function shouldExcludeFile(name) {
  if (EXCLUDE_FILES.has(name)) return true;
  if (EXCLUDE_PREFIXES.some((p) => name.startsWith(p))) return true;
  return false;
}

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function collectFiles(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!shouldExcludeDir(entry.name)) {
        collectFiles(path.join(dir, entry.name), results);
      }
      continue;
    }
    if (entry.isFile() && !shouldExcludeFile(entry.name)) {
      results.push(path.join(dir, entry.name));
    }
  }

  return results;
}

function categorize(relPath) {
  if (relPath === 'index.html') return 'Application';
  if (relPath.startsWith('lessons/')) return 'Lessons';
  if (relPath.startsWith('scripts/')) return 'Scripts';
  if (relPath.startsWith('assets/')) return 'Assets';
  if (relPath.endsWith('.md')) return 'Documentation';
  return 'Other';
}

function main() {
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const allFiles = collectFiles(ROOT).sort();

  const rows = [];
  for (const abs of allFiles) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    const hash = hashFile(abs);
    const size = fs.statSync(abs).size;
    rows.push({ rel, hash, size, category: categorize(rel) });
  }

  const timestamp = new Date().toISOString();
  const stamp = timestamp.replace(/[:.]/g, '-');
  const reportName = `hash-report-${stamp}.md`;
  const reportPath = path.join(LOG_DIR, reportName);

  const byCategory = {};
  for (const r of rows) {
    if (!byCategory[r.category]) byCategory[r.category] = [];
    byCategory[r.category].push(r);
  }

  let md = `# Hash Report\n\n`;
  md += `**Generated:** ${timestamp}\n`;
  md += `**Project:** SV2 Science Lessons\n`;
  md += `**Files hashed:** ${rows.length}\n\n`;

  const categoryOrder = ['Application', 'Lessons', 'Scripts', 'Assets', 'Documentation', 'Other'];
  for (const cat of categoryOrder) {
    const items = byCategory[cat];
    if (!items) continue;
    md += `## ${cat} (${items.length} files)\n\n`;
    md += `| File | Size | SHA-256 |\n`;
    md += `|------|------|----------|\n`;
    for (const item of items) {
      md += `| \`${item.rel}\` | ${item.size} B | \`${item.hash}\` |\n`;
    }
    md += '\n';
  }

  md += `## Exclusions\n\n`;
  md += `- Directories: ${[...EXCLUDE_DIRS].map((d) => `\`${d}\``).join(', ')}\n`;
  md += `- Files: ${[...EXCLUDE_FILES].map((f) => `\`${f}\``).join(', ')}\n`;
  md += `- Hidden files (dot-prefixed) are excluded.\n`;

  fs.writeFileSync(reportPath, md, 'utf8');

  console.log(`✓ Hash report written: ${path.relative(ROOT, reportPath)}`);
  console.log(`  Files hashed: ${rows.length}`);
  console.log(`  Timestamp: ${timestamp}`);

  // Also write a latest symlink-style reference (plain file for portability)
  const latestPath = path.join(LOG_DIR, 'LATEST.md');
  fs.writeFileSync(latestPath, md, 'utf8');
  console.log(`  Latest reference: ${path.relative(ROOT, latestPath)}`);
}

main();
