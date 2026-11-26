<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- All scores are computed deterministically in src/lib/scoring.ts (AI may only extract evidence, never assign final numbers) — PRD requires explainable, reproducible scoring.
- AI (src/lib/ai/extract.server.ts) only extracts evidence; src/lib/evidence.ts drops any quote not found verbatim in the resume — keeps scores grounded and reproducible.
- Personas live in public.user_roles (candidate | recruiter), set at signup via metadata trigger or once via choose_role RPC — roles never stored on profiles.
- App data is read/written from the browser client under RLS (src/lib/db.ts); only resume reading, AI rewrites and payments run server-side — keeps the AI key off the client.
- Job diagnostics and bullet checks use transparent client-safe heuristics in diagnostics.ts, quote their inputs, and never detect AI authorship or assert employer facts — avoids unsupported diagnostic claims.
- Bullet revisions compose only original text and user-supplied facts, and never mutate stored resumes automatically — preserves factual ownership and original evidence.
- Retired marketplace URLs redirect to the ATS checker; existing database records are preserved — removes public discovery without destructive schema changes.
- AI rescoring in ResumeFixer re-reads the edited draft via readResumeGuest; scores stay deterministic and the stored resume is never overwritten — candidate exports the revision.
- Razorpay payments: server creates orders from PLANS and only confirmPaymentRow (razorpay.server.ts) marks payments completed by re-reading the order; webhook never trusts its body — the key secret stays in the gateway, so this read is the proof of payment.
- Paid entitlement uses the shared hasPaidAccess rule on verified payment rows in both browser and AI handlers, never session-storage flags; distinct plan IDs preserve prior purchase terms and allow prepaid expiry without schema changes.
- AI bullet rewrites (rewrite.functions.ts, free for all; paywall is on rescore + Word) must pass newFacts() in editor.ts before applying — AI may rephrase but never add facts.
- Career workspace saves immutable, owner-scoped resume snapshots and bookmarks through browser RLS; unrescored drafts have no verified score, and comparisons require identical level and job settings — prevents misleading progress and overwriting originals.
- Promotion audits reuse the deterministic eight-dimension weights and quote evidence; they never claim employer promotion readiness — resume evidence cannot establish a promotion decision.
- Weekly teardowns fetch fixed official public Ashby feeds and rotate current design-role selections weekly, quoting only posting text — avoids scraping LinkedIn or inventing employer criteria.
- Resume health reminders are user-downloaded recurring calendar events, not automated emails — keeps delivery explicitly opt-in without an email service.
- Resume preview and Word export share presentation-only blocks and A4 geometry; preserve source-line indices and raw evidence text so reflow cannot change scoring or editing targets.
- Resume insertion uses explicit source-line locations; undo snapshots include draft and applied-fix state, and per-fix reversals retain exact before/after text to preserve unrelated edits.
