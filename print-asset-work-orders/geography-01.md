# Print Asset Work Order — geography-01

**Lesson:** Maps & Globes
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
Use case: elementary educational lesson
Asset type: black-and-white printable worksheet image
Primary request: Convert the provided source image into a clean black-and-white coloring-page version for a Grades 2-4 printable worksheet.
Input image role: reference/edit target; preserve subject and composition.
Style: crisp outline drawing, white background, no grayscale fill, no shadows, no text, no watermark, no decorative frame.
Output: 1024 x 683 PNG, high contrast, print-safe, kid-friendly, clear enough for a worksheet.
```

## Required Assets

| Slot | Topic | Source Image | Target Print Asset | Status |
|---|---|---|---|---|
| hero | Maps & Globes hero | `assets/source-images/geography-01/hero.jpg` | `assets/images/geography-01-hero.png` | ready for imagegen conversion |
| s1 | What Maps Show | `assets/source-images/geography-01/s1.jpg` | `assets/images/geography-01-s1.png` | ready for imagegen conversion |
| s2 | Globes Show Earth | `assets/source-images/geography-01/s2.jpg` | `assets/images/geography-01-s2.png` | ready for imagegen conversion |
| s3 | Symbols, Keys, and Legends | `assets/source-images/geography-01/s3.jpg` | `assets/images/geography-01-s3.png` | ready for imagegen conversion |
| s4 | Directions and Compass Rose | `assets/source-images/geography-01/s4.jpg` | `assets/images/geography-01-s4.png` | ready for imagegen conversion |
| s5 | Quick Check + Create a Map | `assets/source-images/geography-01/s5.jpg` | `assets/images/geography-01-s5.png` | ready for imagegen conversion |

## Acceptance Check

After conversion, run:

```bash
node scripts/generate_seo.js
node scripts/validate_project.js
```

Validation must pass and every `printImage` target must exist on disk.
