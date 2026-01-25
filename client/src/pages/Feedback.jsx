import { useNavigate } from "react-router-dom";
import { useInterview } from "../context/InterviewContext";
import "../styles/feedback.css";

const Feedback = () => {
  const navigate = useNavigate();
  const { results } = useInterview();

  return (
    <div className="feedback-page">
      <div className="feedback-container glass-card">

        {/* HEADER */}
        <h1 className="feedback-title">AI Interview Feedback</h1>
        <p className="feedback-subtitle">
          Personalized insights to help you improve
        </p>

        {/* AI SUMMARY */}
        <div className="ai-summary">
          <h2>Overall Feedback</h2>
          <p>
            You demonstrated a good understanding of the questions.
            Your answers were clear, but confidence and delivery can
            be improved with more structured responses and steady pace.
          </p>
        </div>

        {/* STRENGTHS & WEAKNESSES */}
        <div className="sw-grid">
          <div className="sw-card">
            <h3>Strengths</h3>
            <ul>
              <li>Clear answers</li>
              <li>Positive sentiment</li>
              <li>Relevant examples</li>
            </ul>
          </div>

          <div className="sw-card weak">
            <h3>Weaknesses</h3>
            <ul>
              <li>Low confidence</li>
              <li>Short answers</li>
              <li>Lack of structure</li>
            </ul>
          </div>
        </div>

        {/* SKILL TIPS */}
        <div className="skills-section">
          <h2>Skill Improvement Tips</h2>

          <div className="skills-grid">
            <Skill title="Confidence" tip="Maintain eye contact and avoid long pauses." />
            <Skill title="Communication" tip="Use STAR method while answering." />
            <Skill title="Clarity" tip="Structure answers with intro, body, conclusion." />
            <Skill title="Body Language" tip="Sit straight and use natural hand gestures." />
          </div>
        </div>

        {/* QUESTION FEEDBACK */}
        <div className="question-feedback">
          <h2>Question-wise Feedback</h2>

          {results?.questionScores?.map((q, i) => (
            <div key={i} className="question-feedback-card">
              <h4>Question {i + 1}</h4>
              <p><strong>What went well:</strong> Answer was relevant.</p>
              <p><strong>Needs improvement:</strong> Confidence and depth.</p>
              <p className="tip">
                👉 Try answering with more examples and calm tone.
              </p>
            </div>
          ))}
        </div>

        {/* ACTIONS */}
        <div className="feedback-actions">
          <button onClick={() => navigate("/scorecard")}>
            View ScoreCard
          </button>
          <button className="secondary" onClick={() => navigate("/interview")}>
            Retake Interview
          </button>
        </div>

      </div>
    </div>
  );
};

const Skill = ({ title, tip }) => (
  <div className="skill-card">
    <h3>{title}</h3>
    <p>{tip}</p>
  </div>
);

export default Feedback;
