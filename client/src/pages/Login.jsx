import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import Loader from "../components/common/Loader";
import "../styles/auth.css";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);

    // ⏳ Fake API delay (replace later with backend)
    setTimeout(() => {
      // 🔐 AUTH FLAG
      localStorage.setItem("isAuthenticated", "true");

      // 👤 USER DATA (used in Dashboard welcome)
      localStorage.setItem(
        "user",
        JSON.stringify({
          name: "Pareekshit",        // later from backend
          email: "user@example.com",
        })
      );

      navigate("/dashboard");
    }, 1200);
  };

  return (
    <>
      {loading && <Loader text="Logging you in..." />}

      <div className="auth-container">
        <div className="auth-card glass-card">
          <h2>Welcome Back 👋</h2>
          <p>Login to continue your AI interview journey</p>

          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              required
            />

            <input
              type="password"
              placeholder="Password"
              required
            />

            <button className="auth-btn">
              Login
            </button>
          </form>

          <span className="auth-footer">
            Don’t have an account? <Link to="/signup">Sign Up</Link>
          </span>
        </div>
      </div>
    </>
  );
};

export default Login;
