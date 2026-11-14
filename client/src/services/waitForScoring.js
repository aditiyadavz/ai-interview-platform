import { api } from "./api";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * When the server scores in the background it answers a submit with
 * { status: "pending" }. This polls GET /interview/:id/result until the score
 * is ready, so callers always get the final result, whichever mode the
 * server runs in. Polling starts fast and slows down to spare the API.
 */
export const waitForScoring = async (
  submitResponse,
  { timeoutMs = 120_000, initialDelayMs = 1000, maxDelayMs = 4000, get = api.get, wait = sleep } = {}
) => {
  if (submitResponse?.status !== "pending") return submitResponse; // scored inline

  const { interviewId } = submitResponse;
  const deadline = Date.now() + timeoutMs;
  let delay = initialDelayMs;

  while (Date.now() < deadline) {
    await wait(delay);
    const result = await get(`/interview/${interviewId}/result`);
    if (result.status === "done") return result;
    if (result.status === "failed") throw new Error(result.message || "Scoring failed — please try again.");
    delay = Math.min(maxDelayMs, Math.round(delay * 1.5));
  }
  throw new Error("Scoring is taking longer than usual — your answers are saved, check Interview History shortly.");
};
