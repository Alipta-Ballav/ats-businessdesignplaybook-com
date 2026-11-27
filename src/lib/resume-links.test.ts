import { describe, expect, it } from "vitest";
import { linkSegments, linksFromHtml } from "./resume-links";

describe("resume links", () => {
  it("links written URLs and emails exactly as written", () => {
    const s = linkSegments("jane@x.com | www.jane.design | https://linkedin.com/in/jane.");
    expect(s.filter((p) => p.url).map((p) => [p.text, p.url])).toEqual([
      ["jane@x.com", "mailto:jane@x.com"],
      ["www.jane.design", "https://www.jane.design"],
      ["https://linkedin.com/in/jane", "https://linkedin.com/in/jane"],
    ]);
    expect(s.map((p) => p.text).join("")).toBe("jane@x.com | www.jane.design | https://linkedin.com/in/jane.");
  });
  it("keeps hidden link targets from the upload for their labels", () => {
    const links = linksFromHtml('<p><a href="https://jane.design/work">Portfolio</a></p>');
    const s = linkSegments("Portfolio · Case studies", links);
    expect(s[0]).toEqual({ text: "Portfolio", url: "https://jane.design/work" });
    expect(s.filter((p) => p.url)).toHaveLength(1);
  });
  it("adds no link to plain text", () => {
    expect(linkSegments("Led a design system").every((p) => !p.url)).toBe(true);
  });
});
