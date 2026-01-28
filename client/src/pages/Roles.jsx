import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "../styles/roles.css";

const Roles = () => {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState(null);

  const roles = [
    {
      icon: "💻",
      title: "Frontend Developer",
      roleKey: "frontend",
      about: "Focuses on building modern, responsive, and user-friendly interfaces.",
      who: "Frontend learners, React developers, UI-focused roles.",
      syllabus: [
        "HTML5 & Semantic Tags",
        "CSS (Flexbox, Grid, Responsive UI)",
        "JavaScript Fundamentals",
        "React (Hooks, State, Props)",
        "Performance & Accessibility",
      ],
      flow: [
        "Concept-based questions",
        "UI problem-solving scenarios",
        "React component discussion",
      ],
      skills: [
        "UI thinking",
        "JavaScript fundamentals",
        "React understanding",
      ],
      outcome: "Confidence in frontend interviews with clear skill feedback.",
      level: "Beginner – Intermediate",
      duration: "20–30 mins",
    },
    {
      icon: "🖥",
      title: "Backend Developer",
      roleKey: "backend",
      about: "Tests server-side logic, APIs, and database handling.",
      who: "Backend developers and API-focused roles.",
      syllabus: [
        "REST APIs",
        "Authentication & Authorization",
        "Databases (SQL / NoSQL)",
        "Server-side validation",
        "Error handling",
      ],
      flow: [
        "API design scenarios",
        "Database schema discussion",
        "Logic explanation",
      ],
      skills: [
        "Backend architecture",
        "Data handling",
        "Security basics",
      ],
      outcome: "Strong backend interview readiness.",
      level: "Intermediate",
      duration: "30 mins",
    },
    {
      icon: "📘",
      title: "DSA / Coding",
      roleKey: "dsa",
      about: "Measures problem-solving and algorithmic thinking.",
      who: "Placement preparation and coding interview aspirants.",
      syllabus: [
        "Arrays & Strings",
        "Linked Lists, Stacks, Queues",
        "Trees & Graphs",
        "Recursion & DP",
        "Time & Space Complexity",
      ],
      flow: [
        "Coding problems",
        "Dry runs",
        "Optimization discussion",
      ],
      skills: [
        "Logical thinking",
        "Complexity analysis",
        "Edge-case handling",
      ],
      outcome: "Improved confidence in coding interviews.",
      level: "Medium – Hard",
      duration: "45 mins",
    },
    {
      icon: "🧑‍💼",
      title: "HR Interview",
      roleKey: "hr",
      about: "Focuses on behavior, communication, and attitude.",
      who: "Freshers and placement interview candidates.",
      syllabus: [
        "Introduction & background",
        "Strengths & weaknesses",
        "Situational questions",
        "Teamwork & leadership",
      ],
      flow: [
        "Behavioral questions",
        "Situational scenarios",
        "Communication feedback",
      ],
      skills: [
        "Confidence",
        "Clarity of thought",
        "Professionalism",
      ],
      outcome: "Better communication and HR interview readiness.",
      level: "Easy",
      duration: "15–20 mins",
    },
    {
      icon: "🧩",
      title: "Full Stack Developer",
      roleKey: "fullstack",
      about: "End-to-end product development interview.",
      who: "MERN stack learners and full-stack aspirants.",
      syllabus: [
        "Frontend–Backend integration",
        "REST APIs",
        "Authentication flows",
        "Database design",
        "System architecture",
      ],
      flow: [
        "Project walkthrough",
        "Architecture discussion",
        "Real-world scenarios",
      ],
      skills: [
        "System thinking",
        "Integration skills",
        "Practical knowledge",
      ],
      outcome: "Real-world full-stack interview practice.",
      level: "Intermediate",
      duration: "35–45 mins",
    },
    {
      icon: "⚙️",
      title: "DevOps Engineer",
      roleKey: "devops",
      about: "Evaluates infrastructure, deployment, and automation skills.",
      who: "DevOps learners and cloud-focused roles.",
      syllabus: [
        "Linux basics",
        "Docker & Containers",
        "CI/CD pipelines",
        "Cloud concepts (AWS)",
        "Monitoring & scaling",
      ],
      flow: [
        "Deployment scenarios",
        "Pipeline explanation",
        "Architecture decisions",
      ],
      skills: [
        "Automation mindset",
        "Reliability",
        "Cloud understanding",
      ],
      outcome: "Confidence in DevOps interviews.",
      level: "Intermediate – Advanced",
      duration: "30–40 mins",
    },
    {
      icon: "🧠",
      title: "AI / ML Engineer",
      roleKey: "aiml",
      about: "Focuses on machine learning concepts and real-world applications.",
      who: "ML learners and AI enthusiasts.",
      syllabus: [
        "Python",
        "ML algorithms",
        "Data preprocessing",
        "Model evaluation",
        "Use-case discussion",
      ],
      flow: [
        "Concept explanation",
        "Case studies",
        "Model comparison",
      ],
      skills: [
        "ML fundamentals",
        "Analytical thinking",
        "Practical reasoning",
      ],
      outcome: "Clear understanding of ML interview expectations.",
      level: "Intermediate",
      duration: "40–50 mins",
    },
    {
      icon: "🔐",
      title: "Cyber Security",
      roleKey: "security",
      about: "Tests knowledge of system security and attack prevention.",
      who: "Security enthusiasts and network/system roles.",
      syllabus: [
        "Networking basics",
        "Common attacks",
        "OWASP Top 10",
        "Encryption basics",
        "Security tools",
      ],
      flow: [
        "Threat scenarios",
        "Defense strategies",
        "Security discussions",
      ],
      skills: [
        "Risk assessment",
        "Security awareness",
        "Problem-solving",
      ],
      outcome: "Preparedness for security interviews.",
      level: "Intermediate",
      duration: "30–40 mins",
    },
    {
      icon: "📊",
      title: "Data Analyst",
      roleKey: "data",
      about: "Measures data interpretation and business decision-making skills.",
      who: "Data analyst aspirants and analytics roles.",
      syllabus: [
        "SQL",
        "Excel",
        "Data cleaning",
        "Visualization tools",
        "Business metrics",
      ],
      flow: [
        "Case studies",
        "SQL questions",
        "Data interpretation",
      ],
      skills: [
        "Analytical thinking",
        "Accuracy",
        "Business sense",
      ],
      outcome: "Strong data interview confidence.",
      level: "Beginner – Intermediate",
      duration: "25–35 mins",
    },
  ];

  return (
    <div className="roles-container">
      <h1>Select Interview Type</h1>
      <p>Choose your interview track and prepare with AI-driven feedback.</p>

      <div className="roles-grid">
        {roles.map((role) => (
          <div className="role-card" key={role.roleKey}>
            <div className="role-header">
              <span className="role-icon">{role.icon}</span>
              <h2>{role.title}</h2>
            </div>

            <div className="role-meta">
              <span>{role.level}</span>
              <span>{role.duration}</span>
            </div>

            <div className="role-actions">
              <button
                className="outline-btn"
                onClick={() => setActiveRole(role)}
              >
                View Details
              </button>

              <button
                className="role-btn"
                onClick={() => navigate(`/interview-setup/${role.roleKey}`)}
              >
                Start Interview
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* POP OUT DETAILS */}
      {activeRole && (
        <div className="modal-overlay" onClick={() => setActiveRole(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>{activeRole.icon} {activeRole.title}</h2>

            <p><b>About:</b> {activeRole.about}</p>
            <p><b>Who should take this:</b> {activeRole.who}</p>

            <h4>Syllabus</h4>
            <ul>
              {activeRole.syllabus.map((s) => <li key={s}>{s}</li>)}
            </ul>

            <h4>Interview Flow</h4>
            <ul>
              {activeRole.flow.map((f) => <li key={f}>{f}</li>)}
            </ul>

            <h4>Skills Evaluated</h4>
            <ul>
              {activeRole.skills.map((sk) => <li key={sk}>{sk}</li>)}
            </ul>

            <p><b>Outcome:</b> {activeRole.outcome}</p>

            <button
              className="role-btn"
              onClick={() => navigate(`/interview-setup/${activeRole.roleKey}`)}
            >
              Start Interview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
