import { Link, NavLink, useNavigate } from "react-router-dom";
import "../../styles/navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const isAuth = localStorage.getItem("isAuthenticated");

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      {/* Logo */}
      <div className="nav-logo">
        <Link to="/">AI<span>Interview</span></Link>
      </div>

      {/* Right side */}
      <div className="nav-right">
        {/* Navigation links */}
        <ul className="nav-links">
          <li><NavLink to="/" end>Home</NavLink></li>
          <li><NavLink to="/roles">Roles</NavLink></li>
          <li><NavLink to="/contact">Contact</NavLink></li>

          {isAuth && (
            <li><NavLink to="/dashboard">Dashboard</NavLink></li>
          )}
        </ul>

        {/* Auth buttons */}
        <div className="nav-actions">
          {isAuth ? (
            <button className="btn-login" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <>
              <Link to="/login" className="btn-login">
                Login
              </Link>
              <Link to="/signup" className="btn-signup">
                Signup
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
