# Print Asset Work Order — lesson-04

**Lesson:** The Water Cycle
**Purpose:** Convert the actual screen images used by this lesson into black-and-white coloring-page worksheet assets.

## Operator Rule

- Use each cached source image as the reference image.
- Preserve the main subject, framing, and educational meaning of the source image.
- Convert to black-and-white coloring-page line art suitable for elementary worksheets.
- Use clean outlines, large simple shapes, white background, and minimal interior detail.
- Do not add labels, captions, watermarks, logos, or decorative borders.
- Do not invent unrelated objects.
- Save the final PNG exactly to the target `printImage` path.
- Final target size should be 1024 x 683 PNG unless the lesson explicitly requires another ratio.

## Image Generator Prompt Template

```text
Use case: scientific-educational
Asset type: black-and-white printable worksheet image
Primary request: Convert the provided source image into a clean black-and-white coloring-page version for a Grades 2-4 science worksheet.
Input image role: reference/edit target; preserve subject and composition.
Style: crisp outline drawing, white background, no grayscale fill, no shadows, no text, no watermark, no decorative frame.
Output: 1024 x 683 PNG, high contrast, print-safe, kid-friendly, clear enough for a worksheet.
```

## Required Assets

| Slot | Topic | Source Image | Target Print Asset | Status |
|---|---|---|---|---|
| hero | The Water Cycle hero | `assets/source-images/lesson-04/hero.jpg` | `assets/images/water-cycle.png` | ready for imagegen conversion |
| s1 | What is the water cycle? | `assets/source-images/lesson-04/s1.jpg` | `assets/images/water-ocean.png` | ready for imagegen conversion |
| s2 | Evaporation: water rises into the air | `assets/source-images/lesson-04/s2.jpg` | `assets/images/water-sun.png` | ready for imagegen conversion |
| s3 | Condensation: water vapor forms clouds | `assets/source-images/lesson-04/s3.jpg` | `assets/images/water-clouds.png` | ready for imagegen conversion |
| s4 | Precipitation: water falls to Earth | `assets/source-images/lesson-04/s4.jpg` | `assets/images/water-rain.png` | ready for imagegen conversion |
| s5 | Collection & why the cycle matters | `assets/source-images/lesson-04/s5.jpg` | `assets/images/water-river.png` | ready for imagegen conversion |

## Acceptance Check

After conversion, run:

```bash
node scripts/generate_seo.js
node scripts/validate_project.js
```

Validation must pass and every `printImage` target must exist on disk.
