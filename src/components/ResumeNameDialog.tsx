import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ResumeNameDialog({ open, onOpenChange, title, sourceName, takenNames = [], onSave }: {
  open: boolean;
  takenNames?: string[];
  onOpenChange: (open: boolean) => void;
  title: string;
  sourceName: string;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const taken = takenNames.some((n) => n.trim().toLowerCase() === name.trim().toLowerCase());
  return <Dialog open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{sourceName ? `Copy of ${sourceName}. Your original stays unchanged, including its target job.` : "Keep your baseline resume in your private account."}</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        if (!name.trim() || busy || taken) return;
        setBusy(true);
        try { await onSave(name.trim()); setName(""); onOpenChange(false); }
        catch { /* The caller shows the save error; keep the name for retry. */ }
        finally { setBusy(false); }
      }}>
        <label className="block space-y-2 text-sm">
          <span>Resume name</span>
          <Input autoFocus maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder={sourceName ? "e.g. FinTech Product Designer" : "e.g. My master resume"} />
        </label>
        {taken && <p role="status" className="text-xs text-destructive">You already have a resume with this name. Choose a different name.</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={busy || !name.trim() || taken}>{busy ? "Saving…" : title}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}