---
name: resume-export-alignment-qa
description: QA checklist for resume preview, Word (.docx) and clean PDF exports — A4 geometry, block reflow, image placement, fonts, selectable text. Use whenever a change touches resume preview, export-docx, PDF export, resumeBlocks or resume images, or when the user reports broken alignment in downloads.
---

# Resume Export & Alignment QA

1. Geometry: preview, Word and PDF must share RESUME_PAGE A4 constants (11906x16838 twips, 1080 margins, 9746 content width). Never hardcode separate sizes per format.
2. Reflow: all three surfaces must render from resumeBlocks(). Keep source-line indices and raw evidence text intact — reflow is presentation only and must not change scoring or editing targets.
3. Images: extracted graphics stay in fixed-width borderless tables with aspect-preserving bounds; dividers/icons are discarded; layout must remain stable with images toggled off.
4. Fonts/text: PDF embeds Noto Sans, text stays selectable, no garbled Unicode (₹, en-dashes, bullets).
5. Pagination: no orphan headings or lone bullet markers at page breaks.
6. Verify: run the export/preview tests with `bunx vitest run`; for visual changes, export a sample, convert DOCX to PDF with LibreOffice, and inspect page images.
7. Report any deviation with the exact file and measurement before claiming the fix works.
