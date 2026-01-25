import { createContext, useContext, useState } from "react";

const InterviewContext = createContext();

const ROLE_QUESTIONS = {
  frontend: [
    "Explain Virtual DOM in React",
    "Props vs State",
    "How does useEffect work?",
    "CSS Flexbox vs Grid",
  ],
  backend: [
    "What is REST API?",
    "Explain middleware",
    "What is JWT authentication?",
    "SQL vs NoSQL",
  ],
  fullstack: [
    "Explain MERN stack",
    "How does auth work end-to-end?",
    "What is CORS?",
    "REST vs GraphQL",
  ],
  hr: [
    "Tell me about yourself",
    "Your strengths?",
    "A challenging project?",
    "Why should we hire you?",
  ],
};

export const InterviewProvider = ({ children }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [scores, setScores] = useState([]);
  const [finished, setFinished] = useState(false);

  const startInterview = (role) => {
    setQuestions(ROLE_QUESTIONS[role] || ROLE_QUESTIONS.hr);
    setCurrentIndex(0);
    setAnswers([]);
    setScores([]);
    setFinished(false);
  };

  const nextQuestion = (answer, score) => {
    setAnswers((prev) => [...prev, answer]);
    setScores((prev) => [...prev, score]);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setFinished(true);
    }
  };

  return (
    <InterviewContext.Provider
      value={{
        questions,
        currentIndex,
        answers,
        scores,
        finished,
        startInterview,
        nextQuestion,
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => useContext(InterviewContext);
