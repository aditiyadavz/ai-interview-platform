import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInterview } from "../context/InterviewContext";
import { shareScorecardImage, downloadScorecardImage } from "../utils/scorecardImage";
import "../styles/scorecard.css";

const VERDICT_CONFIG = {
  Excellent:    { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.35)",   emoji: "🏆", msg: "Outstanding performance!" },
  Good:         { color: "#00e5ff", bg: "rgba(0,229,255,0.08)",   border: "rgba(0,229,255,0.25)",   emoji: "✅", msg: "Strong performance!" },
  Average:      { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.3)",   emoji: "📈", msg: "Room to grow!" },
  "Needs Work": { color: "#ef4444", bg: "rgba(239,68,68,0.1)",    border: "rgba(239,68,68,0.3)",    emoji: "💪", msg: "Keep practising!" },
};

const ROLE_LABELS = {
  frontend:    { label: "Frontend Developer",   emoji: "🖥️" },
  backend:     { label: "Backend Developer",    emoji: "⚙️" },
  fullstack:   { label: "Full Stack Developer", emoji: "🔗" },
  devops:      { label: "DevOps Engineer",      emoji: "🚀" },
  datascience: { label: "Data Scientist",       emoji: "📊" },
  dsa:         { label: "DSA / Algorithms",     emoji: "🧮" },
  hr:          { label: "HR Interview",         emoji: "🤝" },
  aiml:        { label: "AI / ML Engineer",     emoji: "🤖" },
  security:    { label: "Security Engineer",    emoji: "🔐" },
  data:        { label: "Data Analyst",         emoji: "📈" },
};

const METRICS = [
  { key: "confidence",    label: "Confidence",    color: "#6366f1" },
  { key: "clarity",       label: "Clarity",       color: "#00e5ff" },
  { key: "sentiment",     label: "Sentiment",     color: "#22c55e" },
  { key: "communication", label: "Communication", color: "#f59e0b" },
];

/* Animated SVG ring */
const ScoreRing = ({ score, color }) => {
  const r = 70, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg className="sc-ring-svg" viewBox="0 0 160 160">
      <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
      <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 80 80)"
        style={{ transition: "stroke-dashoffset 1.2s ease" }} />
      <text x="80" y="74" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="800">{score}%</text>
      <text x="80" y="98" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">SCORE</text>
    </svg>
  );
};

