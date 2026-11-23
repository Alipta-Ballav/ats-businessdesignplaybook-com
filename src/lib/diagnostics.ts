/** Transparent text heuristics, not employer facts or an AI-authorship detector. */
export type Signal = { label: string; quote: string };
const sentences = (text: string) => text.split(/\n+|(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);

export function decodeJob(title: string, description: string) {
  const lines = sentences(description);
  const groups = [
    { level: 1, label: "Delivery-led", pattern: /pixel.perfect|visual design|mockups|ui design|production design/i },
    { level: 2, label: "User-informed", pattern: /user research|usability|user interviews|discovery/i },
    { level: 3, label: "Systems-oriented", pattern: /design system|design tokens|accessibility|wcag/i },
    { level: 4, label: "Outcome-led", pattern: /business impact|conversion|retention|product strategy|success metrics/i },
    { level: 5, label: "Organization-shaping", pattern: /design strategy|design organization|design org|executive|org.wide|organizational/i },
  ];
  const signals = groups.flatMap(g => { const quote = lines.find(l => g.pattern.test(l)); return quote ? [{ level: g.level, label: g.label, quote }] : []; });
  const level = signals.length ? Math.max(...signals.map(s => s.level)) : null;
  const leadership = lines.filter(l => /manage.{0,30}(team|designer|budget)|hire.{0,30}designer|hiring.{0,30}team|org.wide|multiple (teams|squads)|cross.squad|vendor budget/i.test(l));
  const individualTitle = /senior|product designer|ux designer|ui designer/i.test(title) && !/director|head|manager|lead|principal|staff/i.test(title);
  const expectations: Signal[] = [
    { label: "Enterprise complexity", pattern: /b2b|enterprise|data.table|complex workflow/i },
    { label: "Engineering partnership", pattern: /front.end|engineer|handoff|implementation/i },
    { label: "Inclusive design", pattern: /accessibility|wcag|inclusive/i },
  ].flatMap(g => { const quote = lines.find(l => g.pattern.test(l)); return quote ? [{ label: g.label, quote }] : []; });
  return { level, label: groups.find(g => g.level === level)?.label ?? "Not enough evidence", signals, scopeWarnings: individualTitle ? leadership : [], expectations };
}

export type BulletFinding = { id: string; original: string; issues: string[] };
const MARKER = /^\s*([-•*▪●–]|\d+[.)])\s+/;
/** Whole resume lines (one bullet = one line), with any bullet marker removed. */
const bulletLines = (text: string) => text.split(/\n+/).map(l => l.replace(MARKER, "").trim()).filter(Boolean);
export function inspectBullets(resume: string): BulletFinding[] {
  return bulletLines(resume).flatMap((original, index) => {
    if (original.length < 35 || /@|https?:\/\//i.test(original)) return [];
    const issues: string[] = [];
    if (/synerg|world.class|cutting.edge|results.driven|user.centric|innovative solutions|seamless experience|spearheaded/i.test(original)) issues.push("Generic wording obscures the work");
    if (/led|designed|built|created|improved|launched|managed|delivered|spearheaded/i.test(original)) {
      if (!/\d|increased|reduced|improved.{0,25}(conversion|retention|adoption)|validated|usability|research findings/i.test(original)) issues.push("Outcome or validation is not stated");
      if (!/constraint|trade.off|limited|despite|legacy|budget|deadline|resolved|accessibility|wcag/i.test(original)) issues.push("Constraint or design decision is not stated");
    }
    return issues.length ? [{ id: String(index), original, issues }] : [];
  }).slice(0, 8);
}

/** Only user-entered details are added; never invent metrics, tools, or achievements. */
export function buildEvidenceBullet(original: string, details: { action: string; constraint: string; outcome: string }): string {
  const action = details.action.trim() || original;
  return [action.replace(/[.;\s]+$/, ""), details.constraint.trim(), details.outcome.trim()].filter(Boolean).join("; ") + ".";
}