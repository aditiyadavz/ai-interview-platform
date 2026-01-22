import { useNavigate } from "react-router-dom";
import "../styles/roles.css";

const Roles = () => {
  const navigate = useNavigate();

  const roles = [
    {
      icon: "💻",
      title: "Frontend Developer",
      roleKey: "frontend",
      desc: "UI-based interviews focusing on modern frontend skills.",
      topics: ["React", "JavaScript", "HTML & CSS"],
      level: "Beginner – Intermediate",
      duration: "20–30 mins",
    },
    {
      icon: "🖥",
      title: "Backend Developer",
      roleKey: "backend",
      desc: "APIs, databases, and server-side logic interviews.",
      topics: ["Node.js", "Java", "Databases"],
      level: "Intermediate",
      duration: "30 mins",
    },
    {
      icon: "📘",
      title: "DSA / Coding",
      roleKey: "dsa",
      desc: "Problem solving & algorithm-focused interviews.",
      topics: ["Arrays", "Trees", "Graphs"],
      level: "Medium – Hard",
      duration: "45 mins",
    },
    {
      icon: "🧑‍💼",
      title: "HR Interview",
      roleKey: "hr",
      desc: "Behavioral and situational interview practice.",
      topics: ["Communication", "HR Questions"],
      level: "Easy",
      duration: "15–20 mins",
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

            <p className="role-desc">{role.desc}</p>

            <ul className="role-details">
              {role.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>

            <div className="role-meta">
              <span>{role.level}</span>
              <span>{role.duration}</span>
            </div>

            {/* LINK TO INTERVIEW SETUP */}
            <button
              className="role-btn"
              onClick={() => navigate(`/interview-setup/${role.roleKey}`)}
            >
              Start Interview
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Roles;
