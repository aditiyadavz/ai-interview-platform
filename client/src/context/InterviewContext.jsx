import { createContext, useContext, useState } from "react";

const InterviewContext = createContext();

const QUESTIONS_MAP = {
  frontend: [
    "Tell me about yourself",
    "What are your strengths?",
    "Explain a challenging project you worked on",
    "Why should we hire you?",
  ],
  backend: [
    "Explain REST API",
    "What is JWT authentication?",
    "SQL vs NoSQL",
    "Explain middleware",
  ],
};

export const InterviewProvider = ({ children }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [scores, setScores] = useState([]);
  const [finished, setFinished] = useState(false);

  const startInterview = (role) => {
    setQuestions(QUESTIONS_MAP[role] || []);
    setCurrentIndex(0);
    setAnswers([]);
    setScores([]);
    setFinished(false);
  };

  const nextQuestion = (answer, score) => {
    setAnswers((a) => [...a, answer]);
    setScores((s) => [...s, score]);

    setCurrentIndex((i) => {
      if (i < questions.length - 1) return i + 1;
      setFinished(true);
      return i;
    });
  };

  // ✅ SCORECARD DATA (THIS WAS MISSING)
  const totalScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  const results = {
    totalScore,
    confidence: totalScore,
    sentiment: Math.max(totalScore - 10, 0),
    clarity: Math.max(totalScore - 5, 0),
    communication: Math.max(totalScore - 8, 0),
    questionScores: scores.map((s) => ({
      confidence: s,
      sentiment: Math.max(s - 10, 0),
    })),
  };

  return (
    <InterviewContext.Provider
      value={{
        questions,
        currentIndex,
        nextQuestion,
        finished,
        startInterview,
        answers,
        scores,
        results, // ✅ REQUIRED BY SCORECARD
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => useContext(InterviewContext);
