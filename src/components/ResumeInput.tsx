const input = "w-full rounded-md border bg-background px-3 py-2 text-sm";
export function ResumeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span>Resume text</span>
        <label className="cursor-pointer text-xs underline">Load a .txt file
          <input type="file" accept=".txt,.md,text/plain" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) onChange(await f.text()); }} />
        </label>
      </div>
      <textarea rows={12} className={input} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Paste your full resume here — experience, projects, skills, education…" />
      <p className="text-xs text-muted-foreground">Tip: open your PDF or Word resume, select all, copy and paste it here.</p>
    </div>
  );
}
