import { FTI_DIMENSIONS, LEVELS, type Level } from "@/lib/scoring";

const scenarios: Record<string, string[]> = {
  craft: ["checkout flow", "onboarding journey", "accessible navigation", "mobile interaction"],
  research: ["usability study", "customer interviews", "research synthesis", "behavior analysis"],
  product: [
    "activation funnel",
    "retention experiment",
    "pricing experience",
    "support cost reduction",
  ],
  systems: [
    "design system",
    "enterprise permissions",
    "multi-team workflow",
    "error and exception states",
  ],
  ai: ["AI copilot", "agent handoff", "AI evaluation workflow", "AI-assisted prototype"],
  critical: [
    "problem reframing",
    "root cause investigation",
    "hypothesis test",
    "prioritization decision",
  ],
  leadership: [
    "cross-functional workshop",
    "designer mentoring",
    "design critique program",
    "stakeholder alignment",
  ],
  learning: [
    "new-domain discovery",
    "rapid experiment",
    "knowledge-sharing program",
    "prototype exploration",
  ],
};
const verbs = ["Designed", "Scaled", "Led", "Established"];
export type BulletTemplate = {
  id: string;
  dimension: string;
  dimensionName: string;
  level: Level;
  title: string;
  text: string;
};
export const BULLETS: BulletTemplate[] = FTI_DIMENSIONS.flatMap((d) =>
  (scenarios[d.id] ?? []).flatMap((scenario, s) =>
    LEVELS.map((level, l) => ({
      id: `${d.id}-${s}-${l}`,
      dimension: d.id,
      dimensionName: d.name,
      level,
      title: `${scenario.charAt(0).toUpperCase()}${scenario.slice(1)}`,
      text: `${verbs[l] ?? "Led"} [your ${scenario}] ${l === 0 ? "from discovery to delivery" : l === 1 ? "across [teams or products]" : l === 2 ? "with [team and partners]" : "as part of [organization strategy]"}, addressing [specific problem] within [real constraint]; [verified user, business or team result].`,
    })),
  ),
);
export function filterBullets(
  search: string,
  dimension: string,
  level: string,
  savedOnly: boolean,
  saved: string[],
) {
  const term = search.trim().toLowerCase();
  return BULLETS.filter(
    (b) =>
      (!dimension || b.dimension === dimension) &&
      (!level || b.level === level) &&
      (!savedOnly || saved.includes(b.id)) &&
      `${b.title} ${b.text} ${b.dimensionName} ${b.level}`.toLowerCase().includes(term),
  );
}
