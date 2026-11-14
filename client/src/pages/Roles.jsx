import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../styles/Roles.css";

const roles = [
  {
    icon: "💻", title: "Frontend Developer", roleKey: "frontend",
    color: "#00f5a0", tag: "Most Popular",
    about: "Build modern, responsive UIs with React and cutting-edge CSS.",
    level: "Beginner – Intermediate", duration: "20–30 mins",
    skills: ["React & Hooks", "CSS & Flexbox", "JavaScript ES6+", "Performance"],
    syllabus: ["HTML5 & Semantic Tags","CSS (Flexbox, Grid)","JavaScript Fundamentals","React (Hooks, State, Props)","Performance & Accessibility"],
    flow: ["Concept-based questions","UI problem-solving scenarios","React component discussion"],
    outcome: "Confidence in frontend interviews with clear skill feedback.",
  },
  {
    icon: "🖥️", title: "Backend Developer", roleKey: "backend",
    color: "#3b82f6", tag: "High Demand",
    about: "APIs, databases, authentication, and server-side architecture.",
    level: "Intermediate", duration: "30 mins",
    skills: ["REST APIs", "Node.js", "Databases", "Auth & Security"],
    syllabus: ["REST APIs","Authentication & Authorization","Databases (SQL / NoSQL)","Server-side validation","Error handling"],
    flow: ["API design scenarios","Database schema discussion","Logic explanation"],
    outcome: "Strong backend interview readiness.",
  },
  {
    icon: "📘", title: "DSA / Coding", roleKey: "dsa",
    color: "#f59e0b", tag: "Placement Prep",
    about: "Algorithms, data structures, and problem-solving under pressure.",
    level: "Medium – Hard", duration: "45 mins",
    skills: ["Arrays & Trees", "Dynamic Programming", "Time Complexity", "Graph Algorithms"],
    syllabus: ["Arrays & Strings","Linked Lists, Stacks, Queues","Trees & Graphs","Recursion & DP","Time & Space Complexity"],
    flow: ["Coding problems","Dry runs","Optimization discussion"],
    outcome: "Improved confidence in coding interviews.",
  },
  {
    icon: "🧑‍💼", title: "HR Interview", roleKey: "hr",
    color: "#ec4899", tag: "For Freshers",
    about: "Communication, attitude, and behavioral interview prep.",
    level: "Easy", duration: "15–20 mins",
    skills: ["Communication", "Confidence", "Behavioral", "Professionalism"],
    syllabus: ["Introduction & background","Strengths & weaknesses","Situational questions","Teamwork & leadership"],
    flow: ["Behavioral questions","Situational scenarios","Communication feedback"],
    outcome: "Better communication and HR interview readiness.",
  },
  {
    icon: "🧩", title: "Full Stack Developer", roleKey: "fullstack",
    color: "#a78bfa", tag: "MERN Stack",
    about: "End-to-end product development from frontend to backend.",
    level: "Intermediate", duration: "35–45 mins",
    skills: ["Frontend + Backend", "REST APIs", "Auth Flows", "System Design"],
    syllabus: ["Frontend–Backend integration","REST APIs","Authentication flows","Database design","System architecture"],
    flow: ["Project walkthrough","Architecture discussion","Real-world scenarios"],
    outcome: "Real-world full-stack interview practice.",
  },
  {
    icon: "⚙️", title: "DevOps Engineer", roleKey: "devops",
    color: "#06b6d4", tag: "Cloud & CI/CD",
    about: "Infrastructure, Docker, pipelines, and cloud deployment.",
    level: "Intermediate – Advanced", duration: "30–40 mins",
    skills: ["Docker", "CI/CD", "Linux", "AWS Basics"],
    syllabus: ["Linux basics","Docker & Containers","CI/CD pipelines","Cloud concepts (AWS)","Monitoring & scaling"],
    flow: ["Deployment scenarios","Pipeline explanation","Architecture decisions"],
    outcome: "Confidence in DevOps interviews.",
  },
  {
    icon: "🧠", title: "AI / ML Engineer", roleKey: "aiml",
    color: "#f97316", tag: "Future-Ready",
    about: "Machine learning, model evaluation, and AI system design.",
    level: "Intermediate", duration: "40–50 mins",
    skills: ["ML Algorithms", "Python", "Model Evaluation", "Data Prep"],
    syllabus: ["Python","ML algorithms","Data preprocessing","Model evaluation","Use-case discussion"],
    flow: ["Concept explanation","Case studies","Model comparison"],
    outcome: "Clear understanding of ML interview expectations.",
  },
  {
    icon: "🔐", title: "Cyber Security", roleKey: "security",
    color: "#ef4444", tag: "Critical Skills",
    about: "Security threats, OWASP, encryption, and attack prevention.",
    level: "Intermediate", duration: "30–40 mins",
    skills: ["OWASP Top 10", "Networking", "Encryption", "Threat Analysis"],
    syllabus: ["Networking basics","Common attacks","OWASP Top 10","Encryption basics","Security tools"],
    flow: ["Threat scenarios","Defense strategies","Security discussions"],
    outcome: "Preparedness for security interviews.",
  },
  {
    icon: "📊", title: "Data Analyst", roleKey: "data",
    color: "#10b981", tag: "Analytics",
    about: "SQL, visualization, and data-driven business decisions.",
    level: "Beginner – Intermediate", duration: "25–35 mins",
    skills: ["SQL", "Excel", "Data Visualization", "Business Metrics"],
    syllabus: ["SQL","Excel","Data cleaning","Visualization tools","Business metrics"],
    flow: ["Case studies","SQL questions","Data interpretation"],
    outcome: "Strong data interview confidence.",
  },
];

