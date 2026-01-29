import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Loader from "../components/common/Loader";
import "../styles/Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const isAuth = localStorage.getItem("isAuthenticated");
    const user = JSON.parse(localStorage.getItem("user"));

    if (!isAuth || !user) {
      navigate("/login");
      return;
    }

    setUserName(user.name);
  }, [navigate]);

  return (
    <>
      {loading && <Loader text="Loading..." />}

      <div className="dashboard-container">
        {/* HERO */}
        <div className="dashboard-hero">
          <h1>Welcome, {userName || "Candidate"}</h1>
          <p>Your AI-powered interview control center</p>
        </div>

        {/* ACTION CARDS */}
        <div className="dashboard-cards">
          {/* PROFILE CARD */}
          <div className="dashboard-card">
            <div className="icon">👤</div>
            <h3>Profile</h3>
            <p>Check and edit your personal details.</p>
            <button onClick={() => navigate("/profile")}>
              View Profile
            </button>
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
            <p>View detailed stats, performance trends, and past interviews.</p>
            <button onClick={() => navigate("/interview-history")}>
              View History
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
