import { ArrowUpRight, GraduationCap } from "lucide-react";

export const COURSE_URL = "https://businessdesignplaybook.com/";

/** Cross-sell placement for the owner's Business Design Playbook course. */
export function BusinessPlaybook(_: { resume?: string }) {
  return (
    <a
      href={COURSE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-wrap items-center justify-between gap-5 rounded-xl border border-primary/40 bg-primary/5 p-6 transition-colors hover:bg-primary/10"
    >
      <div className="flex items-start gap-4">
        <span className="rounded-lg bg-primary p-2.5 text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Recommended course · Design Shots
          </p>
          <p className="font-display text-xl">Business Design Playbook</p>
          <p className="max-w-xl text-sm text-muted-foreground">
            Great products don't fail on UX. They fail on economics. Learn pricing, cash and growth,
            and present your impact with numbers. 8 modules · under 2 hours · Module 01 free · ₹999
            full course.
          </p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
        Start Module 01 free{" "}
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </a>
  );
}
