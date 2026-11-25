import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

// PrivacySeal renders a router <Link>; stub it so the box can be rendered standalone.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

import { ResumeInput } from "@/components/ResumeInput";

type ReactNode = import("react").ReactNode;

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <ResumeInput compact value={value} onChange={setValue} />;
}

const LONG_TEXT = "ux designer with eight years of design systems and research experience. ".repeat(
  4,
);

describe("Resume input status labels", () => {
  it("labels typed text honestly and offers Edit text / Clear", () => {
    render(<Harness initial={LONG_TEXT} />);

    expect(screen.getByText("Resume text entered")).toBeInTheDocument();
    expect(screen.getByText(/typed or pasted/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit text" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();

    expect(screen.queryByText("Pasted resume")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change file" })).not.toBeInTheDocument();
  });

  it("labels an uploaded file with its real name and offers Replace file / Remove", async () => {
    render(<Harness />);

    // jsdom's File lacks .text(), and the component only needs these two members.
    const file = { name: "my-resume.txt", text: async () => LONG_TEXT } as unknown as File;
    const input = screen.getByLabelText("Upload resume file") as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => expect(screen.getByText("my-resume.txt")).toBeInTheDocument());

    expect(screen.getByText(/from your file/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace file" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(screen.queryByText("Resume text entered")).not.toBeInTheDocument();
  });

  it("toggles the paste editor with Done editing and keeps the honest label", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /paste resume text instead/ }));

    const box = screen.getByRole("textbox", { name: "Resume text" });
    expect(screen.getByRole("button", { name: "Done editing" })).toBeInTheDocument();

    fireEvent.change(box, { target: { value: LONG_TEXT } });

    fireEvent.click(screen.getByRole("button", { name: "Done editing" }));

    expect(screen.queryByRole("textbox", { name: "Resume text" })).not.toBeInTheDocument();
    expect(screen.getByText("Resume text entered")).toBeInTheDocument();
    expect(screen.getByText(/typed or pasted/)).toBeInTheDocument();
  });
});
