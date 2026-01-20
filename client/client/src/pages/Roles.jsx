import { useNavigate } from "react-router-dom";
import "../styles/roles.css";

const Roles = () => {
  const navigate = useNavigate();

  const roles = [
    {
      icon: "💻",
      title: "Frontend Developer",
      desc: "Practice UI-based interviews focusing on modern frontend skills.",
      topics: ["React & Hooks", "JavaScript", "HTML & CSS"],
      level: "Beginner – Intermediate",
      duration: "20–30 mins",
      route: "/interview/frontend",
    },
    {
      icon: "🖥",
      title: "Backend Developer",
      desc: "Backend interviews covering APIs, databases, and logic building.",
      topics: ["Node.js", "Java", "Databases"],
      level: "Intermediate",
      duration: "30 mins",
      route: "/interview/backend",
    },
    {
      icon: "📘",
      title: "DSA / Coding",
      desc: "Coding interviews focused on problem-solving and algorithms.",
      topics: ["Arrays", "Trees", "Graphs"],
      level: "Medium – Hard",
      duration: "45 mins",
      route: "/interview/dsa",
    },
    {
      icon: "🧑‍💼",
      title: "HR Interview",
      desc: "Behavioral interviews to test communication and confidence.",
      topics: ["HR", "Behavioral", "Situational Questions"],
      level: "Easy",
      duration: "15–20 mins",
      route: "/interview/hr",
    },
  ];

  return (
    <div className="roles-container">
      <h1>Select Interview Type</h1>
      <p>
        Choose the interview you want to practice and start with AI-driven
        feedback.
      </p>

      <div className="roles-grid">
        {roles.map((role, index) => (
          <div className="role-card" key={index}>
            <div className="role-icon">{role.icon}</div>
            <h2>{role.title}</h2>
            <p className="role-desc">{role.desc}</p>

            <ul className="role-details">
              {role.topics.map((topic, idx) => (
                <li key={idx}>{topic}</li>
              ))}
            </ul>

            <div className="role-meta">
              <span className="level">Level: {role.level}</span>
              <span className="duration">Duration: {role.duration}</span>
            </div>

            <div className="role-actions">
              <button onClick={() => navigate(role.route)}>Start Interview</button>
              <button className="secondary">View Syllabus</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Roles;
