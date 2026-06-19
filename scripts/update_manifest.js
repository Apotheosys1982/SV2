#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LESSONS_DIR = path.join(__dirname, '..', 'lessons');
const MANIFEST_FILE = path.join(LESSONS_DIR, 'manifest.json');

// Load current manifest to preserve ordering
let currentManifest = { defaultLessonId: 'lesson-01', lessons: [] };
try {
  const manifestContent = fs.readFileSync(MANIFEST_FILE, 'utf-8');
  currentManifest = JSON.parse(manifestContent);
} catch (err) {
  console.log(`Note: No existing manifest found. Creating new one.`);
}

// Scan lessons directory for lesson JSON files
let lessonFiles = [];
try {
  const files = fs.readdirSync(LESSONS_DIR);
  lessonFiles = files.filter(file => {
    const match = file.match(/^lesson-(\d+)\.json$/);
    return match !== null;
  }).sort();
} catch (err) {
  console.error(`Error scanning lessons directory: ${err.message}`);
  process.exit(1);
}

if (lessonFiles.length === 0) {
  console.error(`Error: No lesson files found in ${LESSONS_DIR}`);
  process.exit(1);
}

// Build new lesson entries, preserving labels from current manifest where possible
const currentManifestMap = {};
currentManifest.lessons.forEach(lesson => {
  currentManifestMap[lesson.id] = lesson;
});

const newLessons = [];
lessonFiles.forEach(file => {
  const lessonId = file.replace('.json', '');
  
  // Try to preserve existing label
  let label = currentManifestMap[lessonId]?.label;
  
  // If no label exists, generate one by reading the lesson file
  if (!label) {
    try {
      const lessonContent = fs.readFileSync(path.join(LESSONS_DIR, file), 'utf-8');
      const lesson = JSON.parse(lessonContent);
      const num = lessonId.split('-')[1];
      label = `Lesson ${num} — ${lesson.meta?.title || 'Untitled'}`;
    } catch (err) {
      console.warn(`Warning: Could not read ${file}, using default label`);
      const num = lessonId.split('-')[1];
      label = `Lesson ${num}`;
    }
  }
  
  newLessons.push({
    id: lessonId,
    label: label,
    file: `lessons/${lessonId}.json`
  });
});

// Update manifest
currentManifest.lessons = newLessons;

try {
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(currentManifest, null, 2));
  console.log(`✓ Updated manifest.json`);
  console.log(`  Found ${newLessons.length} lesson file(s):`);
  newLessons.forEach(lesson => {
    console.log(`    - ${lesson.id}: ${lesson.label}`);
  });
} catch (err) {
  console.error(`Error writing manifest: ${err.message}`);
  process.exit(1);
}
