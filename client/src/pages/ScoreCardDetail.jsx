import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchInterview } from "../services/interviewService";
import { shareScorecardImage, downloadScorecardImage } from "../utils/scorecardImage";
import Loader from "../components/common/Loader";
import "../styles/scorecard.css";
import "../styles/feedback.css";

/* ── shared configs ── */
const VERDICT_CONFIG = {
  Excellent:    { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.35)",  emoji: "🏆", msg: "Outstanding performance!" },
  Good:         { color: "#00e5ff", bg: "rgba(0,229,255,0.08)",  border: "rgba(0,229,255,0.25)",  emoji: "✅", msg: "Strong performance!" },
  Average:      { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)",  emoji: "📈", msg: "Room to grow!" },
  "Needs Work": { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",   emoji: "💪", msg: "Keep practising!" },
};

const ROLE_LABELS = {
  frontend:    { label: "Frontend Developer",    emoji: "🖥️" },
  backend:     { label: "Backend Developer",     emoji: "⚙️" },
  fullstack:   { label: "Full Stack Developer",  emoji: "🔗" },
  devops:      { label: "DevOps Engineer",       emoji: "🚀" },
  datascience: { label: "Data Scientist",        emoji: "📊" },
  dsa:         { label: "DSA / Algorithms",      emoji: "🧮" },
  hr:          { label: "HR Interview",          emoji: "🤝" },
  aiml:        { label: "AI / ML Engineer",      emoji: "🤖" },
  security:    { label: "Security Engineer",     emoji: "🔐" },
  data:        { label: "Data Analyst",          emoji: "📈" },
};

const METRICS = [
  { key: "confidence",    label: "Confidence",    color: "#6366f1" },
  { key: "clarity",       label: "Clarity",       color: "#00e5ff" },
  { key: "sentiment",     label: "Sentiment",     color: "#22c55e" },
  { key: "communication", label: "Communication", color: "#f59e0b" },
];

/* ── Score ring ── */
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

/* ── AI feedback parser ── */
const parseFeedback = (text) => {
  if (!text) return null;
  const patterns = {
    overall:      /OVERALL ASSESSMENT:\s*([\s\S]*?)(?=TOP STRENGTHS:|$)/i,
    strengths:    /TOP STRENGTHS:\s*([\s\S]*?)(?=KEY AREAS|$)/i,
    improvements: /KEY AREAS TO IMPROVE:\s*([\s\S]*?)(?=STUDY RECOMMENDATIONS:|$)/i,
    study:        /STUDY RECOMMENDATIONS:\s*([\s\S]*?)(?=FINAL VERDICT:|$)/i,
    verdict:      /FINAL VERDICT:\s*([\s\S]*?)$/i,
  };
  const sections = {};
  Object.entries(patterns).forEach(([key, re]) => {
    const m = text.match(re);
    if (m) sections[key] = m[1].trim();
  });
  return Object.keys(sections).length > 0 ? sections : null;
};

const BulletList = ({ text }) => {
  if (!text) return null;
  const items = text.split("\n").filter(l => l.trim().startsWith("•") || l.trim().startsWith("-"));
  if (!items.length) return <p className="fb-para">{text}</p>;
  return (
    <ul className="fb-list">
      {items.map((item, i) => <li key={i}>{item.replace(/^[•-]\s*/, "")}</li>)}
    </ul>
  );
};

/* ── Main component ── */
const ScoreCardDetail = () => {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [flipped, setFlipped] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareDone, setShareDone] = useState(false);

  useEffect(() => {
    fetchInterview(id)
      .then(setData)
      .catch(err => setError(err.message || "Failed to load interview"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader text="Loading interview details…" />;
  if (error)   return (
    <div className="sc-page">
      <p style={{ color: "#ef4444", textAlign: "center", padding: "60px" }}>⚠️ {error}</p>
      <div className="sc-actions">
        <button className="sc-btn sc-btn-ghost" onClick={() => navigate("/interview-history")}>← Back to History</button>
      </div>
    </div>
  );

  const score    = data?.totalScore   ?? 0;
  const verdict  = data?.verdict      ?? "Needs Work";
  const role     = data?.role         ?? "frontend";
  const diff     = data?.difficulty   ?? "medium";
  const answers  = data?.answers      ?? [];
  const vConf    = VERDICT_CONFIG[verdict]  || VERDICT_CONFIG["Needs Work"];
  const roleInfo = ROLE_LABELS[role]        || { label: role, emoji: "💼" };
  const date     = new Date(data?.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  /* build metrics from answer averages */
  const avg = (key) => answers.length
    ? Math.round(answers.reduce((s, a) => s + (a[key] || 0), 0) / answers.length) : 0;
  const metrics = { confidence: avg("confidence"), clarity: avg("clarity"), sentiment: avg("sentiment"), communication: avg("confidence") };

  const parsed = parseFeedback(data?.aiFeedback);

  const userName = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").name; } catch { return ""; }
  })();

  const shareData = { role, difficulty: diff, score, verdict, userName, date: data?.createdAt || new Date() };
  const linkedInShareText = `I scored ${score}/100 on a ${roleInfo.label} mock interview using AI Interview Platform! 🚀`;

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
      await downloadScorecardImage(shareData, `${roleInfo.label.replace(/\s+/g, "-").toLowerCase()}-scorecard.png`);
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
    <div className="sc-page" style={{ paddingBottom: "80px" }}>

      {/* ── HEADER ── */}
      <div className="sc-header">
        <div className="ih-back-btn" onClick={() => navigate("/interview-history")}>
          ← Back to History
        </div>
        <h1 className="sc-title">Interview Details</h1>
        <p className="sc-hint">
          {roleInfo.emoji} {roleInfo.label} · {diff} · {date}
        </p>
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
              <div className="sc-role-pill"><span>{roleInfo.emoji}</span><span>{roleInfo.label}</span></div>
              <div className="sc-info-rows">
                <div className="sc-info-row">
                  <span className="sc-info-label">Difficulty</span>
                  <span className="sc-info-val sc-diff">{diff}</span>
                </div>
                <div className="sc-info-row">
                  <span className="sc-info-label">Questions</span>
                  <span className="sc-info-val">{answers.length}</span>
                </div>
                <div className="sc-info-row">
                  <span className="sc-info-label">Total Score</span>
                  <span className="sc-info-val" style={{ color: vConf.color, fontWeight: 800 }}>{score}%</span>
                </div>
                <div className="sc-info-row">
                  <span className="sc-info-label">Date</span>
                  <span className="sc-info-val">{date}</span>
                </div>
              </div>
              <div className="sc-flip-hint"><span>🔄 Flip for breakdown</span></div>
            </div>
          </div>

          {/* BACK */}
          <div className="sc-face sc-back">
            <div className="sc-back-left">
              <h3 className="sc-back-section-title">📊 Skill Metrics</h3>
              <div className="sc-metrics">
                {METRICS.map(m => (
                  <div key={m.key} className="sc-metric-row">
                    <span className="sc-metric-label">{m.label}</span>
                    <div className="sc-metric-track">
                      <div className="sc-metric-fill" style={{ width: `${metrics[m.key] ?? 0}%`, background: m.color }} />
                    </div>
                    <span className="sc-metric-val" style={{ color: m.color }}>{metrics[m.key] ?? 0}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="sc-back-divider" />
            <div className="sc-back-right">
              <h3 className="sc-back-section-title">💬 Per Question</h3>
              <div className="sc-q-list">
                {answers.map((a, i) => {
                  const val = a.score ?? 0;
                  const qColor = val >= 85 ? "#22c55e" : val >= 70 ? "#00e5ff" : val >= 50 ? "#f59e0b" : "#ef4444";
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
              <div className="sc-flip-hint back-hint"><span>🔄 Flip back</span></div>
            </div>
          </div>

        </div>
      </div>

      {/* ── AI FEEDBACK ── */}
      <div style={{ width: "100%", maxWidth: "820px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {parsed ? (
          <>
            {parsed.overall && (
              <div className="fb-card">
                <h3 className="fb-card-title">🤖 Overall Assessment</h3>
                <p className="fb-para">{parsed.overall}</p>
              </div>
            )}
            <div className="fb-two-col">
              {parsed.strengths && (
                <div className="fb-card fb-card-green">
                  <h3 className="fb-card-title">✅ Top Strengths</h3>
                  <BulletList text={parsed.strengths} />
                </div>
              )}
              {parsed.improvements && (
                <div className="fb-card fb-card-red">
                  <h3 className="fb-card-title">🎯 Areas to Improve</h3>
                  <BulletList text={parsed.improvements} />
                </div>
              )}
            </div>
            {parsed.study && (
              <div className="fb-card fb-card-blue">
                <h3 className="fb-card-title">📚 Study Recommendations</h3>
                <BulletList text={parsed.study} />
              </div>
            )}
            {parsed.verdict && (
              <div className="fb-card" style={{ background: vConf.bg, borderColor: vConf.border }}>
                <h3 className="fb-card-title" style={{ color: vConf.color }}>{vConf.emoji} Final Verdict</h3>
                <p className="fb-para">{parsed.verdict}</p>
              </div>
            )}
          </>
        ) : data?.aiFeedback ? (
          <div className="fb-card">
            <h3 className="fb-card-title">🤖 AI Feedback</h3>
            <pre className="fb-raw">{data.aiFeedback}</pre>
          </div>
        ) : (
          <div className="fb-card fb-no-feedback">
            <span>🤖</span>
            <p>No AI feedback was saved for this session.</p>
          </div>
        )}

        {/* Per question transcripts */}
        {answers.length > 0 && (
          <div className="fb-card">
            <h3 className="fb-card-title">💬 Per-Question Breakdown</h3>
            <div className="fb-q-list">
              {answers.map((a, i) => {
                const qColor = a.score >= 85 ? "#22c55e" : a.score >= 70 ? "#00e5ff" : a.score >= 50 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={i} className="fb-q-card">
                    <div className="fb-q-top">
                      <div className="fb-q-num">Q{i + 1}</div>
                      <p className="fb-q-text">{a.questionText}</p>
                      <div className="fb-q-score" style={{ color: qColor, borderColor: qColor }}>{a.score}%</div>
                    </div>
                    <div className="fb-q-metrics">
                      <span>Confidence <strong style={{ color: "#6366f1" }}>{a.confidence}%</strong></span>
                      <span>Clarity <strong style={{ color: "#00e5ff" }}>{a.clarity}%</strong></span>
                      <span>Sentiment <strong style={{ color: "#22c55e" }}>{a.sentiment}%</strong></span>
                    </div>
                    {a.transcript && (
                      <div className="fb-q-transcript">
                        "{a.transcript.substring(0, 200)}{a.transcript.length > 200 ? "…" : ""}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── ACTIONS ── */}
      <div className="sc-actions">
        <button className="sc-btn sc-btn-secondary" onClick={() => navigate(`/interview-setup/${role}`)}>
          🔁 Retake
        </button>
        <button className="sc-btn sc-btn-ghost" onClick={() => navigate("/interview-history")}>
          ← History
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

export default ScoreCardDetail;