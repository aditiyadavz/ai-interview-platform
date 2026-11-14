import { describe, it, expect } from "vitest";
import { formatStat } from "./formatStat";

describe("formatStat", () => {
  it("shows 0 for zero, negative or invalid input", () => {
    expect(formatStat(0)).toBe("0");
    expect(formatStat(-5)).toBe("0");
    expect(formatStat("abc")).toBe("0");
    expect(formatStat(undefined)).toBe("0");
  });

  it("shows small counts as-is with a plus", () => {
    expect(formatStat(1)).toBe("1+");
    expect(formatStat(9)).toBe("9+");
  });

  it("always rounds DOWN so stats are never inflated", () => {
    expect(formatStat(12)).toBe("10+");
    expect(formatStat(99)).toBe("90+");
    expect(formatStat(137)).toBe("100+");
    expect(formatStat(1450)).toBe("1000+");
    expect(formatStat(25000)).toBe("20000+");
  });

  it("accepts numeric strings", () => {
    expect(formatStat("42")).toBe("40+");
  });
});
