import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "../components/common/Loader";
import "../styles/profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const skillOptions = [
    "HTML", "CSS", "JavaScript", "C", "C++", "Java", "Python",
    "React", "Node.js", "Express", "MongoDB", "SQL", "Git", "Docker"
  ];

  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
    college: "",
    degree: "",
    organization: "",
    linkedin: "",
    github: "",
    skills: [], // array of selected skills
    profilePic: "",
  });

  const [skillInput, setSkillInput] = useState("");

  // Load user data
  useEffect(() => {
    const isAuth = localStorage.getItem("isAuthenticated");
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!isAuth || !storedUser) {
      navigate("/login");
      return;
    }

    setUser(prev => ({ ...prev, ...storedUser, skills: storedUser.skills || [] }));
  }, [navigate]);

  // Handle input change
  const handleChange = e => {
    const { name, value } = e.target;
    setUser(prev => ({ ...prev, [name]: value }));
  };

  // Profile picture upload
  const handleProfilePic = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setUser(prev => ({ ...prev, profilePic: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  // Add a skill
  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !user.skills.includes(skill)) {
      setUser(prev => ({ ...prev, skills: [...prev.skills, skill] }));
    }
    setSkillInput("");
  };

  // Remove a skill
  const removeSkill = skill => {
    setUser(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  // Save profile
  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("user", JSON.stringify(user));
      setLoading(false);
      alert("Profile updated successfully!");
    }, 500);
  };

  // Handle Enter key for skill input
  const handleKeyDown = e => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <>
      {loading && <Loader text="Saving profile..." />}

      <div className="profile-container">
        <div className="profile-hero">
          <h1>Edit Profile</h1>
          <p>Update your personal and professional details</p>
        </div>

        <div className="profile-card">

          {/* Profile Picture */}
          <div className="profile-pic-container">
            {user.profilePic ? (
              <img src={user.profilePic} alt="Profile" className="profile-pic" />
            ) : (
              <div className="profile-pic-placeholder">👤</div>
            )}
            <input type="file" accept="image/*" onChange={handleProfilePic} />
          </div>

          {/* Personal Info */}
          <label>Name</label>
          <input type="text" name="name" value={user.name} onChange={handleChange} />

          <label>Email</label>
          <input type="email" name="email" value={user.email} onChange={handleChange} />

          <label>Phone Number</label>
          <input type="text" name="phone" value={user.phone} onChange={handleChange} />

          <label>College / Organization</label>
          <input type="text" name="college" value={user.college} onChange={handleChange} />

          <label>Degree / Position</label>
          <input type="text" name="degree" value={user.degree} onChange={handleChange} />

          <label>LinkedIn</label>
          <input type="text" name="linkedin" value={user.linkedin} onChange={handleChange} />

          <label>GitHub</label>
          <input type="text" name="github" value={user.github} onChange={handleChange} />

          {/* ====== Skills as Tags ====== */}
          <label>Skills</label>
          <div className="skills-tag-input">
            <input
              type="text"
              placeholder="Add a skill and press Enter"
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button type="button" onClick={addSkill}>Add</button>
          </div>
          <div className="skills-tag-container">
            {user.skills.map(skill => (
              <div key={skill} className="skill-tag">
                {skill}
                <span className="remove-skill" onClick={() => removeSkill(skill)}>×</span>
              </div>
            ))}
          </div>

          <button onClick={handleSave}>Save Changes</button>

        </div>
      </div>
    </>
  );
};

export default Profile;
