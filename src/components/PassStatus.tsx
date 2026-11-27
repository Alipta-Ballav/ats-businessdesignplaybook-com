import { Link } from "@tanstack/react-router";
import { POWER_DAYS, PASS_DAYS } from "@/lib/plans";
import { usePassStatus, type PassStatus } from "@/lib/pro";
import { Button } from "@/components/ui/button";

const NAMES: Record<PassStatus["tier"], string> = {
  power: "Power Searcher",
  job_hunt: "Job Hunt",
  lifetime: "Lifetime access",
  admin: "Admin",
  expired: "Pass expired",
  none: "Free plan",
};
const fmt = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Compact plan pill for the header; links to the pass page. */
export function PlanBadge() {
  const s = usePassStatus();
  if (!s) return null;
  const paid = s.tier === "power" || s.tier === "job_hunt";
  const detail = paid ? `${s.left ?? 0} scans left · ${s.daysLeft}d` : null;
  return (
    <Link
      to="/pass"
      title={paid && s.endsAt ? `Expires ${fmt(s.endsAt)}` : "See your pass"}
      className={`inline-flex h-8 max-w-full items-center gap-1.5 truncate rounded-full border px-3 text-xs font-medium transition-colors hover:bg-muted ${paid ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground"}`}
    >
      <span className="truncate">{NAMES[s.tier]}</span>
      {detail && <span className="hidden font-mono font-normal sm:inline">· {detail}</span>}
    </Link>
  );
}

/** Full pass summary card for the Account page. */
export function PassCard() {
  const s = usePassStatus();
  if (!s) return <div className="h-40 animate-pulse rounded-lg border bg-muted/40" aria-hidden />;
  const paid = s.tier === "power" || s.tier === "job_hunt";
  const copy: Record<PassStatus["tier"], string> = {
    power: `${POWER_DAYS}-day pass with role variants in My resumes.`,
    job_hunt: `${PASS_DAYS}-day pass with one master resume.`,
    lifetime: "Your earlier purchase keeps full access.",
    admin: "No scan limit on this account.",
    expired: "Your last pass has ended. Renew to rescore and download.",
    none: "Your free scan is included. Buy a pass for verified rescoring and downloads.",
  };
  return (
    <section aria-label="Your plan" className="space-y-4 rounded-lg border p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Your plan</p>
          <h2 className="mt-1 truncate text-xl font-semibold">{NAMES[s.tier]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy[s.tier]}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${paid || s.tier === "lifetime" || s.tier === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {paid || s.tier === "lifetime" || s.tier === "admin" ? "Active" : s.tier === "expired" ? "Expired" : "Free"}
        </span>
      </div>
      {paid && (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Scans left</dt><dd className="mt-1 font-mono text-lg font-semibold">{s.left ?? 0}</dd></div>
          <div className="rounded-md bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Expires</dt><dd className="mt-1 font-mono text-sm font-semibold">{s.endsAt ? fmt(s.endsAt) : "—"}</dd><dd className="text-xs text-muted-foreground">{s.daysLeft} days left</dd></div>
        </dl>
      )}
      {s.tier !== "admin" && s.tier !== "lifetime" && (
        <Button asChild className="h-10 w-full"><Link to="/pass">{paid ? "Renew or add a pass" : s.tier === "expired" ? "Renew pass" : "See passes"}</Link></Button>
      )}
    </section>
  );
}
