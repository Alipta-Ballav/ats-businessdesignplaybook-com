import { describe, it, expect } from "vitest";
import { Packer } from "docx";
import { classifyImages, fitBox, MAX_VISUALS } from "./resume-images";
import { resumeToDocx } from "./export-docx";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const img = (w: number, h: number, page = 1, top = 0.5) => ({ src: PNG, w, h, page, top });

describe("resume images", () => {
  it("drops slivers and dividers", () => {
    expect(classifyImages([img(600, 2), img(10, 10), img(800, 40)]).visuals).toHaveLength(0);
  });
  it("picks a near-square top-of-page-1 image as headshot", () => {
    const r = classifyImages([img(200, 200, 1, 0.05), img(400, 300)]);
    expect(r.headshot?.w).toBe(200);
    expect(r.visuals).toHaveLength(1);
  });
  it("caps portfolio visuals", () => {
    expect(classifyImages(Array.from({ length: 9 }, () => img(400, 300))).visuals).toHaveLength(MAX_VISUALS);
  });
  it("fits without stretching or exceeding the box", () => {
    expect(fitBox(2000, 1000, 300, 200)).toEqual({ w: 300, h: 150 });
    expect(fitBox(50, 50, 115, 115)).toEqual({ w: 50, h: 50 });
  });
  it("exports a valid docx with headshot and visuals", async () => {
    const buf = await Packer.toBuffer(
      resumeToDocx("Jane\nDesigner\nEXPERIENCE\n- Led", {
        headshot: { src: PNG, w: 100, h: 100 },
        visuals: [{ src: PNG, w: 400, h: 300 }],
        on: true,
      }),
    );
    expect(buf.subarray(0, 2).toString()).toBe("PK");
  });
});
