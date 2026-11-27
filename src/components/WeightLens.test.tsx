import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WeightLens, type Lens } from "./WeightLens";
import { applyEmphasis, baseWeights, type Emphasis } from "@/lib/weights";
import { futureTalentIndex, type Level } from "@/lib/scoring";

const candidate = { competencies: { growth: { proficiency: 5, level: 4 as const, quote: "Mentored three designers", source: "Experience" } } };
function Harness() {
  const [level, setLevel] = useState<Level>("Senior Product Designer");
  const [lens, setLens] = useState<Lens>("level");
  const [emphasis, setEmphasis] = useState<Partial<Record<string, Emphasis>>>({});
  const weights = applyEmphasis(baseWeights(lens, level), emphasis);
  const profile = futureTalentIndex(candidate, level, weights);
  return <><WeightLens level={level} onLevel={setLevel} detected="Senior Product Designer" readAs="4 years" lens={lens} onLens={setLens} emphasis={emphasis} onEmphasis={setEmphasis} weights={weights} baseline={futureTalentIndex(candidate, level).total} total={profile.total} /><output data-testid="result">{JSON.stringify({ lens, emphasis, weights, scores: profile.dims.map((d) => d.score), quotes: profile.dims.map((d) => d.quotes) })}</output></>;
}
function result() {
  return JSON.parse(screen.getByTestId("result").textContent ?? "{}") as { lens: Lens; emphasis: Record<string, Emphasis>; weights: Record<string, number>; scores: number[]; quotes: string[][] };
}
afterEach(cleanup);
describe("Benchmark control state", () => {
  it("presets change weights without changing evidence or dimension scores", () => {
    render(<Harness />);
    const original = result();
    fireEvent.change(screen.getByLabelText("Target role"), { target: { value: "research" } });
    expect(result().weights["research"]).toBe(35);
    expect(result().scores).toEqual(original.scores);
    expect(result().quotes).toEqual(original.quotes);
  });
  it("reset returns to the current role type", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Target role"), { target: { value: "research" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(result().lens).toBe("level");
    expect(result().weights["research"]).toBe(15);
  });
  it("no manual weight fine-tuning is offered", () => {
    render(<Harness />);
    expect(screen.queryByText(/Fine-tune/)).toBeNull();
  });
});
