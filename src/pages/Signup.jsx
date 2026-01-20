import "../styles/auth.css";
import { Link } from "react-router-dom";

const Signup = () => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account 🚀</h2>
        <p>Start practicing AI mock interviews today</p>

        <form>
          <input type="text" placeholder="Full Name" required />
          <input type="email" placeholder="Email" required />
          <input type="password" placeholder="Password" required />

          <button className="auth-btn">Sign Up</button>
        </form>

        <span className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </span>
      </div>
    </div>
  );
};

export default Signup;