const ScoreCard = () => {
  const navigate    = useNavigate();
  const { role }    = useParams();
  const { results } = useInterview();
  const [flipped, setFlipped] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareDone, setShareDone] = useState(false);

  const score      = results?.totalScore ?? 0;
  const verdict    = results?.verdict    ?? "Needs Work";
  const difficulty = results?.difficulty ?? "medium";
  const vConf      = VERDICT_CONFIG[verdict] || VERDICT_CONFIG["Needs Work"];
  const roleInfo   = ROLE_LABELS[role] || { label: role?.toUpperCase(), emoji: "💼" };
  const qScores    = results?.questionScores || [];

  const userName = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").name; } catch { return ""; }
  })();

  const shareData = {
    role, difficulty, score, verdict, userName, date: new Date(),
  };

  const linkedInShareText = `I just scored ${score}/100 on a ${roleInfo.label} mock interview using AI Interview Platform! 🚀 Practicing my interview skills one session at a time.`;

  const handleShare = async () => {
    setSharing(true);
    try {
      const result = await shareScorecardImage(shareData, linkedInShareText);
      if (result.method === "download") {
        setShareDone(true);
        setTimeout(() => setShareDone(false), 4000);
      }
    } catch (err) {
      console.error("Share failed:", err);
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    setSharing(true);
    try {
      await downloadScorecardImage(shareData, `${(roleInfo.label || "interview").replace(/\s+/g, "-").toLowerCase()}-scorecard.png`);
      setShareDone(true);
      setTimeout(() => setShareDone(false), 4000);
    } finally {
      setSharing(false);
    }
  };

  const handleLinkedInPost = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="sc-page">
      <div className="sc-bg">
        <div className="sc-orb sc-orb1" />
        <div className="sc-orb sc-orb2" />
        <div className="sc-orb sc-orb3" />
        <div className="sc-grid" />
      </div>

      <div className="sc-header">
        <h1 className="sc-title">Interview Score Card</h1>
        <p className="sc-hint">Click the card to flip</p>
      </div>

      {/* ── FLIP CARD ── */}
      <div className={`sc-scene ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(f => !f)}>
        <div className="sc-card">

          {/* FRONT */}
          <div className="sc-face sc-front">
            <div className="sc-front-left">
              <ScoreRing score={score} color={vConf.color} />
              <div className="sc-verdict-badge"
                style={{ background: vConf.bg, border: `1px solid ${vConf.border}`, color: vConf.color }}>
                {vConf.emoji} {verdict}
              </div>
              <p className="sc-verdict-msg" style={{ color: vConf.color }}>{vConf.msg}</p>
            </div>

            <div className="sc-front-right">
              <div className="sc-role-pill">
                <span>{roleInfo.emoji}</span>
                <span>{roleInfo.label}</span>
              </div>
              <div className="sc-info-rows">
                <div className="sc-info-row">
                  <span className="sc-info-label">Difficulty</span>
                  <span className="sc-info-val sc-diff">{difficulty}</span>
                </div>
                {results?.company && (
                  <div className="sc-info-row">
                    <span className="sc-info-label">Style</span>
                    <span className="sc-info-val">{results.company.charAt(0).toUpperCase() + results.company.slice(1)} mode</span>
                  </div>
                )}
                <div className="sc-info-row">
                  <span className="sc-info-label">Questions</span>
                  <span className="sc-info-val">{qScores.length || 5}</span>
                </div>
                <div className="sc-info-row">
                  <span className="sc-info-label">Total Score</span>
                  <span className="sc-info-val" style={{ color: vConf.color, fontWeight: 800 }}>{score}%</span>
                </div>
                <div className="sc-info-row">
                  <span className="sc-info-label">Verdict</span>
                  <span className="sc-info-val" style={{ color: vConf.color }}>{verdict}</span>
                </div>
              </div>
              <div className="sc-flip-hint">
                <span>🔄 Flip for breakdown</span>
              </div>
            </div>
          </div>

          {/* BACK */}
          <div className="sc-face sc-back">
            <div className="sc-back-left">
              <h3 className="sc-back-section-title">📊 Skill Metrics</h3>
              <div className="sc-metrics">
                {METRICS.map(m => {
                  const val = results?.[m.key] ?? 0;
                  return (
                    <div key={m.key} className="sc-metric-row">
                      <span className="sc-metric-label">{m.label}</span>
                      <div className="sc-metric-track">
                        <div className="sc-metric-fill"
                          style={{ width: `${val}%`, background: m.color }} />
                      </div>
                      <span className="sc-metric-val" style={{ color: m.color }}>{val}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sc-back-divider" />

            <div className="sc-back-right">
              <h3 className="sc-back-section-title">💬 Per Question</h3>
              <div className="sc-q-list">
                {(qScores.length ? qScores : Array(5).fill(null)).map((q, i) => {
                  const val = q?.score ?? 0;
                  const qColor =
                    val >= 85 ? "#22c55e" :
                    val >= 70 ? "#00e5ff" :
                    val >= 50 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={i} className="sc-q-row">
                      <span className="sc-q-label">Q{i + 1}</span>
                      <div className="sc-metric-track">
                        <div className="sc-metric-fill" style={{ width: `${val}%`, background: qColor }} />
                      </div>
                      <span className="sc-metric-val" style={{ color: qColor }}>{val}%</span>
                    </div>
                  );
                })}
              </div>
              <div className="sc-flip-hint back-hint">
                <span>🔄 Flip back</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── ACTIONS ── */}
      <div className="sc-actions">
        <button className="sc-btn sc-btn-primary" onClick={() => navigate(`/feedback/${role}`)}>
          🤖 View AI Feedback
        </button>
        <button className="sc-btn sc-btn-secondary" onClick={() => navigate(`/interview-setup/${role}`)}>
          🔁 Retake
        </button>
        <button className="sc-btn sc-btn-ghost" onClick={() => navigate("/dashboard")}>
          📊 Dashboard
        </button>
      </div>

      {/* ── SHARE ── */}
      <div className="sc-share-row">
        <button className="sc-share-btn sc-share-primary" onClick={handleShare} disabled={sharing}>
          {sharing ? "Generating..." : "📤 Share Scorecard"}
        </button>
        <button className="sc-share-btn" onClick={handleDownload} disabled={sharing}>
          ⬇️ Download Image
        </button>
        <button className="sc-share-btn sc-share-linkedin" onClick={async () => { await handleDownload(); handleLinkedInPost(); }}>
          in Post to LinkedIn
        </button>
      </div>
      {shareDone && (
        <div className="sc-share-toast">
          ✅ Image downloaded — attach it to your LinkedIn post!
        </div>
      )}

    </div>
  );
};

export default ScoreCard;