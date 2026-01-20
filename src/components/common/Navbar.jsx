import { useNavigate } from "react-router-dom";
import "../../styles/navbar.css";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="logo">AI Interview</div>

      <div className="nav-links">
        <button className="login-btn" onClick={() => navigate("/login")}>
          Login
        </button>
        <button className="signup-btn" onClick={() => navigate("/signup")}>
          Sign Up
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
