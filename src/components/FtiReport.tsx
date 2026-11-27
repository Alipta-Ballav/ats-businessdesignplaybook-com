import { useState } from "react";
import { futureTalentIndex, inferLevel, type Candidate, type Level } from "@/lib/scoring";
import { Card, ScoreRing } from "@/components/ui-bits";
import { WeightLens, type Lens } from "@/components/WeightLens";
import { applyEmphasis, baseWeights, type Emphasis } from "@/lib/weights";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useQueueNavigation } from "@/components/ReportTabs";
import { GAP_BELOW } from "@/lib/fixer";

const GROUPS: { name: string; ids: string[] }[] = [
  { name: "Craft & research", ids: ["craft", "research"] },
  { name: "Product & systems", ids: ["product", "systems"] },
  { name: "Thinking & leadership", ids: ["critical", "leadership"] },
  { name: "Frontier & growth", ids: ["ai", "learning"] },
];

const band = (s: number) =>
  s >= 70
    ? { label: "Strong", cls: "bg-primary/10 text-primary", bar: "bg-primary" }
    : s >= 45
      ? { label: "Solid", cls: "bg-secondary text-secondary-foreground", bar: "bg-foreground/60" }
      : { label: "Gap", cls: "bg-destructive/10 text-destructive", bar: "bg-destructive" };

export function FtiReport({
  c,
  onFix,
}: {
  c: Pick<Candidate, "competencies"> & Partial<Pick<Candidate, "years" | "role">>;
  onFix?: () => void;
}) {
  const navigateQueue = useQueueNavigation();
  const detected = inferLevel(c.years ?? 0, c.role ?? "");
  const [level, setLevel] = useState<Level>(detected);
  const [lens, setLens] = useState<Lens>("level");
  const [emphasis, setEmphasis] = useState<Partial<Record<string, Emphasis>>>({});
  const weights = applyEmphasis(baseWeights(lens, level), emphasis);
  const baseline = futureTalentIndex(c, level).total;
  const { total, dims } = futureTalentIndex(c, level, weights);
  const sorted = [...dims].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const weak = [...dims]
    .filter((d) => d.score < GAP_BELOW)
    .sort((a, b) => b.weight * (GAP_BELOW - b.score) - a.weight * (GAP_BELOW - a.score));
  const verified = dims.filter((d) => d.quotes.length > 0).length;
  const byId = Object.fromEntries(dims.map((d) => [d.id, d]));

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-6 p-6">
          <div className="max-w-xl space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Future Talent Index
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Your resume evidence profile
            </h2>
            <p className="text-sm text-muted-foreground">
              Eight design dimensions, scored from the evidence in your resume—not a hiring prediction.
            </p>
          </div>
          <ScoreRing value={total} label="FTI score" tone="ink" />
        </div>
        <section aria-label="How your score is made" className="border-t px-6 py-4">
          <h3 className="text-sm font-semibold">How your score is made</h3>
          <ol className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              ["1 · AI reads", "Finds and quotes lines from your resume. It never gives a number."],
              ["2 · Rubric scores", "Fixed rules turn those quotes into 0–100. Same resume, same score, every time."],
              ["3 · You pick the benchmark", "Choose which skills count most for the job you want."],
            ].map(([t, d]) => (
              <li key={t} className="min-w-0 rounded-md border p-3">
                <p className="font-mono text-[11px] uppercase tracking-wider text-primary">{t}</p>
                <p className="mt-1 text-xs text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground"><strong className="text-foreground">AI: 0% of the score</strong> — it only finds evidence. <strong className="text-foreground">Rubric: 100% of every number.</strong></p>
        </section>
        <WeightLens
          level={level}
          onLevel={setLevel}
          detected={detected}
          readAs={`${c.years ? `${c.years} yrs` : "Experience not stated"}${c.role ? ` · ${c.role}` : ""}`}
          lens={lens}
          onLens={setLens}
          emphasis={emphasis}
          onEmphasis={setEmphasis}
          weights={weights}
          baseline={baseline}
          total={total}
        />
        <section aria-label="Next step" className="space-y-3 border-t p-4 sm:p-6">
          <div>
            <h3 className="font-semibold">{weak.length ? `${weak.length} evidence gap${weak.length === 1 ? "" : "s"} to address` : "No critical dimension gaps"}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{weak.length ? "These dimensions score below 45. Add a real example of your work, then rescore your edited resume." : "Review the remaining recommendations before exporting your resume."}</p>
          </div>
          {weak.length > 0 && <ul className="divide-y" aria-live="polite">
            {weak.slice(0, 3).map((d) => <li key={d.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 text-sm"><span className="min-w-0">{d.name}</span><span className="font-mono text-xs text-destructive">{d.score} · Gap</span></li>)}
          </ul>}
          {weak.length > 3 && <p className="text-xs text-muted-foreground">{weak.length - 3} more dimension gaps in the queue.</p>}
          <Button className="h-10 max-w-full whitespace-normal" onClick={onFix ?? navigateQueue}>{weak.length ? "Review gaps in Priority queue" : "Review Priority queue"}<ArrowRight className="shrink-0" /></Button>
          <p className="text-xs text-muted-foreground">Changing weights alone does not close gaps. The queue keeps its level-based order; no resume edits are applied automatically.</p>
        </section>
        <div className="grid grid-cols-1 divide-y border-t bg-muted/40 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <Stat k="Verified dimensions" v={`${verified} / 8`} />
          <Stat k="Strongest pillar" v={strongest?.name ?? "—"} />
        </div>
      </Card>

      {GROUPS.map((g) => (
        <section key={g.name} className="space-y-3">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {g.name}
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {g.ids
              .map((id) => byId[id])
              .filter((d): d is NonNullable<typeof d> => !!d)
              .map((d) => {
                const b = band(d.score);
                return (
                  <Card key={d.id} className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium leading-tight">{d.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Weight {d.weight}% · {d.skills.length} skills checked
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-2xl font-semibold leading-none">{d.score}</p>
                        <span
                          className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${b.cls}`}
                        >
                          {b.label}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {d.skills.join(" · ")}
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${b.bar}`}
                        style={{ width: `${d.score}%` }}
                      />
                    </div>
                    {d.quotes[0] ? (
                      <blockquote className="border-l-2 border-primary/50 pl-3 text-xs italic text-muted-foreground">
                        “{d.quotes[0]}”
                        <span className="mt-1 block font-mono text-[10px] not-italic uppercase tracking-wider text-primary">
                          Found by AI · scored by rubric
                        </span>
                      </blockquote>
                    ) : (
                      <p className="rounded border border-dashed px-3 py-2 text-xs text-muted-foreground">
                        No evidence found. {d.tip}
                      </p>
                    )}
                    {d.quotes[0] && d.score < 60 && <p className="text-xs text-muted-foreground">Evidence to strengthen: {d.tip}</p>}
                  </Card>
                );
              })}
          </div>
        </section>
      ))}

    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="px-6 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{k}</p>
      <p className="mt-1 truncate text-sm font-medium">{v}</p>
    </div>
  );
}
