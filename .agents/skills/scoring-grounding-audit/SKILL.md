---
name: scoring-grounding-audit
description: Audit that resume scores stay deterministic and evidence-grounded across the eight dimensions. Use when changing scoring.ts, evidence.ts, AI extraction, rewrites, rescoring, role-fit/job matching, or when a user questions whether a score is accurate.
---

# Scoring & Grounding Audit

1. Determinism: final numbers come only from src/lib/scoring.ts. AI may extract evidence but never assign scores. Same input must give the same score.
2. Grounding: evidence.ts must drop any quote not found verbatim in the resume. Never loosen this match.
3. Eight dimensions: confirm weights still sum correctly and all eight dimensions appear in reports, samples and promotion audits.
4. Job mode: Role Fit score must use the job description (must-have gates, missing requirements, ATS simulation); generic Future Talent Index stays separate and labeled.
5. Rewrites: AI drafts must pass newFacts() before applying; manual drafts are user-supplied evidence. AI must never add facts.
6. Claims: never claim AI-authorship detection, employer cutoffs or promotion readiness.
7. Verify: run scoring/evidence/editor tests with `bunx vitest run`; add one test per changed rule with concrete values.
