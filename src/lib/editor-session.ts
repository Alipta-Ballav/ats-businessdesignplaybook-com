import type { FixEntry } from "./editor";
import type { Candidate } from "./scoring";

export type EditorFix = FixEntry & { title: string };
export type EditorSnapshot = { draft: string; fixes: EditorFix[]; skipped: string[] };
export type EditorSession = EditorSnapshot & {
  history: EditorSnapshot[];
  official: { cand: Candidate; score: number; text: string };
  openId: string | null;
  fields: { action: string; constraint: string; outcome: string; text: string };
  aiDraft: { text: string; sources: string[]; manualFacts: string } | null;
  proposal: string;
  writingManually: boolean;
  placement: string;
  /** Unapplied work per recommendation id, kept while switching items or tabs. */
  parked?: Record<string, Pick<EditorSession, "fields" | "aiDraft" | "proposal" | "writingManually" | "placement">>;
};

/** Temporary, same-tab handoff only; never a general resume autosave. */
const KEY = "ft-editor-handoff";
export function stageEditorHandoff(scanId: string, editor: EditorSession) {
  sessionStorage.setItem(KEY, JSON.stringify({ scanId, editor, expires: Date.now() + 86400000 }));
}
export function loadEditorHandoff(scanId: string): EditorSession | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (!value || value.expires <= Date.now()) { sessionStorage.removeItem(KEY); return; }
    if (value.scanId === scanId && typeof value.editor?.draft === "string") return value.editor;
  } catch { sessionStorage.removeItem(KEY); }
  return undefined;
}
export function clearEditorHandoff() { sessionStorage.removeItem(KEY); }