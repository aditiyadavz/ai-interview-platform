import { api } from "./api";
import { waitForScoring } from "./waitForScoring";

export const startResumeInterview = () =>
  api.post("/resume-interview/start", {});

// Resolves with the final score, waiting if the server scores in the background.
export const submitResumeInterview = async (interviewId, { answers, proctor }) =>
  waitForScoring(await api.post(`/resume-interview/${interviewId}/submit`, { answers, proctor }));