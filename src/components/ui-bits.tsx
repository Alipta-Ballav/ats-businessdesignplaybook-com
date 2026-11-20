import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-sm border bg-card p-6 shadow-sheet", className)}>{children}</div>;
}
export function ScoreRing({ value, label, tone }: { value: number | null; label: string; tone: "jr" | "fr" | "hp" | "ink" }) {
  const color = { jr: "var(--jr)", fr: "var(--fr)", hp: "var(--hp)", ink: "var(--primary)" }[tone];
  const v = value ?? 0;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative grid h-24 w-24 place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${v * 3.6}deg, var(--muted) 0)` }}>
        <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-card">
          <span className="font-mono text-xl">{value ?? "—"}</span>
        </div>
      </div>
      <span className="text-center text-xs text-muted-foreground">{label}{value === null && <><br />insufficient evidence</>}</span>
    </div>
  );
}
export function Bar({ value, tone }: { value: number | null; tone: "jr" | "fr" | "hp" }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      {value !== null && <div className="h-2 rounded-full" style={{ width: `${value}%`, background: `var(--${tone})` }} />}
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const cls = status === "Strong alignment" ? "bg-success/15 text-success"
    : status === "Promising transferable fit" ? "bg-accent text-accent-foreground"
    : status === "Significant gaps identified" ? "bg-destructive/10 text-destructive"
    : "bg-warning/15 text-foreground";
  return <span className={cn("inline-block rounded px-2 py-0.5 text-xs font-medium", cls)}>{status}</span>;
}
