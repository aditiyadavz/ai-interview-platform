import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { loginUser, demoLogin } from "../services/authService";
import Loader from "../components/common/Loader";
import "../styles/auth.css";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState("");
  const [form,    setForm]      = useState({ email: "", password: "" });
  const [showPw,  setShowPw]    = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginUser(form);
      const redirect = sessionStorage.getItem("friendRoomRedirect");
      if (redirect) {
        sessionStorage.removeItem("friendRoomRedirect");
        navigate(redirect);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await demoLogin();
      navigate("/dashboard");
    } catch {
      setError("Demo account unavailable right now — please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <Loader text="Logging you in..." />}
      <div className="auth-container">
        <div className="auth-bg-orb auth-bg-orb1" />
        <div className="auth-bg-orb auth-bg-orb2" />
        <div className="auth-bg-grid" />
        <div className="auth-shell">
          <div className="auth-showcase">
            <span className="auth-showcase-eyebrow">AI-Powered Interview Prep</span>
            <h1>Practice like it's real. Walk in ready.</h1>
            <p className="auth-showcase-sub">
              Sharpen your interview skills with AI-generated questions, live peer practice, and honest feedback — all in one place.
            </p>

            <div className="auth-feature">
              <div className="auth-feature-icon">🤖</div>
              <div className="auth-feature-text">
                <h4>Resume-tailored AI interviews</h4>
                <p>Questions built from your actual skills and projects — not generic templates.</p>
              </div>
            </div>

            <div className="auth-feature">
              <div className="auth-feature-icon">🎥</div>
              <div className="auth-feature-text">
                <h4>Practice with a friend</h4>
                <p>Live video mock interviews — share a link, no account needed for them.</p>
              </div>
            </div>

            <div className="auth-feature">
              <div className="auth-feature-icon">🛡️</div>
              <div className="auth-feature-text">
                <h4>Strict, proctored sessions</h4>
                <p>Fullscreen-enforced technical + HR rounds with a completion certificate.</p>
              </div>
            </div>

            <div className="auth-feature">
              <div className="auth-feature-icon">📈</div>
              <div className="auth-feature-text">
                <h4>Track real progress</h4>
                <p>Streaks, badges, and score history so you can see yourself improving.</p>
              </div>
            </div>
          </div>

          <div className="auth-card">
          <Link to="/" className="auth-brand">
            <span className="logo-ai">AI</span>
            <span className="logo-interview">Interview</span>
          </Link>

          <h2>Welcome Back 👋</h2>
          <p>Login to continue your AI interview journey</p>
          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="auth-field">
              <span className="auth-field-icon">✉️</span>
              <input type="email" name="email" placeholder="Email"
                value={form.email} onChange={handleChange} required />
            </div>

            <div className="auth-field">
              <span className="auth-field-icon">🔒</span>
              <input type={showPw ? "text" : "password"} name="password" placeholder="Password"
                value={form.password} onChange={handleChange} required />
              <button type="button" className="auth-field-toggle"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}>
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>

            <button className="auth-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
            <div className="auth-forgot-row">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <button className="auth-btn auth-btn-demo" onClick={handleDemoLogin} disabled={loading} type="button">
            👀 Try Demo Account (no signup needed)
          </button>

          <span className="auth-footer">
            Don&apos;t have an account? <Link to="/signup">Sign Up</Link>
          </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;