import { describe, it, expect } from "vitest";
import { analyzeAnswer } from "./analyzeAnswer";

const STRONG_ANSWER = `
  In my experience I designed and implemented a caching layer using Redis for our REST API.
  The challenge was high database latency under load. First, I profiled the slowest SQL queries.
  Second, I added a cache with a short TTL because most reads were repeated. For example, the
  product listing endpoint went from 400ms to 40ms. As a result we reduced database load and
  improved scalability. I also wrote unit and integration tests and deployed it through our CI
  pipeline with Docker. In conclusion, I believe the approach balanced performance and
  consistency, and I led the review with the team to share what we learned about the architecture.
`;

describe("analyzeAnswer", () => {
  it("returns all-zero numeric metrics for empty input", () => {
    expect(analyzeAnswer("")).toEqual({ score: 0, confidence: 0, clarity: 0, sentiment: 0 });
    expect(analyzeAnswer()).toEqual({ score: 0, confidence: 0, clarity: 0, sentiment: 0 });
    expect(analyzeAnswer("  ")).toEqual({ score: 0, confidence: 0, clarity: 0, sentiment: 0 });
  });

  it("always returns numbers in 0-100 (the server rejects anything else)", () => {
    for (const text of ["ok", "um uh like yeah", STRONG_ANSWER, "word ".repeat(1000)]) {
      const result = analyzeAnswer(text);
      for (const value of Object.values(result)) {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });

  it("scores a detailed, structured answer well above a vague one", () => {
    const strong = analyzeAnswer(STRONG_ANSWER);
    const vague = analyzeAnswer("I think it is a thing that you use sometimes in code");
    expect(strong.score).toBeGreaterThan(70);
    expect(strong.score).toBeGreaterThan(vague.score + 30);
  });

  it("gives at least 10 to any answer of 8+ words", () => {
    expect(analyzeAnswer("this answer has exactly eight words in it").score).toBeGreaterThanOrEqual(10);
  });

  it("rates clarity lower for filler-heavy answers", () => {
    const filler = analyzeAnswer("um uh like basically um you know uh like yeah hmm so well okay");
    const clean = analyzeAnswer(STRONG_ANSWER);
    expect(filler.clarity).toBeLessThan(clean.clarity);
  });
});
