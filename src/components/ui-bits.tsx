import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-sm border bg-card p-6 shadow-sheet", className)}>{children}</div>
  );
}
export function ScoreRing({
  value,
  label,
  tone,
  info,
}: {
  value: number | null;
  label: string;
  tone: "jr" | "fr" | "hp" | "ink";
  info?: { question: string; definition: string; weight?: number; items: string[] };
}) {
  const color = { jr: "var(--jr)", fr: "var(--fr)", hp: "var(--hp)", ink: "var(--primary)" }[tone];
  const v = value ?? 0;
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative grid h-24 w-24 place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${v * 3.6}deg, var(--muted) 0)` }}
      >
        <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-card">
          <span className="font-mono text-xl">{value ?? "—"}</span>
        </div>
      </div>
      <span className="text-center text-xs text-muted-foreground">
        {info ? (
          <Popover>
            <PopoverTrigger
              className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:text-foreground"
              aria-label={`What is ${label}?`}
            >
              {label}
              <Info className="h-3 w-3" aria-hidden />
            </PopoverTrigger>
            <PopoverContent className="w-72 text-left text-sm">
              <p className="font-display text-base">{label}</p>
              <p className="mt-1 italic text-muted-foreground">{info.question}</p>
              <p className="mt-2">{info.definition}</p>
              {info.weight !== undefined && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Weight in overall score: <span className="font-mono text-foreground">{info.weight}%</span>
                </p>
              )}
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">What we look for</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                {info.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Scored only from quotes found in your resume.</p>
            </PopoverContent>
          </Popover>
        ) : (
          label
        )}
        {value === null && (
          <>
            <br />
            insufficient evidence
          </>
        )}
      </span>
    </div>
  );
}
export function Bar({ value, tone }: { value: number | null; tone: "jr" | "fr" | "hp" }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      {value !== null && (
        <div
          className="h-2 rounded-full"
          style={{ width: `${value}%`, background: `var(--${tone})` }}
        />
      )}
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Strong alignment"
      ? "bg-success/15 text-success"
      : status === "Promising transferable fit"
        ? "bg-accent text-accent-foreground"
        : status === "Significant gaps identified"
          ? "bg-destructive/10 text-destructive"
          : "bg-warning/15 text-foreground";
  return (
    <span className={cn("inline-block rounded px-2 py-0.5 text-xs font-medium", cls)}>
      {status}
    </span>
  );
}
