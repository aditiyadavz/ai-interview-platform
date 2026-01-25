import { useNavigate } from "react-router-dom";
import { useInterview } from "../context/InterviewContext";
import "../styles/scorecard.css";

const ScoreCard = () => {
  const navigate = useNavigate();
  const { results } = useInterview();

  const score = results?.totalScore ?? 0;

  const verdict =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Improvement";

  return (
    <div className="scorecard-page">
      <div className="scorecard-container glass-card">

        {/* HEADER */}
        <h1 className="score-title">Interview Score Card</h1>
        <p className="score-subtitle">AI Performance Evaluation</p>

        {/* OVERALL SCORE */}
        <div className="overall-section">
          <div
            className="score-ring"
            style={{ "--score": `${score}%` }}
          >
            <span>{score}%</span>
          </div>

          <div className={`verdict ${verdict.toLowerCase().replace(" ", "-")}`}>
            {verdict}
          </div>
        </div>

        {/* SKILL METRICS */}
        <div className="metrics-grid">
          <Metric title="Confidence" value={results?.confidence ?? 0} />
          <Metric title="Sentiment" value={results?.sentiment ?? 0} />
          <Metric title="Clarity" value={results?.clarity ?? 0} />
          <Metric title="Communication" value={results?.communication ?? 0} />
        </div>

        {/* QUESTION BREAKDOWN */}
        <div className="question-section">
          <h2>Question-wise Analysis</h2>

          {results?.questionScores?.map((q, i) => (
            <div key={i} className="question-card">
              <h4>Question {i + 1}</h4>

              <div className="bar">
                <span>Confidence</span>
                <div className="progress">
                  <div style={{ width: `${q.confidence}%` }} />
                </div>
              </div>

              <div className="bar">
                <span>Sentiment</span>
                <div className="progress">
                  <div style={{ width: `${q.sentiment}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ACTIONS */}
        <div className="actions">
          <button onClick={() => navigate("/feedback")}>View Feedback</button>
          <button className="secondary" onClick={() => navigate("/interview")}>
            Retake Interview
          </button>
        </div>

      </div>
    </div>
  );
};

const Metric = ({ title, value }) => (
  <div className="metric-card">
    <h3>{value}%</h3>
    <p>{title}</p>
  </div>
);

export default ScoreCard;