const Roles = () => {
  const navigate   = useNavigate();
  const [active, setActive] = useState(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    document.body.style.overflow = active ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [active]);

  const filtered = filter === "All" ? roles : roles.filter(r => r.level === filter);

  return (
    <div className="rp-root">

      {/* Background */}
      <div className="rp-bg">
        <div className="rp-orb rp-orb1" />
        <div className="rp-orb rp-orb2" />
        <div className="rp-grid" />
      </div>

      <div className="rp-wrap">

        {/* Hero */}
        <div className="rp-hero">
          <span className="rp-badge">9 TRACKS AVAILABLE</span>
          <h1 className="rp-title">
            Choose Your<br />
            <span className="rp-title-grad">Interview Track</span>
          </h1>
          <p className="rp-subtitle">
            AI-generated questions tailored to your role, difficulty, and experience level.
          </p>
        </div>

        {/* Filter pills */}
        <div className="rp-filters">
          {["All","Easy","Intermediate","Medium – Hard"].map(f => (
            <button
              key={f}
              className={`rp-pill ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="rp-grid-cards">
          {filtered.map((role, i) => (
            <div
              key={role.roleKey}
              className="rp-card"
              style={{ "--c": role.color, animationDelay: `${i * 0.07}s` }}
            >
              {role.tag && <div className="rp-card-tag">{role.tag}</div>}

              <div className="rp-card-top">
                <div className="rp-card-icon">{role.icon}</div>
                <div className="rp-card-meta">
                  <span>{role.level}</span>
                  <span className="rp-dot">·</span>
                  <span>{role.duration}</span>
                </div>
              </div>

              <h3 className="rp-card-title">{role.title}</h3>
              <p className="rp-card-about">{role.about}</p>

              <div className="rp-skills">
                {role.skills.slice(0, 3).map(s => (
                  <span key={s} className="rp-skill">{s}</span>
                ))}
              </div>

              <div className="rp-card-actions">
                <button className="rp-btn-outline" onClick={() => setActive(role)}>
                  Details
                </button>
                <button
                  className="rp-btn-primary"
                  onClick={() => navigate(`/interview-setup/${role.roleKey}`)}
                >
                  Start →
                </button>
              </div>

              {/* Accent line */}
              <div className="rp-card-accent" />
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {active && (
        <div className="rp-modal-overlay" onClick={() => setActive(null)}>
          <div className="rp-modal" onClick={e => e.stopPropagation()} style={{ "--c": active.color }}>

            <button className="rp-modal-close" onClick={() => setActive(null)}>✕</button>

            <div className="rp-modal-header">
              <div className="rp-modal-icon">{active.icon}</div>
              <div>
                <h2 className="rp-modal-title">{active.title}</h2>
                <div className="rp-modal-meta">
                  <span>{active.level}</span>
                  <span className="rp-dot">·</span>
                  <span>{active.duration}</span>
                </div>
              </div>
            </div>

            <p className="rp-modal-about">{active.about}</p>

            <div className="rp-modal-grid">
              <div className="rp-modal-section">
                <h4>📚 Syllabus</h4>
                <ul>{active.syllabus.map(s => <li key={s}>{s}</li>)}</ul>
              </div>
              <div className="rp-modal-section">
                <h4>🔄 Interview Flow</h4>
                <ul>{active.flow.map(f => <li key={f}>{f}</li>)}</ul>
              </div>
              <div className="rp-modal-section">
                <h4>⚡ Skills Tested</h4>
                <ul>{active.skills.map(s => <li key={s}>{s}</li>)}</ul>
              </div>
              <div className="rp-modal-section">
                <h4>🎯 Outcome</h4>
                <p className="rp-modal-outcome">{active.outcome}</p>
              </div>
            </div>

            <button
              className="rp-modal-start"
              onClick={() => navigate(`/interview-setup/${active.roleKey}`)}
            >
              Start {active.title} Interview →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;