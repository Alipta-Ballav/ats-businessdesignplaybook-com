import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { ResumeWorkspace, type WorkspaceSeed } from "./ResumeWorkspace";
import type { EditorSession } from "@/lib/editor-session";
import type { ResumeVersion } from "@/lib/career/db";

const mocks = vi.hoisted(() => ({ versions: [] as ResumeVersion[], power: true, save: vi.fn(), update: vi.fn(), invalidate: vi.fn(), back: vi.fn(), navigate: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: string[] }) => ({ data: options.queryKey[0] === "resume-versions" ? mocks.versions : { id: "owner" }, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
}));
vi.mock("@/lib/db", () => ({ q: { me: () => ({ queryKey: ["me"] }) } }));
vi.mock("@/lib/career/db", () => ({ careerQueries: { versions: () => ({ queryKey: ["resume-versions"] }) }, saveVersion: (...args: unknown[]) => mocks.save(...args), updateVersion: (...args: unknown[]) => mocks.update(...args) }));
vi.mock("@/lib/pro", () => ({ usePowerPass: () => mocks.power }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mocks.navigate, Link: ({ children }: { children: ReactNode }) => <span>{children}</span> }));
vi.mock("@/components/VariantUpsell", () => ({ VariantUpsell: () => <div>Upgrade required</div> }));
vi.mock("@/components/ResumeNameDialog", () => ({ ResumeNameDialog: ({ open, onSave }: { open: boolean; onSave: (name: string) => Promise<void> }) => open ? <button onClick={() => void onSave("FinTech variant")}>Confirm copy</button> : null }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: ReactNode }) => <select aria-label="Choose resume" value={value} onChange={(event) => onValueChange(event.target.value)}>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

const candidate = { id: "candidate", jobId: "job", name: "Designer", role: "Designer", years: 4, domain: "UX", mandatory: {}, competencies: {} };
const job: WorkspaceSeed["job"] = { id: "job", title: "Design baseline", func: "Design", seniority: "Senior", description: "", flexibility: 50, preset: "balanced", mandatory: [], preferred: [], weights: { JR: 40, FR: 35, HP: 25 }, createdAt: "2026-11-26" };
const session = (draft: string): EditorSession => ({ draft, fixes: [], skipped: [], history: [{ draft: "Master original", fixes: [], skipped: [] }], official: { cand: candidate, score: 61, text: "Master original" }, openId: null, fields: { action: "", constraint: "", outcome: "", text: "" }, aiDraft: null, proposal: "", writingManually: false, placement: "" });
function Draft({ initial, onChange }: { initial: string; onChange: (value: EditorSession) => void }) {
  const [value, setValue] = useState(initial);
  return <input aria-label="Draft text" value={value} onChange={(event) => { setValue(event.target.value); onChange(session(event.target.value)); }} />;
}
function Harness({ onBackToList }: { onBackToList?: (() => void) | undefined }) {
  return <ResumeWorkspace seed={{ resume: "Master original", cand: candidate, job }} versionId="master" onBackToList={onBackToList}>
    {({ editorKey, toolbar, initialSession, initialDraft, resume, job: activeJob, onSessionChange }) => <div>{toolbar}<output data-testid="target">{activeJob.description}</output><Draft key={editorKey} initial={initialSession?.draft ?? initialDraft ?? resume} onChange={onSessionChange} /></div>}
  </ResumeWorkspace>;
}
beforeEach(() => {
  mocks.back.mockReset(); mocks.navigate.mockReset();
  cleanup(); mocks.power = true; mocks.save.mockReset(); mocks.update.mockReset(); mocks.update.mockResolvedValue({ id: "master" }); mocks.invalidate.mockReset();
  mocks.save.mockResolvedValue({ id: "copy" }); mocks.invalidate.mockResolvedValue(undefined);
  mocks.versions = [
    { id: "variant", name: "Variant", resume_text: "Variant original", scored_text: "Variant original", candidate, job: { ...job, title: "FinTech designer", description: "Build payment experiences" }, level: "Senior Product Designer", user_id: "owner", created_at: "2026-11-26" },
    { id: "master", name: "Master", resume_text: "Master original", scored_text: "Master original", candidate, job, level: "Senior Product Designer", user_id: "owner", created_at: "2026-11-25" },
  ];
});
describe("Resume workspace", () => {
  it("returns to the list only after the active resume save succeeds", async () => {
    render(<Harness onBackToList={mocks.back} />);
    fireEvent.change(screen.getByLabelText("Draft text"), { target: { value: "Saved before returning" } });
    fireEvent.click(screen.getByRole("button", { name: "Save & back to list" }));
    await waitFor(() => expect(mocks.back).toHaveBeenCalledOnce());
    expect(mocks.update).toHaveBeenCalledWith("master", "Saved before returning", candidate, "Master original");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("stays in the editor when saving fails", async () => {
    mocks.update.mockRejectedValue(new Error("Save failed"));
    render(<Harness onBackToList={mocks.back} />);
    fireEvent.click(screen.getByRole("button", { name: "Save & back to list" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled());
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.back).not.toHaveBeenCalled();
  });
  it("exits same-page editing through Back to resumes without saving", () => {
    render(<Harness onBackToList={mocks.back} />);
    fireEvent.click(screen.getByRole("button", { name: "Back to resumes" }));
    expect(mocks.back).toHaveBeenCalledOnce();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("navigates to the list after saving from another screen", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Save & back to list" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/my-resumes" }));
  });
  it("keeps master and variant drafts separate while switching their target jobs", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Draft text"), { target: { value: "Master unsaved edit" } });
    fireEvent.change(screen.getByLabelText("Choose resume"), { target: { value: "variant" } });
    expect(screen.getByLabelText("Draft text")).toHaveValue("Variant original");
    expect(screen.getByTestId("target").textContent).toBe("Build payment experiences");
    fireEvent.change(screen.getByLabelText("Draft text"), { target: { value: "Variant unsaved edit" } });
    fireEvent.change(screen.getByLabelText("Choose resume"), { target: { value: "master" } });
    expect(screen.getByLabelText("Draft text")).toHaveValue("Master unsaved edit");
    expect(screen.getByTestId("target").textContent).toBe("");
    fireEvent.change(screen.getByLabelText("Choose resume"), { target: { value: "variant" } });
    expect(screen.getByLabelText("Draft text")).toHaveValue("Variant unsaved edit");
  });
  it("copies the active edited draft without changing the saved master or claiming a rescore", async () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Draft text"), { target: { value: "New user supplied evidence" } });
    fireEvent.click(screen.getByRole("button", { name: "Save as new variant" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm copy" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith("owner", "FinTech variant", "New user supplied evidence", candidate, job, "Master original", "Senior Product Designer"));
    expect(mocks.versions.find((version) => version.id === "master")?.resume_text).toBe("Master original");
  });
  it("saves edits back to the open resume without creating a copy", async () => {
    mocks.power = false;
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Draft text"), { target: { value: "Master saved edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("master", "Master saved edit", candidate, "Master original"));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("does not create a second resume without Power Searcher", () => {
    mocks.power = false;
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Save as new variant" }));
    expect(mocks.save).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Confirm copy" })).toBeNull();
    expect(screen.getByText("Upgrade required")).toBeInTheDocument();
  });
});