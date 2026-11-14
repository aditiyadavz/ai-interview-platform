import { describe, it, expect, vi } from "vitest";
import { waitForScoring } from "./waitForScoring";

const noWait = () => Promise.resolve();

describe("waitForScoring", () => {
  it("returns an inline (already scored) result untouched without polling", async () => {
    const get = vi.fn();
    const result = { status: "done", totalScore: 80 };
    expect(await waitForScoring(result, { get, wait: noWait })).toBe(result);
    expect(get).not.toHaveBeenCalled();
  });

  it("polls the result endpoint until scoring is done", async () => {
    const get = vi.fn()
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValueOnce({ status: "done", totalScore: 72 });

    const result = await waitForScoring({ status: "pending", interviewId: "abc" }, { get, wait: noWait });

    expect(result).toEqual({ status: "done", totalScore: 72 });
    expect(get).toHaveBeenCalledTimes(3);
    expect(get).toHaveBeenCalledWith("/interview/abc/result");
  });

  it("throws the server's message when scoring failed", async () => {
    const get = vi.fn().mockResolvedValue({ status: "failed", message: "Scoring failed — please submit again." });
    await expect(
      waitForScoring({ status: "pending", interviewId: "abc" }, { get, wait: noWait })
    ).rejects.toThrow("Scoring failed — please submit again.");
  });

  it("backs off between polls, up to the max delay", async () => {
    const delays = [];
    const wait = (ms) => { delays.push(ms); return Promise.resolve(); };
    const get = vi.fn()
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValueOnce({ status: "done" });

    await waitForScoring(
      { status: "pending", interviewId: "abc" },
      { get, wait, initialDelayMs: 1000, maxDelayMs: 2000 }
    );
    expect(delays).toEqual([1000, 1500, 2000, 2000]);
  });

  it("gives up with a helpful message after the timeout", async () => {
    const get = vi.fn().mockResolvedValue({ status: "pending" });
    await expect(
      waitForScoring({ status: "pending", interviewId: "abc" }, { get, wait: noWait, timeoutMs: -1 })
    ).rejects.toThrow(/answers are saved/);
  });
});
