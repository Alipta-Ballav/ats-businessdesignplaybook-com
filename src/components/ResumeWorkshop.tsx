import { useState } from "react";
import { Check, Copy, FilePenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildEvidenceBullet, inspectBullets, type BulletFinding } from "@/lib/diagnostics";

function BulletEditor({ finding }: { finding: BulletFinding }) {
  const [details, setDetails] = useState({ action: "", constraint: "", outcome: "" });
  const [copied, setCopied] = useState(false);
  const revised = buildEvidenceBullet(finding.original, details);
  return <details className="rounded-md border bg-card p-4">
    <summary className="cursor-pointer text-sm"><span className="font-medium break-words">{finding.original}</span><span className="mt-2 block text-xs text-muted-foreground">{finding.issues.join(" · ")}</span></summary>
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-3">{([
        ["action", "What you actually did", "Specific action, artifact or decision"],
        ["constraint", "Real constraint or trade-off", "Only something you encountered"],
        ["outcome", "Verified outcome or validation", "A result you can substantiate"],
      ] as const).map(([key, label, placeholder]) => <label key={key} className="text-xs font-medium">{label}<textarea rows={3} className="mt-1 w-full rounded-md border bg-background p-2 text-sm font-normal" placeholder={placeholder} value={details[key]} onChange={e => { setDetails({ ...details, [key]: e.target.value }); setCopied(false); }} /></label>)}</div>
      <div className="border-l-2 border-accent pl-3"><p className="text-xs text-muted-foreground">Revised bullet</p><p className="mt-1 break-words text-sm">{revised}</p></div>
      <Button variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(revised); setCopied(true); } catch { toast.error("Could not copy. Select the revised bullet instead."); } }}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy bullet"}</Button>
    </div>
  </details>;
}

export function ResumeWorkshop({ resume }: { resume: string }) {
  const findings = inspectBullets(resume);
  return <section className="space-y-4 border-y py-6">
    <div className="flex items-start gap-3"><FilePenLine className="mt-1 size-5 shrink-0" /><div><p className="font-mono text-xs uppercase text-muted-foreground">Practitioner evidence workshop</p><h2 className="mt-1 font-display text-2xl">Make the work behind the words visible</h2><p className="mt-2 text-sm text-muted-foreground">These checks flag vague claims, not AI authorship. Add only true details; no achievements or metrics are invented.</p></div></div>
    {findings.length ? <div className="space-y-3">{findings.map(f => <BulletEditor key={`${f.id}-${f.original}`} finding={f} />)}</div> : <p className="text-sm text-muted-foreground">No vague action claims found by these checks. That does not verify the resume’s accuracy.</p>}
  </section>;
}