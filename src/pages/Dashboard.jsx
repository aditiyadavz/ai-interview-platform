import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-hero">
        <h1>Welcome back 👋</h1>
        <p>Ready to practice your next AI-powered interview?</p>

        <button
          onClick={handleLogout}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      <div className="dashboard-cards">
        <div className="dashboard-card primary">
          <h3>Start New Interview</h3>
          <p>Select interview type and begin practice.</p>
          <button onClick={() => navigate("/interview-setup")}>
            Start Interview
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
