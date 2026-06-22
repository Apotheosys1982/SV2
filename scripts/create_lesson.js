#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LESSONS_DIR = path.join(__dirname, '..', 'lessons');
const MANIFEST_FILE = path.join(LESSONS_DIR, 'manifest.json');
const TEMPLATE_FILE = path.join(LESSONS_DIR, 'lesson_template.json');

// Parse CLI arguments
const args = process.argv.slice(2);
let lessonId = '';
let title = '';
let subtitle = '';
let subjectId = 'science';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--id' && i + 1 < args.length) {
    lessonId = args[i + 1];
  }
  if (args[i] === '--title' && i + 1 < args.length) {
    title = args[i + 1];
  }
  if (args[i] === '--subtitle' && i + 1 < args.length) {
    subtitle = args[i + 1];
  }
  if (args[i] === '--subject' && i + 1 < args.length) {
    subjectId = args[i + 1];
  }
}

// Validate inputs
if (!lessonId || !title || !subtitle) {
  console.error('Usage: node create_lesson.js --id lesson-XX --subject science --title "Title" --subtitle "Subtitle"');
  process.exit(1);
}

// Validate lesson ID format
if (!/^[a-z][a-z0-9-]*$/.test(subjectId)) {
  console.error(`Error: Subject ID must be lowercase letters, numbers, or hyphens. Got: ${subjectId}`);
  process.exit(1);
}

const scienceLessonRegex = /^lesson-\d{2,}$/;
const subjectLessonRegex = new RegExp(`^${subjectId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{2,}$`);
if (subjectId === 'science' ? !scienceLessonRegex.test(lessonId) : !subjectLessonRegex.test(lessonId)) {
  const expected = subjectId === 'science' ? 'lesson-XX' : `${subjectId}-XX`;
  console.error(`Error: Lesson ID must match ${expected}. Got: ${lessonId}`);
  process.exit(1);
}

// Check if lesson already exists
const newLessonFile = path.join(LESSONS_DIR, `${lessonId}.json`);
if (fs.existsSync(newLessonFile)) {
  console.error(`Error: Lesson ${lessonId} already exists at ${newLessonFile}`);
  process.exit(1);
}

// Load template
let template;
try {
  const templateContent = fs.readFileSync(TEMPLATE_FILE, 'utf-8');
  template = JSON.parse(templateContent);
} catch (err) {
  console.error(`Error loading template: ${err.message}`);
  process.exit(1);
}

// Replace placeholders
template.id = lessonId;
template.subjectId = subjectId;
template.meta.title = title;
template.meta.subtitle = `${subtitle} • Printable Web Lesson`;
template.hero.ariaLabel = `${title} lesson image`;
template.hero.imageQuery = `${title} elementary ${subjectId} lesson`;
if (template.hero.printImage) {
  template.hero.printImage = template.hero.printImage.replace(/lesson-XX/g, lessonId);
}
if (Array.isArray(template.sections)) {
  template.sections.forEach((section, idx) => {
    if (!section.imageQuery) {
      section.imageQuery = `${title} ${section.title || section.id || subjectId + ' lesson'}`;
    }
    if (section.imageQuery) {
      section.imageQuery = section.imageQuery.replace(/elementary science/g, `elementary ${subjectId}`);
    }
    if (section.printImage) {
      section.printImage = section.printImage.replace(/lesson-XX/g, lessonId);
    } else {
      section.printImage = `assets/images/${lessonId}-s${idx + 1}.png`;
    }
  });
}

// Load manifest
let manifest;
try {
  const manifestContent = fs.readFileSync(MANIFEST_FILE, 'utf-8');
  manifest = JSON.parse(manifestContent);
} catch (err) {
  console.error(`Error loading manifest: ${err.message}`);
  process.exit(1);
}

const subject = (manifest.subjects || []).find((item) => item.id === subjectId);
if (!subject) {
  console.error(`Error: Subject ${subjectId} is not registered in manifest.json`);
  process.exit(1);
}

const lessonNum = (lessonId.match(/(\d+)$/) || [null, lessonId])[1];
template.meta.kicker = [`Lesson ${String(Number(lessonNum))}`, subject.label || subjectId, '20–30 min', 'Grades 2–4', 'Print-ready'];

// Check if lesson is already in manifest
const alreadyExists = manifest.lessons.some(lesson => lesson.id === lessonId);
if (alreadyExists) {
  console.error(`Error: Lesson ${lessonId} is already registered in manifest.json`);
  process.exit(1);
}

// Create new lesson file
try {
  fs.writeFileSync(newLessonFile, JSON.stringify(template, null, 2));
  console.log(`✓ Created lesson file: ${newLessonFile}`);
} catch (err) {
  console.error(`Error creating lesson file: ${err.message}`);
  process.exit(1);
}

// Add new lesson to manifest
manifest.lessons.push({
  id: lessonId,
  subjectId,
  label: `Lesson ${String(Number(lessonNum))} — ${title}`,
  file: `lessons/${lessonId}.json`
});

try {
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`✓ Updated manifest.json with lesson: ${lessonId}`);
} catch (err) {
  console.error(`Error updating manifest: ${err.message}`);
  // Try to rollback the lesson file
  try {
    fs.unlinkSync(newLessonFile);
    console.log(`✓ Rolled back lesson file due to manifest error`);
  } catch (rollbackErr) {
    console.error(`Failed to rollback lesson file: ${rollbackErr.message}`);
  }
  process.exit(1);
}

console.log(`\n✓ Successfully created lesson: ${lessonId}`);
console.log(`  Title: ${title}`);
console.log(`  Subject: ${subjectId}`);
console.log(`  File: ${newLessonFile}`);

console.log(`\nNext steps:`);
console.log(`  1. Edit ${newLessonFile} to finish lesson content and precise imageQuery fields`);
console.log(`  2. Agent step: run/review the image-provider candidate workflow for each slot`);
console.log(`  3. Agent step: update hero.screenImage and section screenImage URLs from selected API candidates`);
console.log(`  4. Run: node scripts/prepare_print_assets.js --lesson ${lessonId}`);
console.log(`  5. Agent step: use Codex imagegen to convert cached source images into black-and-white coloring-page PNGs at each printImage path`);
console.log(`  6. Run: node scripts/generate_seo.js`);
console.log(`  7. Run: node scripts/validate_project.js`);
console.log(`  8. Test at http://localhost:8000/?subject=${subjectId}&lesson=${lessonId}`);
console.log(`  9. Run checkpoint with a receipt`);
