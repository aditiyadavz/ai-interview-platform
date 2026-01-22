import { useEffect } from "react";
import { speak } from "../../utils/speak";
import "../../styles/interview.css";

const QuestionCard = ({ question }) => {
  useEffect(() => {
    speak(question);
  }, [question]);

  return (
    <div className="glass-card">
      <h3>Question</h3>
      <p>{question}</p>
    </div>
  );
};

export default QuestionCard;
