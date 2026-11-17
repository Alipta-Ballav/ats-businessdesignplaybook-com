import { futureTalentIndex, type Candidate } from "@/lib/scoring";
import { Bar, Card, ScoreRing } from "@/components/ui-bits";

export function FtiReport({ c }: { c: Pick<Candidate, "competencies"> }) {
  const { total, dims } = futureTalentIndex(c);
  const weak = [...dims].sort((a, b) => a.score - b.score).filter((d) => d.score < 60).slice(0, 3);
  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Future Talent Index</p>
          <h2 className="font-display text-2xl">Your profile against our 8 dimensions</h2>
          <p className="text-sm text-muted-foreground">No job needed. Every score comes from a line in your resume.</p></div>
        <ScoreRing value={total} label="FTI score" tone="ink" />
      </div>
      <ul className="space-y-3">{dims.map((d) => (
        <li key={d.id} className="text-sm">
          <div className="flex justify-between"><span>{d.name} <span className="text-xs text-muted-foreground">· {d.weight}%</span></span><span className="font-mono">{d.score}</span></div>
          <Bar value={d.score} tone="fr" />
          {d.quotes[0] ? <p className="mt-1 text-xs italic text-muted-foreground">“{d.quotes[0]}”</p> : <p className="mt-1 text-xs text-muted-foreground">No evidence found in your resume.</p>}
        </li>))}</ul>
      {weak.length > 0 && <div><h3 className="font-display text-lg">Strengthen next</h3>
        <ul className="mt-2 space-y-2">{weak.map((d) => <li key={d.id} className="rounded border p-3 text-sm"><span className="font-medium">{d.name}</span><p className="text-muted-foreground">{d.tip}</p></li>)}</ul></div>}
    </Card>
  );
}
