import Navbar from "../components/common/Navbar";
import "../styles/home.css";

const Home = () => {
  return (
    <>
      <Navbar />

      <section className="hero">
        <div className="hero-content">
          <h1>AI-Powered Interview Platform</h1>
          <p>
            Practice mock interviews, get AI-driven feedback,  
            and prepare smarter for placements.
          </p>
          <button className="hero-btn">Start Mock Interview</button>
        </div>

        <div className="hero-image">
          <img
            src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png"
            alt="AI Interview"
          />
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <h3>🎯 Mock Interviews</h3>
          <p>Real interview questions based on job roles.</p>
        </div>

        <div className="feature-card">
          <h3>🧠 AI Feedback</h3>
          <p>Instant analysis of answers & confidence.</p>
        </div>

        <div className="feature-card">
          <h3>📊 Performance Report</h3>
          <p>Track strengths, weaknesses & improvement.</p>
        </div>
      </section>
    </>
  );
};

export default Home;
