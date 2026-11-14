import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInterview } from "../context/InterviewContext";
import { getMyTestimonial, submitTestimonial } from "../services/testimonialService";
import "../styles/feedback.css";

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

const ScoreRing = ({ score, label, color }) => {
  const r = 30, circ = 2 * Math.PI * r;
  const fill = circ - (score / 100) * circ;
  return (
    <div className="score-ring-wrap">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7"/>
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={fill}
          strokeLinecap="round" transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dashoffset 1s ease" }}/>
        <text x="40" y="45" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">{score}%</text>
      </svg>
      <span className="score-ring-label">{label}</span>
    </div>
  );
};

const ProgressBar = ({ score, label }) => {
  const color =
    score >= 85 ? "#22c55e" :
    score >= 70 ? "#00e5ff" :
    score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="pb-row">
      <span className="pb-label">{label}</span>
      <div className="pb-track">
        <div className="pb-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="pb-val" style={{ color }}>{score}%</span>
    </div>
  );
};

const VERDICT_CONFIG = {
  Excellent: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.3)",  emoji: "🏆" },
  Good:      { color: "#00e5ff", bg: "rgba(0,229,255,0.08)", border: "rgba(0,229,255,0.25)", emoji: "✅" },
  Average:   { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", emoji: "📈" },
  "Needs Work": { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", emoji: "💪" },
};

const ROLE_LABELS = {
  frontend:    "Frontend Developer",
  backend:     "Backend Developer",
  fullstack:   "Full Stack Developer",
  devops:      "DevOps Engineer",
  datascience: "Data Scientist",
};

const Feedback = () => {
  const navigate = useNavigate();
  const { role }  = useParams();
  const { results, retakeSession } = useInterview();

  const sessionFeedback = results?.sessionFeedback || "";
  const parsed          = parseFeedback(sessionFeedback);
  const questionScores  = results?.questionScores  || [];
  const totalScore      = results?.totalScore ?? 0;
  const verdict         = results?.verdict || "Average";
  const vConf           = VERDICT_CONFIG[verdict] || VERDICT_CONFIG["Average"];

  const metrics = [
    { label: "Confidence",    val: results?.confidence    ?? 0, color: "#6366f1" },
    { label: "Clarity",       val: results?.clarity       ?? 0, color: "#00e5ff" },
    { label: "Sentiment",     val: results?.sentiment     ?? 0, color: "#22c55e" },
    { label: "Communication", val: results?.communication ?? 0, color: "#f59e0b" },
  ];

  // "Share your experience" — shown right after a completed session, since
  // that's the moment someone's most likely to have something to say.
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [testimonialSubmitted, setTestimonialSubmitted] = useState(false);
  const [testimonialQuote, setTestimonialQuote] = useState("");
  const [testimonialRating, setTestimonialRating] = useState(5);
  const [testimonialSubmitting, setTestimonialSubmitting] = useState(false);
  const [testimonialError, setTestimonialError] = useState("");

  useEffect(() => {
    getMyTestimonial()
      .then((res) => setShowTestimonialForm(!res.submitted))
      .catch(() => {});
  }, []);

  const handleSubmitTestimonial = async (e) => {
    e.preventDefault();
    if (!testimonialQuote.trim()) {
      setTestimonialError("Please write a short line about your experience.");
      return;
    }
    setTestimonialSubmitting(true);
    setTestimonialError("");
    try {
      await submitTestimonial(testimonialQuote.trim(), testimonialRating);
      setTestimonialSubmitted(true);
      setShowTestimonialForm(false);
    } catch (err) {
      setTestimonialError(err.message || "Couldn't submit your feedback — please try again.");
    } finally {
      setTestimonialSubmitting(false);
    }
  };

  return (
    <div className="fb-page">
      <div className="fb-bg">
        <div className="fb-orb fb-orb1" />
        <div className="fb-orb fb-orb2" />
        <div className="fb-orb fb-orb3" />
        <div className="fb-grid" />
      </div>
      <div className="fb-wrap">

        {/* ── HEADER ── */}
        <div className="fb-header">
          <div className="fb-role-pill">{ROLE_LABELS[role] || role} Interview</div>
          <h1 className="fb-title">Your Interview Results</h1>
          <p className="fb-sub">Here's a detailed breakdown of your performance</p>
        </div>

        {/* ── SCORE HERO ── */}
        <div className="fb-hero">
          <div className="fb-hero-left">
            <div className="fb-total-score" style={{ color: vConf.color }}>
              {totalScore}
            </div>
            <div className="fb-total-label">Overall Score</div>
            <div className="fb-verdict-badge"
              style={{ background: vConf.bg, border: `1px solid ${vConf.border}`, color: vConf.color }}>
              {vConf.emoji} {verdict}
            </div>
          </div>

          <div className="fb-hero-right">
            <div className="fb-rings">
              {metrics.map(m => (
                <ScoreRing key={m.label} score={m.val} label={m.label} color={m.color} />
              ))}
            </div>
          </div>
        </div>

        {/* ── PROGRESS BARS ── */}
        <div className="fb-card">
          <h3 className="fb-card-title">📊 Score Breakdown</h3>
          <div className="pb-list">
            {metrics.map(m => <ProgressBar key={m.label} score={m.val} label={m.label} />)}
            <ProgressBar score={totalScore} label="Overall" />
          </div>
        </div>

        {/* ── AI FEEDBACK SECTIONS ── */}
        {parsed ? (
          <div className="fb-sections">
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
              <div className="fb-card fb-verdict-card"
                style={{ background: vConf.bg, borderColor: vConf.border }}>
                <h3 className="fb-card-title" style={{ color: vConf.color }}>
                  {vConf.emoji} Final Verdict
                </h3>
                <p className="fb-para">{parsed.verdict}</p>
              </div>
            )}
          </div>
        ) : sessionFeedback ? (
          <div className="fb-card">
            <h3 className="fb-card-title">🤖 AI Feedback</h3>
            <pre className="fb-raw">{sessionFeedback}</pre>
          </div>
        ) : (
          <div className="fb-card fb-no-feedback">
            <span>🤖</span>
            <p>No AI feedback available for this session.</p>
          </div>
        )}

        {/* ── PER QUESTION ── */}
        {questionScores.length > 0 && (
          <div className="fb-card">
            <h3 className="fb-card-title">💬 Per-Question Breakdown</h3>
            <div className="fb-q-list">
              {questionScores.map((q, i) => {
                const qColor =
                  q.score >= 85 ? "#22c55e" :
                  q.score >= 70 ? "#00e5ff" :
                  q.score >= 50 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={i} className="fb-q-card">
                    <div className="fb-q-top">
                      <div className="fb-q-num">Q{i + 1}</div>
                      <p className="fb-q-text">{q.question}</p>
                      <div className="fb-q-score" style={{ color: qColor, borderColor: qColor }}>
                        {q.score}%
                      </div>
                    </div>
                    <div className="fb-q-metrics">
                      <span>Confidence <strong style={{ color: "#6366f1" }}>{q.confidence}%</strong></span>
                      <span>Clarity <strong style={{ color: "#00e5ff" }}>{q.clarity}%</strong></span>
                      <span>Sentiment <strong style={{ color: "#22c55e" }}>{q.sentiment}%</strong></span>
                    </div>
                    {q.transcript && (
                      <div className="fb-q-transcript">
                        "{q.transcript.substring(0, 180)}{q.transcript.length > 180 ? "…" : ""}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SHARE YOUR EXPERIENCE ── */}
        {(showTestimonialForm || testimonialSubmitted) && (
          <div className="fb-card fb-testimonial-card">
            {testimonialSubmitted ? (
              <p className="fb-testimonial-thanks">🙌 Thanks for sharing your feedback — it may appear on our homepage!</p>
            ) : (
              <form onSubmit={handleSubmitTestimonial}>
                <h3 className="fb-card-title">Enjoying the platform?</h3>
                <p className="fb-testimonial-sub">Share your experience — real feedback from real users appears on our homepage.</p>

                <div className="fb-testimonial-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      className={n <= testimonialRating ? "star active" : "star"}
                      onClick={() => setTestimonialRating(n)}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <textarea
                  className="fb-testimonial-textarea"
                  value={testimonialQuote}
                  onChange={(e) => setTestimonialQuote(e.target.value)}
                  placeholder="What's helped you most about practicing here?"
                  maxLength={400}
                  rows={3}
                />

                {testimonialError && <p className="fb-testimonial-error">{testimonialError}</p>}

                <div className="fb-testimonial-actions">
                  <button type="submit" className="fb-testimonial-submit" disabled={testimonialSubmitting}>
                    {testimonialSubmitting ? "Submitting…" : "Submit feedback"}
                  </button>
                  <button
                    type="button"
                    className="fb-testimonial-dismiss"
                    onClick={() => setShowTestimonialForm(false)}
                  >
                    Maybe later
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── ACTIONS ── */}
        <div className="fb-actions">
          <button className="fb-btn fb-btn-primary" onClick={() => navigate(`/scorecard/${role}`)}>
            📋 View Scorecard
          </button>
          <button className="fb-btn fb-btn-secondary" onClick={async () => { await retakeSession(); navigate(`/interview-room/${role}`); }}>
            🔁 Retake Interview
          </button>
          <button className="fb-btn fb-btn-ghost" onClick={() => navigate("/dashboard")}>
            📊 Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};

export default Feedback;