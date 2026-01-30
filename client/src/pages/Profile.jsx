import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "../components/common/Loader";
import "../styles/profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const skillOptions = [
    "HTML","CSS","JavaScript","React","Node.js","Express",
    "MongoDB","SQL","Java","Python","C++","Git","Docker",
    "REST API","Redux","Next.js"
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
    skills: [],
    profilePic: "",

    summary: "",
    experience: "",
    projectsText: "",
    certificationsText: "",

    // NEW ATS FILE SECTIONS
    offerLetters: [],
    certificates: [],
    projectRepos: [] // {name, url}
  });

  const [skillInput, setSkillInput] = useState("");
  const [repoName, setRepoName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");

  useEffect(() => {
    const isAuth = localStorage.getItem("isAuthenticated");
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!isAuth || !storedUser) {
      navigate("/login");
      return;
    }

    setUser(prev => ({
      ...prev,
      ...storedUser,
      skills: storedUser.skills || [],
      offerLetters: storedUser.offerLetters || [],
      certificates: storedUser.certificates || [],
      projectRepos: storedUser.projectRepos || []
    }));
  }, [navigate]);

  const handleChange = e => {
    const { name, value } = e.target;
    setUser(prev => ({ ...prev, [name]: value }));
  };

  /* ---------- PROFILE PIC ---------- */

  const handleProfilePic = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setUser(prev => ({ ...prev, profilePic: reader.result }));
    reader.readAsDataURL(file);
  };

  /* ---------- FILE UPLOAD GENERIC ---------- */

  const readFiles = (files, key) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setUser(prev => ({
          ...prev,
          [key]: [...prev[key], { name: file.name, data: reader.result }]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (key, name) => {
    setUser(prev => ({
      ...prev,
      [key]: prev[key].filter(f => f.name !== name)
    }));
  };

  /* ---------- SKILLS ---------- */

  const addSkill = skill => {
    const s = (skill || skillInput).trim();
    if (s && !user.skills.includes(s)) {
      setUser(prev => ({ ...prev, skills: [...prev.skills, s] }));
    }
    setSkillInput("");
  };

  const removeSkill = skill => {
    setUser(prev => ({
      ...prev,
      skills: prev.skills.filter(x => x !== skill)
    }));
  };

  /* ---------- PROJECT REPOS ---------- */

  const addRepo = () => {
    if (!repoName || !repoUrl) return;
    setUser(prev => ({
      ...prev,
      projectRepos: [...prev.projectRepos, { name: repoName, url: repoUrl }]
    }));
    setRepoName("");
    setRepoUrl("");
  };

  const removeRepo = name => {
    setUser(prev => ({
      ...prev,
      projectRepos: prev.projectRepos.filter(r => r.name !== name)
    }));
  };

  /* ---------- SAVE ---------- */

  const normalizeUrl = url =>
    url && !url.startsWith("http") ? `https://${url}` : url;

  const handleSave = () => {
    setLoading(true);

    const updated = {
      ...user,
      linkedin: normalizeUrl(user.linkedin),
      github: normalizeUrl(user.github),
      skills: user.skills.map(s => s.toLowerCase())
    };

    setTimeout(() => {
      localStorage.setItem("user", JSON.stringify(updated));
      setLoading(false);
      alert("Profile saved with ATS documents!");
    }, 500);
  };

  const handleKeyDown = e => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const suggestedSkills = skillOptions.filter(
    s =>
      s.toLowerCase().includes(skillInput.toLowerCase()) &&
      !user.skills.includes(s)
  );

  return (
    <>
      {loading && <Loader text="Saving profile..." />}

      <div className="profile-page">

        {/* HEADER */}
        <div className="profile-header">
          <div className="profile-header-left">
            <div className="avatar-wrap">
              {user.profilePic
                ? <img src={user.profilePic} alt="profile"/>
                : <div className="avatar-placeholder">👤</div>}
              <label className="avatar-upload">
                Change
                <input hidden type="file" accept="image/*" onChange={handleProfilePic}/>
              </label>
            </div>

            <div>
              <h1>{user.name || "Your Name"}</h1>
              <p>{user.degree || "Your Title"}</p>
              <span>{user.email}</span>
            </div>
          </div>

          <button className="save-btn" onClick={handleSave}>
            Save Profile
          </button>
        </div>

        <div className="profile-sections">

          <Section title="Professional Summary">
            <textarea name="summary" rows={4} value={user.summary} onChange={handleChange}/>
          </Section>

          {/* SKILLS */}
          <Section title="Core Skills">
            <div className="skills-input">
              <input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={handleKeyDown}/>
              <button onClick={() => addSkill()}>Add Skills</button>
            </div>
            <div className="suggestions">
              {suggestedSkills.map(s => (
                <span key={s} onClick={() => addSkill(s)}>{s}</span>
              ))}
            </div>
            <div className="tags">
              {user.skills.map(skill => (
                <div key={skill} className="tag">
                  {skill}
                  <span onClick={() => removeSkill(skill)}>×</span>
                </div>
              ))}
            </div>
          </Section>

          {/* WORK EXPERIENCE */}
          <Section title="Work Experience">
            <textarea
              name="experience"
              rows={5}
              value={user.experience}
              onChange={handleChange}
              placeholder="Role — Company — Duration — Achievements with numbers"
            />

            <label className="file-upload">
              Upload Offer Letters
              <input hidden type="file" multiple
                onChange={e => readFiles(e.target.files, "offerLetters")}
              />
            </label>

            <FileList
              files={user.offerLetters}
              onRemove={name => removeFile("offerLetters", name)}
            />
          </Section>

          {/* PROJECTS */}
          <Section title="Key Projects">
            <textarea
              name="projectsText"
              rows={5}
              value={user.projectsText}
              onChange={handleChange}
              placeholder="Project — Stack — Impact — Metrics"
            />

            <div className="repo-input">
              <input
                placeholder="Project Name"
                value={repoName}
                onChange={e => setRepoName(e.target.value)}
              />
              <input
                placeholder="GitHub Repo URL"
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
              />
              <button onClick={addRepo}>Add Repo</button>
            </div>

            {user.projectRepos.map(repo => (
              <div key={repo.name} className="repo-item">
                <span>{repo.name}</span>
                <a href={repo.url} target="_blank">Open</a>
                <button onClick={() => removeRepo(repo.name)}>Remove</button>
              </div>
            ))}
          </Section>

          {/* CERTIFICATIONS */}
          <Section title="Certifications">
            <textarea
              name="certificationsText"
              rows={3}
              value={user.certificationsText}
              onChange={handleChange}
            />

            <label className="file-upload">
              Upload Certificates
              <input hidden type="file" multiple
                onChange={e => readFiles(e.target.files, "certificates")}
              />
            </label>

            <FileList
              files={user.certificates}
              onRemove={name => removeFile("certificates", name)}
            />
          </Section>

        </div>
      </div>
    </>
  );
};

/* ---------- SMALL COMPONENTS ---------- */

const Section = ({ title, children }) => (
  <section>
    <h2>{title}</h2>
    {children}
  </section>
);

const FileList = ({ files, onRemove }) => (
  <div className="file-list">
    {files.map(f => (
      <div key={f.name} className="file-item">
        <span>{f.name}</span>
        <a href={f.data} target="_blank">View</a>
        <button onClick={() => onRemove(f.name)}>Remove</button>
      </div>
    ))}
  </div>
);

export default Profile;
