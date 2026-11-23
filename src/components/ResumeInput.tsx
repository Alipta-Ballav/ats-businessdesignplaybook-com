import { useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrivacySeal } from "@/components/trust/Trust";
const input = "w-full rounded-md border bg-background px-3 py-2 text-sm";

async function readFile(f: File): Promise<string> {
  const name = f.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent();
      let line = ""; const lines: string[] = [];
      for (const it of tc.items as { str?: string; hasEOL?: boolean }[]) { line += it.str ?? ""; if (it.hasEOL) { lines.push(line); line = ""; } }
      if (line) lines.push(line);
      pages.push(lines.join("\n"));
    }
    return pages.join("\n\n");
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value;
  }
  if (name.endsWith(".doc")) throw new Error("Old .doc files aren't supported. Save as .docx or PDF.");
  return f.text();
}

export function ResumeInput({ value, onChange, compact = false }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  const [file, setFile] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [paste, setPaste] = useState(false); const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const load = async (f: File) => {
    setBusy(true); setErr("");
    try {
      const t = (await readFile(f)).replace(/\n{3,}/g, "\n\n").trim();
      if (t.length < 50) throw new Error("We couldn't find text in that file. It may be a scanned image — try exporting a text PDF.");
      onChange(t); setFile(f.name); setPaste(false);
    } catch (x) { setErr(x instanceof Error ? x.message : "Couldn't read that file."); } finally { setBusy(false); }
  };
  const fileInput = <input ref={picker} aria-label="Upload resume file" type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void load(f); }} />;
  if (compact) return <div className="space-y-2 text-sm">
    {fileInput}
    {paste ? <textarea aria-label="Resume text" className={`${input} h-24 resize-none leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring sm:h-32`} value={value} onChange={(e) => { onChange(e.target.value); setFile(null); }} placeholder="Paste your full resume here…" /> :
      <div onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f && !busy) void load(f); }} className={`flex h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 text-center transition-colors sm:h-32 sm:gap-2 ${dragging ? "border-primary bg-accent" : value ? "border-success/40 bg-success/5" : "border-input bg-muted/30"}`}>
        {busy ? <><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="text-sm font-medium">Reading your resume…</p></> : value ? <>
          <CheckCircle2 className="h-6 w-6 text-success" />
          <p className="w-full truncate text-sm font-medium" title={file ?? "Pasted resume"}>{file ?? "Pasted resume"}</p>
          <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{words} words</span><Button size="sm" variant="ghost" onClick={() => picker.current?.click()}>Change file</Button><Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Remove resume" onClick={() => { onChange(""); setFile(null); setErr(""); }}><X /></Button></div>
        </> : <>
          <Upload className="h-5 w-5 text-primary" />
          <Button variant="ghost" size="sm" onClick={() => picker.current?.click()}>Choose a file or drop it here</Button>
          <p className="text-xs text-muted-foreground">PDF, Word (.docx) or text</p>
        </>}
      </div>}
    <div className="flex min-h-8 items-center justify-between gap-2">
      <Button size="sm" variant="link" className="h-7 px-0 text-xs" disabled={busy} onClick={() => setPaste(!paste)}><FileText />{paste ? "Back to file upload" : value ? "Review or edit text" : "Or paste resume text"}</Button>
      {paste && <span className="text-xs text-muted-foreground">{words} words</span>}
    </div>
    {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
    <PrivacySeal />
  </div>;
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span>Resume</span>
        {fileInput}<Button size="sm" variant="outline" disabled={busy} onClick={() => picker.current?.click()}>{busy ? "Reading…" : "Upload PDF or Word"}</Button>
      </div>
      {file && <p className="text-xs text-muted-foreground">Loaded <span className="font-medium text-foreground">{file}</span> · {words} words. Review the text below before checking.</p>}
      {err && <p className="text-xs text-destructive">{err}</p>}
      <textarea rows={12} className={input} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Upload a PDF/Word file or paste your full resume here…" />
      <PrivacySeal />
    </div>
  );
}
