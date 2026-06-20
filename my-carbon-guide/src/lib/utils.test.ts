import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("utils cn", () => {
  it("merges tailwind classes correctly", () => {
    expect(cn("px-2", "py-2")).toBe("px-2 py-2");
    expect(cn("px-2 py-2", "px-4")).toBe("py-2 px-4");
    expect(cn("text-red-500", undefined, "text-lg")).toBe("text-red-500 text-lg");
  });
});
