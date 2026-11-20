/** Business Design Playbook audit: transparent regex heuristics that quote resume lines; never invents numbers. */
export const VANITY_RE = /\b(delight(ed|ful)?|engagement|user satisfaction|better experience|improved (the )?(ux|experience)|intuitive|seamless|user[- ]friendly|beautiful)\b/i;
const NUM = /(\d+(\.\d+)?\s?(%|x|k|m|cr|lakh)|[$₹€£]\s?\d)/i;
export const FORMULAS = [
  { id: "growth", name: "Growth & monetization", formula: "Friction removed → behaviour changed → commercial metric", re: /\b(conversion|revenue|activation|retention|churn|upsell|expansion|signups?|acquisition|monetiz|arpu|gmv|checkout)\b/i },
  { id: "cost", name: "Cost-to-serve", formula: "System or self-service flow → efficiency lever → time or tickets saved", re: /\b(support tickets?|cost|self[- ]serve|self[- ]service|efficien|engineering (time|hours)|design system|reduc\w* (time|effort)|velocity|sprint)\b/i },
  { id: "enterprise", name: "Enterprise & go-to-market", formula: "Workflow redesign → readiness unlocked → win rate or contract value", re: /\b(enterprise|b2b|deal|win rate|contract|sales|compliance|procurement|onboarding|admin|gtm|go-to-market)\b/i },
] as const;
export type PlaybookAudit = { formulas: { id: string; name: string; formula: string; quotes: string[]; quantified: boolean }[]; vanity: string[]; covered: number };
export function playbookAudit(resume: string): PlaybookAudit {
  const lines = resume.split(/\n+/).map((l) => l.replace(/^[\s•\-*·]+/, "").trim()).filter((l) => l.length > 20);
  const formulas = FORMULAS.map((f) => { const quotes = lines.filter((l) => f.re.test(l)).slice(0, 3); return { id: f.id, name: f.name, formula: f.formula, quotes, quantified: quotes.some((q) => NUM.test(q)) }; });
  const vanity = lines.filter((l) => VANITY_RE.test(l) && !NUM.test(l)).slice(0, 5);
  return { formulas, vanity, covered: formulas.filter((f) => f.quantified).length };
}
