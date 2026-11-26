import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadGuestScan, saveGuestEditor, saveGuestScan } from "./guest-scan";
import { loadEditorHandoff, stageEditorHandoff, type EditorSession } from "./editor-session";
import { createRewriteCache } from "./rewrite-cache";
import { revertFix } from "./editor";
import { PDF_PAGE, renderResumePdf } from "./export-pdf";
import { jsPDF } from "jspdf";
import { readFileSync } from "node:fs";

const resume = "Jane Doe\nEXPERIENCE\nDesigner | Acme | 2022 – Present\n- Designed a checkout.";
const changed = resume.replace("Designed a checkout.", "Designed a checkout, reducing drop-off 18%.");
const cand = { id: "guest", jobId: "guest", name: "Jane Doe", role: "Designer", years: 4, domain: "UX", mandatory: {}, competencies: {} };
const fix = { id: "checkout", title: "State impact", source: "manual" as const, added: "Designed a checkout, reducing drop-off 18%.", removed: "Designed a checkout.", edit: { before: resume, after: changed } };
const editor: EditorSession = {
  draft: changed, fixes: [fix], skipped: ["skip"], history: [{ draft: resume, fixes: [], skipped: [] }],
  official: { cand, score: 40, text: resume }, openId: "next",
  fields: { action: "Designed", constraint: "Budget", outcome: "18%", text: "" },
  aiDraft: null, proposal: "My next unfinished bullet", writingManually: true, placement: "section:2",
};

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.useRealTimers(); });
describe("guest account handoff", () => {
  it("preserves the original report, manual draft, fixes and undo without another scan", () => {
    saveGuestScan({ resume, jobId: null, jobTitle: "Future Talent Index", jobDescription: "", createdAt: new Date().toISOString(), evidence: { ...cand, requirements: [] } });
    const id = loadGuestScan()?.id;
    saveGuestEditor(loadGuestScan()?.createdAt ?? "", editor);
    const guest = loadGuestScan();
    expect(guest?.id).toBe(id);
    expect(guest?.resume).toBe(resume);
    expect(guest?.editor).toEqual(editor);
    stageEditorHandoff("saved-scan", editor);
    const restored = loadEditorHandoff("saved-scan");
    expect(restored?.proposal).toBe("My next unfinished bullet");
    expect(restored?.history[0]?.draft).toBe(resume);
    expect(revertFix(restored?.draft ?? "", fix)).toBe(resume);
    expect(loadEditorHandoff("different-scan")).toBeUndefined();
  });
  it("expires temporary guest and handoff copies after 24 hours", () => {
    vi.useFakeTimers();
    saveGuestScan({ resume, jobId: null, jobTitle: "Index", jobDescription: "", createdAt: new Date().toISOString(), evidence: { ...cand, requirements: [] } });
    stageEditorHandoff("saved", editor);
    vi.advanceTimersByTime(86400001);
    expect(loadGuestScan()).toBeNull();
    expect(loadEditorHandoff("saved")).toBeUndefined();
  });
});
describe("private exact-input rewrite cache", () => {
  it("reuses identical facts, changes on new facts and always regenerates explicitly", async () => {
    const cache = createRewriteCache();
    const generate = vi.fn().mockResolvedValueOnce("Original result").mockResolvedValueOnce("New fact result").mockResolvedValueOnce("Fresh result");
    const input = { original: "Designed checkout", facts: "18% drop-off reduction" };
    expect(await cache(input, generate)).toBe("Original result");
    expect(await cache(input, generate)).toBe("Original result");
    expect(await cache({ ...input, facts: "19% drop-off reduction" }, generate)).toBe("New fact result");
    expect(await cache(input, generate, true)).toBe("Fresh result");
    expect(generate).toHaveBeenCalledTimes(3);
  });
  it("never shares responses between editor sessions or caches errors", async () => {
    const cache = createRewriteCache();
    const input = { original: "Designed checkout", facts: "" };
    const generate = vi.fn().mockRejectedValueOnce(new Error("retry")).mockResolvedValue("Valid");
    await expect(cache(input, generate)).rejects.toThrow("retry");
    expect(await cache(input, generate)).toBe("Valid");
    expect(await createRewriteCache()(input, generate)).toBe("Valid");
    expect(generate).toHaveBeenCalledTimes(3);
  });
});
it("paginates selectable PDF text within fixed A4 bounds without dropping long bullets", () => {
  const pdf = new jsPDF({ unit: "pt", format: [PDF_PAGE.width, PDF_PAGE.height] });
  for (const weight of ["Regular", "Bold"]) {
    pdf.addFileToVFS(`${weight}.ttf`, readFileSync(`public/fonts/NotoSans-${weight}.ttf`).toString("base64"));
    pdf.addFont(`${weight}.ttf`, "NotoSans", weight === "Bold" ? "bold" : "normal");
  }
  const textSpy = vi.spyOn(pdf, "text");
  const bullets = Array.from({ length: 90 }, (_, i) => `- Delivered project ${i} with research and validation across a long enterprise design workflow.`);
  renderResumePdf(pdf, `Jane Doe\nEXPERIENCE\n${bullets.join("\n")}`);
  expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
  const rendered = textSpy.mock.calls.map(call => call[0]).join(" ");
  expect(rendered).toContain("project 0");
  expect(rendered).toContain("project 89");
  for (const call of textSpy.mock.calls) {
    expect(Number(call[1])).toBeGreaterThanOrEqual(PDF_PAGE.margin);
    expect(Number(call[2])).toBeLessThanOrEqual(PDF_PAGE.height - PDF_PAGE.margin);
  }
  expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(595.3, 1);
});