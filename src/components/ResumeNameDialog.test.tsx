import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ResumeNameDialog } from "./ResumeNameDialog";

describe("ResumeNameDialog", () => {
  it("blocks a name you already use, ignoring case", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ResumeNameDialog open onOpenChange={() => {}} title="Create role variant" sourceName="My master" takenNames={["Design Engineer"]} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Resume name"), { target: { value: "design engineer" } });
    expect(screen.getByRole("button", { name: "Create role variant" })).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("Resume name"), { target: { value: "FinTech Designer" } });
    fireEvent.click(screen.getByRole("button", { name: "Create role variant" }));
    expect(onSave).toHaveBeenCalledWith("FinTech Designer");
  });
});
