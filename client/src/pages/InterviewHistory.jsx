import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/interviewHistory.css";

const InterviewHistory = () => {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([
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
  ]);

  const [stats, setStats] = useState({
    total: 0,
    avgScore: 0,
    bestRole: "-",
    lastDate: "-",
  });

  useEffect(() => {
    if (interviews.length === 0) return;

    const total = interviews.length;
    const avgScore = Math.round(
      interviews.reduce((sum, i) => sum + i.score, 0) / total
    );

    const roleMap = {};
    interviews.forEach((i) => {
      roleMap[i.role] = roleMap[i.role] || [];
      roleMap[i.role].push(i.score);
    });

    let bestRole = "-";
    let bestAvg = 0;

    Object.keys(roleMap).forEach((role) => {
      const avg =
        roleMap[role].reduce((a, b) => a + b, 0) / roleMap[role].length;

      if (avg > bestAvg) {
        bestAvg = avg;
        bestRole = role;
      }
    });

    setStats({
      total,
      avgScore,
      bestRole,
      lastDate: interviews[interviews.length - 1].date,
    });
  }, [interviews]);

  // Optional icons for stats cards
  const statIcons = ["📝", "📊", "🎯", "📅"];

  return (
    <div className="history-page">
      <div className="history-hero">
        <h1>Interview History</h1>
        <p>Track and review all your previous interview attempts</p>
      </div>

      {/* STATS CARDS */}
      <div className="history-stats-cards">
        {[
          { label: "Total Interviews", value: stats.total },
          { label: "Average Score", value: `${stats.avgScore}%` },
          { label: "Best Role", value: stats.bestRole },
          { label: "Last Interview", value: stats.lastDate },
        ].map((stat, idx) => (
          <div key={idx} className="dashboard-card primary stat-card">
            <div className="stat-icon">{statIcons[idx]}</div>
            <h2>{stat.value}</h2>
            <p>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* INTERVIEW TABLE */}
      <div className="history-card glass-card">
        <div className="history-table-head">
          <span>Role</span>
          <span>Date</span>
          <span>Score</span>
          <span>Verdict</span>
          <span>Action</span>
        </div>

        {interviews.length === 0 ? (
          <p className="empty-state">
            No interviews yet — start your first AI interview 🚀
          </p>
        ) : (
          interviews.map((item) => (
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
          ))
        )}
      </div>
    </div>
  );
};

export default InterviewHistory;
