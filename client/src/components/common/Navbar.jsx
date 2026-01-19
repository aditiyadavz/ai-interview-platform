import "../../styles/navbar.css";

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="logo">AI Interview</div>
      <div className="nav-links">
        <button className="login-btn">Login</button>
        <button className="signup-btn">Sign Up</button>
      </div>
    </nav>
  );
};

export default Navbar;
