import { describe, expect, it } from "vitest";
import { formatBuildLabel } from "./version.ts";

describe("formatBuildLabel", () => {
  it("prefixes v and appends the revision", () => {
    expect(formatBuildLabel("0.0.0", "d143e26")).toBe("v0.0.0 · d143e26");
  });

  it("does not double the v prefix", () => {
    expect(formatBuildLabel("v1.2.3")).toBe("v1.2.3");
  });
});
