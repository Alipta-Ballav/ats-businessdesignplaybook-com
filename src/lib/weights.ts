import { FTI_DIMENSIONS, LEVEL_WEIGHTS, type Level } from "./scoring";

export type WeightMap = Record<string, number>;
export type Emphasis = "low" | "standard" | "high";
export const EMPHASIS_FACTOR: Record<Emphasis, number> = { low: 0.5, standard: 1, high: 2 };

export type ArchetypeId = "product" | "research" | "systems" | "leader";
export const ARCHETYPES: { id: ArchetypeId; name: string; blurb: string; weights: WeightMap }[] = [
  {
    id: "product",
    name: "Product Designer",
    blurb: "End-to-end craft tied to product outcomes.",
    weights: { craft: 25, research: 15, product: 20, systems: 15, ai: 5, critical: 10, leadership: 5, learning: 5 },
  },
  {
    id: "research",
    name: "UX Researcher",
    blurb: "Discovery rigor and turning insight into decisions.",
    weights: { craft: 10, research: 35, product: 15, systems: 5, ai: 0, critical: 20, leadership: 10, learning: 5 },
  },
  {
    id: "systems",
    name: "Design Systems",
    blurb: "Scalable foundations, tokens and quality at scale.",
    weights: { craft: 25, research: 5, product: 10, systems: 35, ai: 5, critical: 15, leadership: 0, learning: 5 },
  },
  {
    id: "leader",
    name: "Design Leader",
    blurb: "People, strategy and organisational influence.",
    weights: { craft: 5, research: 5, product: 25, systems: 5, ai: 5, critical: 15, leadership: 35, learning: 5 },
  },
];

/** "level" = the seniority-based default weights. */
export function baseWeights(lens: ArchetypeId | "level", level: Level): WeightMap {
  if (lens === "level") return { ...LEVEL_WEIGHTS[level] };
  const a = ARCHETYPES.find((x) => x.id === lens);
  return { ...(a?.weights ?? LEVEL_WEIGHTS[level]) };
}

/** Multiply by emphasis, then rescale to whole numbers summing to exactly 100 (largest remainder). */
export function applyEmphasis(base: WeightMap, emphasis: Partial<Record<string, Emphasis>>): WeightMap {
  const ids = FTI_DIMENSIONS.map((d) => d.id);
  const raw = ids.map((id) => (base[id] ?? 0) * EMPHASIS_FACTOR[emphasis[id] ?? "standard"]);
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum <= 0) return { ...base };
  const exact = raw.map((r) => (r / sum) * 100);
  const out = exact.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i] = (out[i] ?? 0) + 1;
    left--;
  }
  return Object.fromEntries(ids.map((id, i) => [id, out[i] ?? 0]));
}
