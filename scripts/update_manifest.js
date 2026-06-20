#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LESSONS_DIR = path.join(__dirname, '..', 'lessons');
const MANIFEST_FILE = path.join(LESSONS_DIR, 'manifest.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function subjectFromLessonId(lessonId) {
  if (/^lesson-\d+$/.test(lessonId)) return 'science';
  const match = lessonId.match(/^([a-z][a-z0-9-]*)-\d+$/);
  return match ? match[1] : 'science';
}

function lessonNumber(lessonId) {
  const match = lessonId.match(/(\d+)$/);
  return match ? String(Number(match[1])) : lessonId;
}

// Load current manifest to preserve ordering and subject metadata.
let currentManifest = {
  defaultSubjectId: 'science',
  defaultLessonId: 'lesson-01',
  subjects: [
    { id: 'science', label: 'Science', defaultLessonId: 'lesson-01' },
  ],
  lessons: [],
};

try {
  currentManifest = readJson(MANIFEST_FILE);
} catch (err) {
  console.log('Note: No existing manifest found. Creating a new one.');
}

// Scan lessons directory for subject-aware lesson JSON files.
let lessonFiles = [];
try {
  const files = fs.readdirSync(LESSONS_DIR);
  lessonFiles = files
    .filter((file) => /^[a-z][a-z0-9-]*-\d+\.json$/.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
} catch (err) {
  console.error(`Error scanning lessons directory: ${err.message}`);
  process.exit(1);
}

if (lessonFiles.length === 0) {
  console.error(`Error: No lesson files found in ${LESSONS_DIR}`);
  process.exit(1);
}

const currentManifestMap = {};
(currentManifest.lessons || []).forEach((lesson) => {
  currentManifestMap[lesson.id] = lesson;
});

const subjectIds = new Set((currentManifest.subjects || []).map((subject) => subject.id));
const newLessons = [];

lessonFiles.forEach((file) => {
  const lessonId = file.replace('.json', '');
  const existing = currentManifestMap[lessonId] || {};
  const lessonPath = path.join(LESSONS_DIR, file);
  let lesson = {};

  try {
    lesson = readJson(lessonPath);
  } catch (err) {
    console.warn(`Warning: Could not read ${file}, using manifest/default metadata`);
  }

  const subjectId = existing.subjectId || lesson.subjectId || subjectFromLessonId(lessonId);
  if (subjectId && !subjectIds.has(subjectId)) {
    console.warn(`Warning: ${lessonId} has subjectId "${subjectId}" that is not registered in manifest subjects`);
  }

  const label = existing.label || `Lesson ${lessonNumber(lessonId)} — ${lesson.meta?.title || 'Untitled'}`;

  newLessons.push({
    id: lessonId,
    subjectId,
    label,
    file: `lessons/${lessonId}.json`,
  });
});

currentManifest.lessons = newLessons;

try {
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(currentManifest, null, 2) + '\n');
  console.log('✓ Updated manifest.json');
  console.log(`  Found ${newLessons.length} lesson file(s):`);
  newLessons.forEach((lesson) => {
    console.log(`    - ${lesson.subjectId}/${lesson.id}: ${lesson.label}`);
  });
} catch (err) {
  console.error(`Error writing manifest: ${err.message}`);
  process.exit(1);
}
