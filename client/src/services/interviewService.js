import { api } from "./api";
import { waitForScoring } from "./waitForScoring";

export const startInterview = ({ role, difficulty, questions }) =>
  api.post("/interview/start", { role, difficulty, questions });

// Resolves with the final score, waiting if the server scores in the background.
export const submitInterview = async (interviewId, answers) =>
  waitForScoring(await api.post(`/interview/${interviewId}/submit`, { answers }));

export const fetchHistory = () =>
  api.get("/interview/history");

export const fetchProgress = () =>
  api.get("/interview/progress");

export const fetchInterview = (interviewId) =>
  api.get(`/interview/${interviewId}`);