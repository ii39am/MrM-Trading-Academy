import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-navigation";

describe("safe post-authentication navigation", () => {
  it("preserves valid internal paths", () => {
    expect(safeNextPath("/admin/sales?status=PENDING")).toBe(
      "/admin/sales?status=PENDING",
    );
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/\\evil.example/steal",
    "javascript:alert(1)",
    "/admin\nLocation: https://evil.example",
  ])("rejects an unsafe return path: %s", (value) => {
    expect(safeNextPath(value)).toBe("/dashboard");
  });
});
