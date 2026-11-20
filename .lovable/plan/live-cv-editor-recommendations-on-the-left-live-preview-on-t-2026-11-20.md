# Live CV editor: recommendations on the left, live preview on the right

## What you get
A new "Live editor" view in the report (it replaces the one-by-one Fix & rescore card and keeps everything that card does).

```text
+---------------------------------+---------------------------------+
| LEFT: Edit                      | RIGHT: Live preview             |
| Score 62 -> 71 (+9)  [Rescore]  | Formatted resume, like a page   |
| Recommendations list            | - Changed lines highlighted     |
|  [ ] Make bullet concrete       | - Click a line to jump to its   |
|      Manual | AI suggest        |   recommendation                |
|  [ ] Add AI project evidence    | - Updates as you type           |
| Full resume text editor         | [Word .docx] [Copy] [Undo]      |
+---------------------------------+---------------------------------+
```

- **Left column**
  - A list of recommendations ranked by impact: vague bullets to rewrite, missing evidence to add, and weak dimensions from the 8-dimension report. Each one shows its status: open, applied or skipped.
  - Each recommendation has two ways to fix it:
    - **Manual:** fill in "what you did / constraint / outcome", or write the line yourself.
    - **AI suggest:** AI drafts a stronger line using only your original line and the facts you typed. It never adds numbers, employers or tools you did not give it. Any draft that brings in a new number or name is flagged "Needs your confirmation" and cannot be applied until you edit it.
  - Below the list, the full resume text can be edited directly at any time.
- **Right column**
  - A preview that updates as you type and looks like a clean, single-column printed resume (the same layout as the Word download).
  - Changed lines are highlighted, and each one can be accepted or undone.
- **Score**
  - A quick estimate updates as you type, labelled "estimate".
  - "Rescore" re-reads the edited resume and gives the official score, the same way it works today.
- **Mobile:** the two columns become two tabs, "Edit" and "Preview".

## Payment rules (unchanged)
- On the free plan, 2 fixes are free, counting both manual and AI fixes.
- The Word download stays behind the ₹49 unlock.
- **AI suggest** is a paid feature, and free users see a lock on it. I've assumed this; tell me if you'd rather it be free.

## Technical details
- New `src/components/LiveEditor.tsx` (split layout), `ResumePreview.tsx` (renders sections, headings and bullets with diff highlights), and `src/lib/editor.ts` (recommendation queue built on top of `buildQueue`, a line diff, and the guard that checks for new numbers and names).
- New server function `suggestRewrite` in `src/lib/rewrite.functions.ts` that calls the Lovable AI Gateway from the server only. Its input is the original line plus your facts, and its output is plain text. `editor.ts` then checks that every number and capitalised name in the draft appears in the original line or your facts. If anything is new, the draft is flagged.
- Scores stay fixed by the existing rules in `scoring.ts`. The live estimate re-runs the same scoring on the evidence already extracted, adjusted only for lines that were deleted. The official score comes from `readResumeGuest`, as it does now.
- The saved resume is never overwritten. Edits stay in the browser until you export them.
- `check.tsx`: swap `ResumeFixer` for `LiveEditor` in both report types.
- Tests:
  - The guard rejects a new number or company name.
  - The diff marks replaced lines.
  - The free-fix count includes AI fixes.
- I'll add an AGENTS.md rule saying AI rewrites must pass the "no new facts" check.
