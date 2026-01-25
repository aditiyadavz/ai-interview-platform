import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Loader from "../components/common/Loader";
import "../styles/Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.name) setUserName(user.name);
  }, []);

  const handleLogout = () => {
    setLoading(true);

    setTimeout(() => {
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
      navigate("/login");
    }, 800);
  };

  return (
    <>
      {loading && <Loader text="Logging you out..." />}

      <div className="dashboard-container">
        {/* HERO */}
        <div className="dashboard-hero">
          <h1>Welcome, {userName || "Candidate"} 👋</h1>
          <p>Your AI-powered interview control center</p>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* CARDS */}
        <div className="dashboard-cards">

          {/* PERSONAL INFO */}
          <div className="dashboard-card">
            <div className="icon">👤</div>
            <h3>Personal Profile</h3>
            <p>View and manage your personal information.</p>
            <ul>
              <li>Name: {userName}</li>
              <li>Email: user@example.com</li>
            </ul>
            <span className="coming-soon">Editable soon</span>
          </div>

          {/* START INTERVIEW */}
          <div className="dashboard-card primary">
            <div className="icon">🎤</div>
            <h3>Start Interview</h3>
            <p>Practice real interview questions with AI.</p>
            <button onClick={() => navigate("/roles")}>
              Start Interview
            </button>
          </div>

          {/* INTERVIEW HISTORY */}
          <div className="dashboard-card">
            <div className="icon">📊</div>
            <h3>Interview History</h3>
            <p>Review your past interview performance.</p>
            <button onClick={() => navigate("/scorecard")}>
              View Scorecard
            </button>
          </div>

          {/* ABOUT COMPANY */}
          <div className="dashboard-card">
            <div className="icon">🏢</div>
            <h3>About Platform</h3>
            <p>
              This AI Interview Platform helps candidates prepare
              using real-time analysis and feedback.
            </p>
            <span className="coming-soon">More coming soon</span>
          </div>

        </div>
      </div>
    </>
  );
};

export default Dashboard;
