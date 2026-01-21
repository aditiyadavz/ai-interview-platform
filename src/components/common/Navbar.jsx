import { Link, useNavigate, useLocation } from "react-router-dom";
import "../../styles/navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuth = localStorage.getItem("isAuth");

  const handleLogout = () => {
    localStorage.removeItem("isAuth");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="logo">AI Interview</div>

      <ul className="nav-links">
        <li className={location.pathname === "/" ? "active" : ""}>
          <Link to="/">Home</Link>
        </li>
        <li className={location.pathname === "/contact" ? "active" : ""}>
          <Link to="/contact">Contact</Link>
        </li>

        {isAuth ? (
          <>
            <li className={location.pathname === "/dashboard" ? "active" : ""}>
              <Link to="/dashboard">Dashboard</Link>
            </li>
            <li>
              <button className="btn logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login" className="btn login">
                Login
              </Link>
            </li>
            <li>
              <Link to="/signup" className="btn signup">
                Signup
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
