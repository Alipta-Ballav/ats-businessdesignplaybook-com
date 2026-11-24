import { useState } from "react";
import { futureTalentIndex, inferLevel, LEVELS, type Candidate, type Level } from "@/lib/scoring";
import { Card, ScoreRing } from "@/components/ui-bits";

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

const tier = (t: number) =>
  t >= 75
    ? "Principal / Staff ready"
    : t >= 60
      ? "Senior designer level"
      : t >= 40
        ? "Mid-level, building depth"
        : "Developing profile";

export function FtiReport({
  c,
}: {
  c: Pick<Candidate, "competencies"> & Partial<Pick<Candidate, "years" | "role">>;
}) {
  const detected = inferLevel(c.years ?? 0, c.role ?? "");
  const [level, setLevel] = useState<Level>(detected);
  const { total, dims } = futureTalentIndex(c, level);
  const sorted = [...dims].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const weak = [...dims]
    .sort((a, b) => a.score - b.score)
    .filter((d) => d.score < 60)
    .slice(0, 3);
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
              Your Product & UX design profile across 8 dimensions
            </h2>
            <p className="text-sm text-muted-foreground">
              No job needed. Every score is backed by a line quoted from your resume.
            </p>
            <span className="inline-flex rounded-full border px-3 py-1 text-xs font-medium">
              {tier(total)}
            </span>
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <p className="text-muted-foreground">
                We read you as: {c.years ? `${c.years} years` : "experience not stated"}
                {c.role ? ` · ${c.role}` : ""} → <b className="text-foreground">{detected}</b>
              </p>
              <label className="mt-2 flex flex-wrap items-center gap-2 font-medium">
                Scored as
                <select
                  className="rounded-md border bg-background px-2 py-1 font-normal"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as Level)}
                >
                  {LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <p className="mt-1 text-muted-foreground">
                Change it to see how you score at the level you're aiming for.
              </p>
            </div>
          </div>
          <ScoreRing value={total} label="FTI score" tone="ink" />
        </div>
        <div className="grid grid-cols-1 divide-y border-t bg-muted/40 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat k="Verified dimensions" v={`${verified} / 8`} />
          <Stat k="Strongest pillar" v={strongest?.name ?? "—"} />
          <Stat k="Fix first" v={weak[0]?.name ?? "None — well rounded"} />
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
                          Verified from resume
                        </span>
                      </blockquote>
                    ) : (
                      <p className="rounded border border-dashed px-3 py-2 text-xs text-muted-foreground">
                        No evidence found. {d.tip}
                      </p>
                    )}
                  </Card>
                );
              })}
          </div>
        </section>
      ))}

      {weak.length > 0 && (
        <Card className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Strengthen next</h3>
            <p className="text-xs text-muted-foreground">
              Ranked by how much each fix lifts your score.
            </p>
          </div>
          <ol className="divide-y">
            {weak.map((d, i) => (
              <li key={d.id} className="flex gap-4 py-3">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{d.name}</p>
                    <span className="font-mono text-xs text-muted-foreground">
                      {d.score} · weight {d.weight}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{d.tip}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            Use “Fix & rescore” below to add these lines and see your score update.
          </p>
        </Card>
      )}
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
