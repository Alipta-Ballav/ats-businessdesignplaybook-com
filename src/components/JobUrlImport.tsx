import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { importJobFromUrl } from "@/lib/job-import.functions";

export function JobUrlImport({ onImport }: { onImport: (title: string, description: string) => void }) {
  const [url, setUrl] = useState(""); const [busy, setBusy] = useState(false);
  const run = useServerFn(importJobFromUrl);
  const go = async () => {
    setBusy(true);
    try {
      const r = await run({ data: { url } });
      if ("error" in r) toast.error(r.error);
      else { onImport(r.company ? `${r.title} · ${r.company}` : r.title, r.description); toast.success("Job details filled in"); setUrl(""); }
    } catch { toast.error("That doesn't look like a valid link."); }
    setBusy(false);
  };
  return (
    <div className="block text-sm">Job link (LinkedIn, Greenhouse, Lever, Ashby…)
      <div className="mt-1 flex gap-2">
        <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.linkedin.com/jobs/view/…" />
        <button type="button" disabled={busy || !url.trim()} onClick={go} className="shrink-0 rounded-md border px-3 py-2 text-sm disabled:opacity-40">{busy ? "Reading…" : "Import"}</button>
      </div>
    </div>
  );
}
