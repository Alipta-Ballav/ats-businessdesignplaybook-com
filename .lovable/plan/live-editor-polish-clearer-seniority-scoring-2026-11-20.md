# Live editor polish + clearer seniority scoring

## 1. Undo anything, and tick completed steps
Today there is only one "Undo" button, and it removes only the last change.
- Every applied recommendation (manual or AI) gets its own **Undo** button, so any earlier change can be reverted on its own.
- Add **"Reset to original CV"** with a confirm step.
- Typing directly in the text editor: changes are grouped so Undo steps back in sensible chunks, not one letter at a time.
- A recommendation you have applied shows a **green tick** and moves to a "Done" list. Undoing it removes the tick and moves it back to open. Skipped items show a grey "Skipped" mark.
- A progress line at the top, for example "3 of 7 fixed".

## 2. Make "What you did / Constraint / Verified outcome" intuitive
- Rename the fields to plain questions:
  - "What did you actually do?"
  - "What made it hard?" (deadline, legacy tech, small team, budget)
  - "What changed because of it?" (a number, or a real result)
- Show a worked example inside each box as greyed-out sample text, e.g. "Redesigned the 5-step checkout into 2 steps" / "with no engineering budget for a rebuild" / "conversion rose 18% in 6 weeks".
- Add a short "Before / After" example card above the fields that shows how the three answers combine into one strong bullet.
- Add a hint: "Only add true facts. Leave a box empty if you don't know."

## 3. Preview looks like the Word file
- The live preview on the right is restyled to match the downloaded Word document: a page-shaped white sheet, the same font and sizes, bold name, section headings with rules, real bullet points, and job title / company / dates lines in bold.
- Changed lines stay highlighted on screen only. The downloaded file stays clean.

## 4. Seniority: make it understandable and actually used
What happens today:
- The AI already reads **years of experience** and the most recent job title from the CV, but the score does not use them yet.
- The level presets (Senior, Staff, Manager, Director) only apply in the "Score against a job" settings. The free generic check uses neutral settings for everyone.

Change:
- **No need for the candidate to type their experience.** We detect it from the CV and show it: "We read you as: 9 years · Lead Product Designer → Design Manager / Lead level". There is one dropdown to correct it, or to pick the level you are aiming for.
- The generic score is then judged at that level, using your **8 Product & UX dimensions**, each weighted differently per level:

| Dimension | Senior | Staff / Principal | Manager / Lead | Head / Director |
|---|---|---|---|---|
| Design Craft & Execution | 25 | 15 | 10 | 5 |
| Research & Human Understanding | 15 | 10 | 10 | 5 |
| Product & Business Thinking | 10 | 15 | 15 | 20 |
| Systems & Complexity | 10 | 20 | 10 | 10 |
| AI & Emerging Tech | 15 | 15 | 10 | 10 |
| Critical Thinking | 10 | 10 | 10 | 10 |
| Collaboration & Leadership | 5 | 10 | 25 | 30 |
| Learning & Innovation | 10 | 5 | 10 | 10 |

- Replace the confusing home page block ("The bar moves with the level", "65/100 flexibility") with a plain explanation. Pick a level, see which 3 dimensions matter most and one example line a recruiter expects at that level. The word "flexibility" is removed from that section.
- In the report: "Scored as: Design Manager / Lead". Switching the level re-scores instantly, with no new scan.

## Technical details
- `editor.ts`: change log as a list of `{id, before, after, source}`. Per-item undo rebuilds the draft by replaying the remaining changes. Add tests for undo-out-of-order and reset.
- `scoring.ts`: add `LEVEL_WEIGHTS` (the 8-dim table above), `inferLevel(years, role)` (deterministic: title keywords first, years as a fallback: <6 Senior, 6–9 Staff, manager/lead titles Manager, head/director/VP Director), and `futureTalentIndex(c, level?)`. Tests: weights sum to 100 per level, and inferLevel cases.
- `FtiReport.tsx`: level badge + selector. `index.tsx`: rewritten seniority section.
- `ResumePreview.tsx`: Word-matching typography (same rules as `export-docx.ts`).
- `LiveEditor.tsx`: new field labels and examples, ticks, per-item undo, reset.
