import { useEffect, useState } from "react";
import type { Candidate } from "@/lib/scoring";
import { JobDiagnostics } from "@/components/JobDiagnostics";
import { LiveEditor } from "@/components/LiveEditor";
import { FtiReport } from "@/components/FtiReport";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q, scanToPair } from "@/lib/db";
import { evaluate } from "@/lib/scoring";
import { resumeTips } from "@/lib/tips";
import { ScoreDetails, ScoreHeader } from "@/components/ScoreReport";
import { Card, StatusBadge } from "@/components/ui-bits";
import { AtsSimulator } from "@/components/AtsSimulator";
import { AtsTarget } from "@/components/AtsTarget";
import { BusinessPlaybook } from "@/components/BusinessPlaybook";
import { ReportTabs } from "@/components/ReportTabs";

export const Route = createFileRoute("/_authenticated/candidate/scans/$scanId")({
  head: () => ({
    meta: [
      { title: "Your resume score — FutureTalent AI" },
      {
        name: "description",
        content: "Your scores, the evidence behind them, and how to improve.",
      },
      { property: "og:title", content: "Your resume score — FutureTalent AI" },
      {
        property: "og:description",
        content: "Your scores, the evidence behind them, and how to improve.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScanResult,
});

function ScanResult() {
  const { scanId } = Route.useParams();
  const { data: s, isLoading } = useQuery(q.scan(scanId));
  const [verified, setVerified] = useState<Candidate | null>(null);
  useEffect(() => setVerified(null), [scanId]);
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!s)
    return (
      <p>
        Result not found.{" "}
        <Link to="/candidate" className="underline">
          Back
        </Link>
      </p>
    );
  const { job, cand } = scanToPair(s);
  const ev = evaluate(job, verified ?? cand);
  const tips = resumeTips(job, cand);
  if (!s.job_description.trim())
    return (
      <div className="space-y-6">
        <Link to="/candidate" className="text-sm text-muted-foreground">
          ← New check
        </Link>
        <FtiReport c={verified ?? cand} />
        <BusinessPlaybook />
        <LiveEditor job={job} cand={cand} resume={s.resume_text ?? ""} onRescored={setVerified} />
      </div>
    );
  return (
    <div className="space-y-6">
      <Link to="/candidate" className="text-sm text-muted-foreground">
        ← New check
      </Link>
      <Card className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-sm text-muted-foreground">Your fit for</p>
          <h1 className="font-display text-3xl">{s.job_title}</h1>
          <div className="mt-2">
            <StatusBadge status={ev.status} />
          </div>
        </div>
        <ScoreHeader job={job} c={verified ?? cand} />
      </Card>
      <BusinessPlaybook />
      <ReportTabs
        tabs={[
          {
            id: "fix",
            label: "Fix & rescore",
            content: (
              <>
                <LiveEditor job={job} cand={cand} resume={s.resume_text ?? ""} onRescored={setVerified} />
                <Card>
                  <h2 className="mb-1 font-display text-lg">How to improve your resume</h2>
                  <p className="mb-4 text-xs text-muted-foreground">Ordered by impact.</p>
                  {tips.length === 0 ? (
                    <p className="text-sm">Your resume shows strong evidence across the board.</p>
                  ) : (
                    <ol className="divide-y">
                      {tips.slice(0, 6).map((t, i) => (
                        <li key={i} className="flex gap-4 py-3 text-sm">
                          <span className="font-mono text-xs text-muted-foreground">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <p className="font-medium">
                              {t.title}
                              {t.kind === "requirement" && (
                                <span className="ml-2 font-mono text-[10px] uppercase text-destructive">
                                  must-have
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-muted-foreground">{t.detail}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              </>
            ),
          },
          { id: "profile", label: "Talent profile", content: <FtiReport c={verified ?? cand} /> },
          {
            id: "ats",
            label: "8 ATS engines",
            content: (
              <>
                <AtsTarget job={job} c={cand} resume={s.resume_text ?? ""} />
                <AtsSimulator job={job} c={cand} />
              </>
            ),
          },
          {
            id: "role",
            label: "The role",
            content: <JobDiagnostics title={s.job_title} description={s.job_description} />,
          },
          {
            id: "evidence",
            label: "Evidence",
            content: <ScoreDetails job={job} c={cand} audience="candidate" />,
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Scores use a balanced policy. Each employer may weigh things differently. AI only finds
        quotes from your resume; scores come from fixed, published rules.
      </p>
    </div>
  );
}
