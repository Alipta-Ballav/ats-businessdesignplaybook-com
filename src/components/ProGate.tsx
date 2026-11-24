import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { usePro } from "@/lib/pro";

/** Renders the real Pro controls; when locked they are visible but inert, with an upgrade overlay. */
export function ProGate({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  const pro = usePro();
  if (pro) return <>{children}</>;
  return (
    <div className="relative rounded-md border p-4">
      <div aria-hidden inert className="pointer-events-none select-none opacity-40 blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 p-4 text-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
          <Lock className="h-3 w-3" /> Pro
        </span>
        <p className="font-medium">{title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">{blurb}</p>
        <button
          type="button"
          disabled
          className="mt-1 rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground opacity-60"
        >
          Upgrade to Pro · coming soon
        </button>
      </div>
    </div>
  );
}
