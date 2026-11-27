import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ReportTabs, useQueueNavigation } from "./ReportTabs";

function Profile() {
  const open = useQueueNavigation();
  const [value, setValue] = useState("level");
  return <><input aria-label="Selected weighting" value={value} onChange={(e) => setValue(e.target.value)} /><button onClick={open}>Open queue</button></>;
}
afterEach(cleanup);
it("opens the queue and retains customised profile state when returning", async () => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 0; });
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const scroll = vi.fn();
  vi.stubGlobal("scrollTo", scroll);
  const rects = vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue({ length: 1 } as DOMRectList);
  render(<ReportTabs tabs={[{ id: "fix", label: "Fix", content: <h3 data-priority-queue tabIndex={-1}>Queue</h3> }, { id: "profile", label: "Profile", content: <Profile /> }]} />);
  fireEvent.click(screen.getByRole("tab", { name: "Profile" }));
  fireEvent.change(screen.getByLabelText("Selected weighting"), { target: { value: "research" } });
  fireEvent.click(screen.getByRole("button", { name: "Open queue" }));
  await waitFor(() => expect(screen.getByRole("tab", { name: "Fix" })).toHaveAttribute("aria-selected", "true"));
  expect(scroll).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("tab", { name: "Profile" }));
  expect(screen.getByLabelText("Selected weighting")).toHaveValue("research");
  rects.mockRestore();
  vi.unstubAllGlobals();
});