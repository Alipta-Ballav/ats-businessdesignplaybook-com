---
name: interaction-craft-guard
description: Interaction-design quality bar for any UI change in this designer-facing ATS app — new controls, settings, scoring/weighting UI, editors, lists, dialogs or page layouts. Use before building or reviewing screens, not for pure logic changes.
---

# Interaction Craft Guard

Our users are UX/product designers; clumsy UI destroys credibility. Apply every rule before shipping UI.

1. Mental model first: express controls in the user's intent (presets, Low/Standard/High, role names), not raw math. The system does arithmetic (e.g. normalising weights to 100%), never the user.
2. Progressive disclosure: one sensible default visible; advanced controls behind a clearly labelled collapsible/tab/menu. Open it by default only when the user has already customised it.
3. Immediate feedback: every change shows its consequence in place (score delta "61 → 68 (+7)", updated distribution, toast on save). Use aria-live for changing numbers.
4. Locus of control: never silently move inputs the user set. Predictable, reversible: always offer Reset/Undo next to custom state.
5. One primary action per surface; no duplicate buttons for the same intent; secondary actions in an overflow menu.
6. Fitts & touch: targets ≥ 40px tall (h-10; segmented items ≥ h-9), primary actions visually dominant, related controls grouped.
7. Accessibility: radio semantics for exclusive choices (role=radiogroup/radio + aria-checked), visible focus, honour reduced motion, colour never the only signal (pair with text/%).
8. Layout: mobile 390px has no horizontal overflow; rows use grid grid-cols-[minmax(0,1fr)_auto] with min-w-0/truncate.
9. Honest copy: short, plain, states what changes and what doesn't (e.g. "Your evidence stays the same").
10. Verify in a browser at 1280px and 390px: exercise the default, a customised state, and reset; screenshot and look at it before claiming done.
