import "../styles/auth.css";
import { Link } from "react-router-dom";

const Login = () => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back 👋</h2>
        <p>Login to continue your AI interview journey</p>

        <form>
          <input type="email" placeholder="Email" required />
          <input type="password" placeholder="Password" required />

          <button className="auth-btn">Login</button>
        </form>

        <span className="auth-footer">
          Don’t have an account? <Link to="/signup">Sign Up</Link>
        </span>
      </div>
    </div>
  );
};

export default Login;
