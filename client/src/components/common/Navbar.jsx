import { NavLink } from "react-router-dom";
import "../../styles/Navbar.css";

const Navbar = () => {
  return (
    <nav className="navbar">
      {/* Logo on the left */}
      <div className="nav-logo">
        AI<span>Interview</span>
      </div>

      {/* Right side: links + auth buttons */}
      <div className="nav-right">
        <ul className="nav-links">
          <li>
            <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/roles" className={({ isActive }) => isActive ? "active" : ""}>
              Roles
            </NavLink>
          </li>
          <li>
            <NavLink to="/interview-setup" className={({ isActive }) => isActive ? "active" : ""}>
              Interview
            </NavLink>
          </li>
          <li>
            <NavLink to="/contact" className={({ isActive }) => isActive ? "active" : ""}>
              Contact
            </NavLink>
          </li>
        </ul>

        <div className="nav-actions">
          <NavLink to="/login" className="btn-login">Login</NavLink>
          <NavLink to="/signup" className="btn-signup">Sign Up</NavLink>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
