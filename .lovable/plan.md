# Editor fixes: keep links, apply only on click, separate numbering, keep your work

## 1. Links stay links in downloads
- Word and PDF downloads find web addresses, emails and LinkedIn/portfolio links in the resume text and make them clickable, with the exact text shown in the resume.
- Links are not rewritten, shortened or dropped. Links inside bullets work as well as links in the contact line.

## 2. Changes reach the resume only after "Apply to resume"
- Today the right-hand preview shows your typed or AI-suggested line before you apply it. That stops.
- While you edit, the preview stays the same. The line you are working on gets a soft "being edited" outline so you can see where the change will go.
- The resume changes only when you click **Apply to resume**. The new line then appears highlighted as it does now, and Undo still works.

## 3. Separate numbering for each tab, with a "done" label
- Critical, High and Polish each count from 1 on their own (Critical 1, 2, 3… / High 1, 2… / Polish 1, 2…). Numbers stay the same as you apply, skip or undo items.
- Finished items stay in their place with a label: "Critical · done", "High · done", "Polish · done".
- Each tab shows its own progress, e.g. "High 2/5 done".

## 4. No lost work when you switch tabs
- Applied changes are never cleared by switching tabs (check and fix this).
- A line you started but did not apply is kept for each item. When you go back to that item, your text is still there. Switching tabs no longer clears it.
- Your unapplied text is never added to the resume on its own.

## Technical details
- `LiveEditor.tsx`: right-hand preview gets `draft` instead of `pending`; `pending` is used only for the location outline. Tab `onClick` no longer calls `reset()`. The single `proposal`/`aiDraft`/`writingManually` is replaced by `drafts: Record<itemId, {proposal, aiDraft, writingManually}>`, which is part of the EditorSession so it survives variant switches.
- Numbering: `numberSteps` runs on each tier's list, sorted by queue order with done items included, so numbers stay fixed. The done row shows `${tierLabel} · done`.
- Links: a shared `linkify(text)` in `src/lib/resume-blocks` splits text runs. `export-docx.ts` uses `ExternalHyperlink` and `export-pdf.ts` uses `pdf.textWithLink`/`link` placed over the measured URL span. Scoring and line indices stay the same.
- Tests: linkify (url/email/www, nothing invented); per-tier numbering stays fixed after apply/undo; preview draft stays unchanged until apply; proposals kept after a tab switch.
