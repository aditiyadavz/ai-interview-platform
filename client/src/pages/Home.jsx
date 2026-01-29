import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/home.css";

const Home = () => {
  const navigate = useNavigate();

  const [counters, setCounters] = useState({
    interviews: 0,
    users: 0,
    questions: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCounters((prev) => ({
        interviews: prev.interviews < 1200 ? prev.interviews + 10 : 1200,
        users: prev.users < 500 ? prev.users + 5 : 500,
        questions: prev.questions < 3000 ? prev.questions + 25 : 3000,
      }));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById("features").scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* HERO */}
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
            <button className="hero-btn secondary" onClick={scrollToFeatures}>
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

      {/* FEATURES */}
      <section className="features" id="features">
        <h2>Why Choose Our Platform?</h2>
        <p className="features-subtitle">
          Everything you need to ace interviews
        </p>

        <div className="features-grid">
          <div className="feature-card">
            <h3>🎯 Mock Interviews</h3>
            <p>Role-based interview questions tailored for you.</p>
          </div>
          <div className="feature-card">
            <h3>🧠 AI Feedback</h3>
            <p>Smart evaluation of your answers for faster improvement.</p>
          </div>
          <div className="feature-card">
            <h3>📊 Performance Reports</h3>
            <p>Detailed insights and metrics to track your progress.</p>
          </div>
        </div>
      </section>

      {/* COUNTERS */}
      <section
        className="counters"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80')",
        }}
      >
        <div className="counter-card">
          <h3>{counters.interviews}+</h3>
          <p>Mock Interviews Conducted</p>
        </div>
        <div className="counter-card">
          <h3>{counters.users}+</h3>
          <p>Active Users</p>
        </div>
        <div className="counter-card">
          <h3>{counters.questions}+</h3>
          <p>Questions Available</p>
        </div>
      </section>

      {/* WAVEFORM */}
      <section className="waveform-section">
        <div className="waveform-container">
          <div className="waveform-left">
            <span className="wave-badge">🎙 Real-Time AI</span>
            <h2>Live Mic & Camera Feedback</h2>
            <p>AI listens, analyzes, and guides you instantly</p>

            <div className="waveform-stats">
              <div>
                <h4>Voice Clarity</h4>
                <span>Excellent</span>
              </div>
              <div>
                <h4>Eye Contact</h4>
                <span>Good</span>
              </div>
              <div>
                <h4>Response Time</h4>
                <span>1.2s</span>
              </div>
            </div>
          </div>

          <div className="waveform-right">
            <div className="waveform-box">
              <span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section
        className="testimonials"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80')",
        }}
      >
        <h2>What Students Say</h2>
        <div className="testimonial-grid">
          <div className="testimonial-card">
            <p>
              AI interviews helped me practice confidently. I could track my
              mistakes and improve quickly!
            </p>
            <h4>- Priya S.</h4>
          </div>
          <div className="testimonial-card">
            <p>
              The AI feedback is super accurate. I never felt more prepared for
              my placement interviews.
            </p>
            <h4>- Rahul K.</h4>
          </div>
          <div className="testimonial-card">
            <p>
              The performance reports gave me clear direction on what to
              improve. Highly recommend!
            </p>
            <h4>- Ananya R.</h4>
          </div>
        </div>
      </section>

      {/* COMPANIES */}
      <section className="companies">
        <h2>Trusted by Candidates Preparing For</h2>
        <p className="companies-subtitle">
          Interviews at world-class tech companies
        </p>

        <div className="companies-slider">
          <div className="companies-track">
            <span>Google</span><span>Microsoft</span><span>Amazon</span>
            <span>Meta</span><span>Apple</span><span>Adobe</span>
            <span>Netflix</span><span>Salesforce</span>
            <span>Google</span><span>Microsoft</span><span>Amazon</span>
            <span>Meta</span><span>Apple</span><span>Adobe</span>
            <span>Netflix</span><span>Salesforce</span>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        className="final-cta"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80')",
        }}
      >
        <h2>Ready to Boost Your Interview Skills?</h2>
        <button
          className="hero-btn primary"
          onClick={() => navigate("/roles")}
        >
          Start Mock Interview
        </button>
      </section>
    </>
  );
};

export default Home;
