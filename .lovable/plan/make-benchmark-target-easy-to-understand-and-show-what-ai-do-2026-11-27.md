# Make "Benchmark target" easy to understand, and show what AI does vs what the rubric does

## 1. New "How your score is made" strip (top of the report)
A simple 3-step line everyone sees before any controls:

```text
[1 AI reads]  ->  [2 Rubric scores]  ->  [3 You choose the benchmark]
 Finds quotes      Fixed rules turn       Which skills count most
 in your resume    quotes into 0-100      for the job you want
```
- Plain split: "AI: only finds and quotes lines from your resume. It never gives a number." / "Rubric: 100% of every number — same resume, same score, every time."
- Each dimension's evidence quote gets a small "Found by AI · scored by rubric" tag, so the split is visible where the score is.

## 2. Rewrite the Benchmark target panel in plain words
- Title: "Who are you being compared against?" with one line: "Pick the role you're applying for. This changes which skills count most — not your resume or your evidence."
- Two choices kept, renamed: "Your level" and "Type of design role" (options described in one short line each, e.g. "Design systems — components, tokens, documentation count more").
- Replace "contribute most to this rubric" with a small visual bar of the 8 skills sized by importance, top 2 named: "For this role, Product thinking and Design craft matter most."
- Score change shown as a sentence: "Your score for this role: 68 (was 64 with the standard benchmark). Your resume didn't change — only what's being prioritised."

## 3. "Customize dimension weights" becomes "Fine-tune what matters (advanced)"
- Collapsed by default with a one-line purpose: "Only if a job post stresses something specific."
- Each skill row: "Less important / Normal / More important" instead of Low/Standard/High, with its % beside it.
- Short example under it: "Job post says 'strong research'? Set Research to More important."

## Technical details
- Edits only in src/components/WeightLens.tsx, src/components/FtiReport.tsx (new explainer strip + evidence tag). Copy and layout only.
- No changes to scoring.ts, weights.ts, math, presets, or tests' expected values.
- Check at 1280px and 390px.
