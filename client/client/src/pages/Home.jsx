import { useNavigate } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import "../styles/home.css";

const Home = () => {
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    document.getElementById("features").scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <>
      <Navbar />

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-content">
          <span className="hero-badge">🚀 AI Powered</span>

          <h1>
            Crack Interviews with <span>AI Mock Interviews</span>
          </h1>

          <p>
            Practice real interview questions, get instant AI feedback,
            and boost your confidence for placements.
          </p>

          <div className="hero-actions">
            <button
              className="hero-btn primary"
              onClick={() => navigate("/roles")}
            >
              Start Mock Interview
            </button>

            <button
              className="hero-btn secondary"
              onClick={scrollToFeatures}
            >
              View Features
            </button>
          </div>
        </div>

        <div className="hero-image">
          <img
            src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png"
            alt="AI Interview"
          />
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features" id="features">
        <h2>Why Choose Our Platform?</h2>
        <p className="features-subtitle">
          Everything you need to ace interviews
        </p>

        <div className="features-grid">
          <div className="feature-card">
            <h3>🎯 Mock Interviews</h3>
            <p>Role-based interview questions.</p>
          </div>

          <div className="feature-card">
            <h3>🧠 AI Feedback</h3>
            <p>Smart evaluation of answers.</p>
          </div>

          <div className="feature-card">
            <h3>📊 Performance Reports</h3>
            <p>Detailed improvement insights.</p>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
