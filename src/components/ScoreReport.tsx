import {
  COMPETENCIES,
  DIM_NAMES,
  EVIDENCE_LABELS,
  competencyScore,
  evaluate,
  type Candidate,
  type Dimension,
  type Job,
} from "@/lib/scoring";
import { Bar, Card, ScoreRing } from "@/components/ui-bits";

export function ScoreHeader({ job, c }: { job: Job; c: Candidate }) {
  const ev = evaluate(job, c);
  return (
    <div className="flex flex-wrap gap-6">
      <ScoreRing value={ev.JR.score} label="Job Readiness" tone="jr" />
      <ScoreRing value={ev.FR.score} label="Future Readiness" tone="fr" />
      <ScoreRing value={ev.HP.score} label="Human Potential" tone="hp" />
      <ScoreRing value={ev.composite} label={`Overall · ${ev.coverage}% coverage`} tone="ink" />
    </div>
  );
}

export function ScoreDetails({
  job,
  c,
  audience,
}: {
  job: Job;
  c: Candidate;
  audience: "candidate" | "recruiter";
}) {
  const ev = evaluate(job, c);
  return (
    <>
      {ev.mand.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display text-lg">Must-have requirements</h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-3">
            {ev.mand.map((m) => (
              <li key={m.name} className="rounded border p-2">
                <span className={m.accepted ? "text-success" : "text-destructive"}>
                  {m.accepted ? "✓" : "!"}
                </span>{" "}
                {m.name}
                <div className="text-xs text-muted-foreground">
                  {m.value === "met"
                    ? "Directly evidenced"
                    : m.value === "transferable"
                      ? m.accepted
                        ? "Accepted as transferable"
                        : m.essential
                          ? "Related only — essential, needs direct evidence"
                          : audience === "recruiter"
                            ? "Related only — raise flexibility above 60 to accept"
                            : "Related experience only"
                      : "Not found in resume"}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {(["JR", "FR", "HP"] as Dimension[]).map((d) => (
        <Card key={d}>
          <h2 className="mb-3 font-display text-lg">{DIM_NAMES[d]}</h2>
          <div className="space-y-4">
            {COMPETENCIES.filter((x) => x.dim === d).map((x) => {
              const e = c.competencies[x.id];
              const s = competencyScore(e, job.flexibility);
              return (
                <div key={x.id} className="grid gap-2 sm:grid-cols-[200px_1fr_60px] sm:items-start">
                  <span className="text-sm font-medium">{x.name}</span>
                  <div className="space-y-1">
                    <Bar value={s} tone={d.toLowerCase() as "jr" | "fr" | "hp"} />
                    {e ? (
                      <p className="text-xs text-muted-foreground">
                        "{e.quote}"{" "}
                        <span className="font-mono">
                          — {e.source} · L{e.level} {EVIDENCE_LABELS[e.level]} · proficiency{" "}
                          {e.proficiency}/5{e.transferable && " · transferable"}
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">
                        Not evidenced — does not mean the capability is absent.
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-sm sm:text-right">{s ?? "—"}</span>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </>
  );
}
