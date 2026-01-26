import { useNavigate } from "react-router-dom";
import "../styles/interviewHistory.css";

const InterviewHistory = () => {
  const navigate = useNavigate();

  const interviews = [
    {
      id: 1,
      role: "Frontend Developer",
      roleKey: "frontend",
      date: "12 Jan 2026",
      score: 78,
      verdict: "Good",
    },
    {
      id: 2,
      role: "Backend Developer",
      roleKey: "backend",
      date: "08 Jan 2026",
      score: 84,
      verdict: "Excellent",
    },
  ];

  return (
    <div className="history-page">
      {/* HEADER */}
      <div className="history-hero">
        <h1>Interview History</h1>
        <p>Track and review all your previous interview attempts</p>
      </div>

      {/* CONTENT */}
      <div className="history-card glass-card">
        <div className="history-table-head">
          <span>Role</span>
          <span>Date</span>
          <span>Score</span>
          <span>Verdict</span>
          <span>Action</span>
        </div>

        {interviews.map((item) => (
          <div key={item.id} className="history-table-row">
            <span>{item.role}</span>
            <span>{item.date}</span>

            <span className="score">{item.score}%</span>

            <span className={`verdict ${item.verdict.toLowerCase()}`}>
              {item.verdict}
            </span>

            <button
              onClick={() => navigate(`/scorecard/${item.roleKey}`)}
            >
              View Scorecard
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InterviewHistory;
