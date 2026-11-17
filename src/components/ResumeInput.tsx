import { useState } from "react";
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

export function ResumeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [file, setFile] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span>Resume</span>
        <label className="cursor-pointer rounded-md border px-2 py-1 text-xs">{busy ? "Reading…" : "Upload PDF or Word"}
          <input type="file" accept=".pdf,.docx,.doc,.txt,.md" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
            setBusy(true); setErr("");
            try { const t = (await readFile(f)).replace(/\n{3,}/g, "\n\n").trim(); if (t.length < 50) throw new Error("We couldn't find text in that file. It may be a scanned image — try exporting a text PDF."); onChange(t); setFile(f.name); }
            catch (x) { setErr(x instanceof Error ? x.message : "Couldn't read that file."); } finally { setBusy(false); }
          }} />
        </label>
      </div>
      {file && <p className="text-xs text-muted-foreground">Loaded <span className="font-medium text-foreground">{file}</span> · {words} words. Review the text below before checking.</p>}
      {err && <p className="text-xs text-destructive">{err}</p>}
      <textarea rows={12} className={input} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Upload a PDF/Word file or paste your full resume here…" />
    </div>
  );
}
