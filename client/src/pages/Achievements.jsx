import { useState, useEffect } from "react";
import {
  fetchBadges,
  fetchLeaderboard,
  fetchCertificate,
  fetchAchievementStats,
} from "../services/achievementsService";
import "../styles/achievements.css";

/* ── helpers ─────────────────────────────────────────────────────────────── */
const getInitials = (name = "") =>
  name.split(" ").slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";

/* ════════════════════════════════════════════════════════════════════════════
   LEFT PANELS
   ════════════════════════════════════════════════════════════════════════════ */

function BadgesPanel({ badges, loading }) {
  if (loading) return <div className="ach-loading">Loading badges…</div>;
  if (!badges.length)
    return (
      <div className="empty-state">
        <span className="empty-icon">🏅</span>
        <p>Complete interviews to earn badges!</p>
      </div>
    );
  return (
    <div className="badges-panel">
      <div className="panel-header-row">
        <h3 className="panel-title">Badge Collection</h3>
        <span className="panel-count">
          {badges.filter((b) => b.earned).length} / {badges.length} earned
        </span>
      </div>
      <div className="badges-grid">
        {badges.map((badge) => (
          <div
            key={badge.id || badge._id || badge.name}
            className={`badge-card ${badge.earned ? "earned" : "locked"}`}
          >
            <div className="badge-icon">{badge.icon || "🎖️"}</div>
            <p className="badge-name">{badge.name}</p>
            <p className="badge-desc">{badge.description}</p>
            {badge.earned && badge.earnedAt && (
              <span className="badge-date">
                {new Date(badge.earnedAt).toLocaleDateString()}
              </span>
            )}
            {!badge.earned && <span className="badge-locked-label">Locked</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CertificatesPanel({ interviews, loading }) {
  const [certs, setCerts]       = useState([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!interviews.length) return;
    setFetching(true);
    // interviews that scored ≥ 70 are eligible
    const eligible = interviews.filter((iv) => (iv.totalScore ?? iv.score ?? 0) >= 70);
    Promise.allSettled(
      eligible.map((iv) => fetchCertificate(iv._id || iv.interviewId))
    ).then((results) => {
      const valid = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value?.certificate)
        .filter(Boolean);
      setCerts(valid);
      setFetching(false);
    });
  }, [interviews]);

  if (loading || fetching) return <div className="ach-loading">Loading certificates…</div>;

  if (!certs.length)
    return (
      <div className="empty-state">
        <span className="empty-icon">📜</span>
        <p>Score 70%+ in any interview to earn a certificate!</p>
      </div>
    );

  return (
    <div className="certificates-panel">
      <div className="panel-header-row">
        <h3 className="panel-title">Certificates</h3>
        <span className="panel-count">{certs.length} earned</span>
      </div>
      <div className="certs-grid">
        {certs.map((cert) => (
          <div key={cert.interviewId || cert.certificateId} className="cert-card">
            <div className="cert-ribbon">🎓</div>
            <div className="cert-body">
              <h4 className="cert-role">{cert.role}</h4>
              <p className="cert-score">
                Score: <strong>{cert.score}%</strong>
                {cert.verdict && <span className="cert-verdict"> · {cert.verdict}</span>}
              </p>
              <p className="cert-id">#{cert.certificateId}</p>
              <p className="cert-date">
                {new Date(cert.completedAt).toLocaleDateString("en-IN", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   RIGHT PANEL — Leaderboard (uses real /api/achievements/leaderboard)
   ════════════════════════════════════════════════════════════════════════════ */

function LeaderboardPanel() {
  const [board,      setBoard]   = useState([]);
  const [me,         setMe]      = useState(null);
  const [totalUsers, setTotal]   = useState(0);
  const [loading,    setLoading] = useState(true);
  const [error,      setError]   = useState(null);

  useEffect(() => {
    fetchLeaderboard()
      .then((res) => {
        // achievementsService does .then(r => r.data), so res IS r.data
        // but handle both shapes just in case
        const payload = res?.leaderboard !== undefined ? res : (res?.data ?? res ?? {});
        setBoard(payload.leaderboard || []);
        setMe(payload.currentUserEntry || null);
        setTotal(payload.total || 0);
      })
      .catch((e) => {
        console.error("Leaderboard fetch failed:", e);
        setError("Failed to load leaderboard.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="ach-loading">Loading leaderboard…</div>;
  if (error)   return <div className="ach-error">{error}</div>;

  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div className="leaderboard-panel">

      {/* ── my rank strip ── */}
      {me ? (
        <div className="lb-my-rank">
          <div className="lb-my-rank-left">
            <span className="lb-my-label">Your Rank</span>
            <span className="lb-my-number">#{me.rank}</span>
            <span className="lb-my-of">of {totalUsers} participants</span>
          </div>
          <div className="lb-my-stats">
            <div className="lb-stat">
              <span className="lb-stat-val">{me.avgScore}</span>
              <span className="lb-stat-lbl">Avg Score</span>
            </div>
            <div className="lb-stat">
              <span className="lb-stat-val">{me.bestScore}</span>
              <span className="lb-stat-lbl">Best</span>
            </div>
            <div className="lb-stat">
              <span className="lb-stat-val">{me.totalSessions}</span>
              <span className="lb-stat-lbl">Sessions</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="lb-no-rank">
          🎯 Complete an interview to appear on the leaderboard!
        </div>
      )}

      {/* ── podium (top 3) ── */}
      {board.length >= 3 && (
        <div className="lb-podium">
          {/* order: 2nd, 1st, 3rd */}
          {[board[1], board[0], board[2]].map((user, idx) => {
            const rank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
            return (
              <div key={user._id} className={`lb-podium-item lb-podium-${rank}`}>
                <div className="lb-pod-avatar">
                  {user.profilePic
                    ? <img src={user.profilePic} alt={user.name} />
                    : <span>{getInitials(user.name)}</span>}
                  <span className="lb-pod-medal">{MEDALS[rank - 1]}</span>
                </div>
                <p className="lb-pod-name">{user.name?.split(" ")[0]}</p>
                <p className="lb-pod-score">{user.avgScore}% avg</p>
                <div className="lb-pod-block" />
              </div>
            );
          })}
        </div>
      )}

      {/* ── ranked list ── */}
      {board.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🏆</span>
          <p>No participants yet. Be the first!</p>
        </div>
      ) : (
        <ul className="lb-list">
          {board.map((user) => (
            <li
              key={user._id}
              className={`lb-row ${user.isCurrentUser ? "lb-row--me" : ""}`}
            >
              {/* rank */}
              <span className="lb-row-rank">
                {user.rank <= 3
                  ? <span className="lb-medal">{MEDALS[user.rank - 1]}</span>
                  : <span className="lb-rank-num">{user.rank}</span>}
              </span>

              {/* avatar + name */}
              <span className="lb-row-user">
                <span className="lb-row-avatar">
                  {user.profilePic
                    ? <img src={user.profilePic} alt={user.name} />
                    : <span>{getInitials(user.name)}</span>}
                </span>
                <span className="lb-row-name">
                  {user.name}
                  {user.isCurrentUser && <span className="lb-you">you</span>}
                </span>
              </span>

              {/* scores + badge */}
              <span className="lb-row-stats">
                <span className="lb-row-total">{user.avgScore}%</span>
                <span className="lb-row-meta">
                  best {user.bestScore}% · {user.totalSessions} sessions
                </span>
                {user.badge && (
                  <span
                    className="lb-row-badge"
                    style={{ color: user.badge.color }}
                  >
                    {user.badge.label}
                  </span>
                )}
              </span>
            </li>
          ))}

          {/* show current user below top-50 if they're outside */}
          {me?.outsideTop50 && (
            <>
              <li className="lb-row lb-row-ellipsis">
                <span className="lb-row-rank">…</span>
                <span className="lb-row-user" />
                <span className="lb-row-stats" />
              </li>
              <li className="lb-row lb-row--me">
                <span className="lb-row-rank">
                  <span className="lb-rank-num">{me.rank}</span>
                </span>
                <span className="lb-row-user">
                  <span className="lb-row-avatar">
                    {me.profilePic
                      ? <img src={me.profilePic} alt={me.name} />
                      : <span>{getInitials(me.name)}</span>}
                  </span>
                  <span className="lb-row-name">
                    {me.name}
                    <span className="lb-you">you</span>
                  </span>
                </span>
                <span className="lb-row-stats">
                  <span className="lb-row-total">{me.avgScore}%</span>
                  <span className="lb-row-meta">
                    best {me.bestScore}% · {me.totalSessions} sessions
                  </span>
                </span>
              </li>
            </>
          )}
        </ul>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════════════ */

export default function Achievements() {
  const [activeTab,  setActiveTab]  = useState("badges");
  const [badges,     setBadges]     = useState([]);
  const [interviews] = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.allSettled([fetchBadges(), fetchAchievementStats()])
      .then(([badgesRes, statsRes]) => {
        if (badgesRes.status === "fulfilled") {
          const b = badgesRes.value;
          setBadges(b?.badges || b?.data?.badges || []);
        }
        if (statsRes.status === "fulfilled") {
          const s = statsRes.value;
          setStats(s?.totalSessions !== undefined ? s : (s?.data ?? s));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const badgeEarnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="achievements-page">

      {/* ── hero ── */}
      <div className="ach-hero">
        <span className="ach-hero-label">ACHIEVEMENTS</span>
        <h1 className="ach-hero-title">
          Your <span className="ach-hero-accent">Hall of Fame</span>
        </h1>
        <p className="ach-hero-sub">
          Badges, certificates &amp; leaderboard — keep pushing!
        </p>

        {/* stats bar */}
        {stats && (
          <div className="ach-stats-bar">
            <div className="ach-stat-item">
              <span className="ach-stat-val">{stats.totalSessions}</span>
              <span className="ach-stat-lbl">Interviews</span>
            </div>
            <div className="ach-stat-item">
              <span className="ach-stat-val">{stats.avgScore}%</span>
              <span className="ach-stat-lbl">Avg Score</span>
            </div>
            <div className="ach-stat-item">
              <span className="ach-stat-val">{stats.bestScore}%</span>
              <span className="ach-stat-lbl">Best Score</span>
            </div>
            <div className="ach-stat-item">
              <span className="ach-stat-val">{stats.currentStreak}🔥</span>
              <span className="ach-stat-lbl">Streak</span>
            </div>
            <div className="ach-stat-item">
              <span className="ach-stat-val">{stats.certificatesEarned}</span>
              <span className="ach-stat-lbl">Certificates</span>
            </div>
          </div>
        )}
      </div>

      {/* ── two-column layout ── */}
      <div className="ach-layout">

        {/* LEFT — Badges / Certificates */}
        <div className="ach-left">
          <div className="ach-tabs">
            <button
              className={`ach-tab ${activeTab === "badges" ? "active" : ""}`}
              onClick={() => setActiveTab("badges")}
            >
              🏅 Badges
              {badgeEarnedCount > 0 && (
                <span className="ach-tab-count">{badgeEarnedCount}</span>
              )}
            </button>
            <button
              className={`ach-tab ${activeTab === "certificates" ? "active" : ""}`}
              onClick={() => setActiveTab("certificates")}
            >
              📜 Certificates
              {stats?.certificatesEarned > 0 && (
                <span className="ach-tab-count">{stats.certificatesEarned}</span>
              )}
            </button>
          </div>

          <div className="ach-panel">
            {activeTab === "badges" && (
              <BadgesPanel badges={badges} loading={loading} />
            )}
            {activeTab === "certificates" && (
              <CertificatesPanel interviews={interviews} loading={loading} />
            )}
          </div>
        </div>

        {/* RIGHT — Leaderboard */}
        <div className="ach-right">
          <div className="ach-right-header">
            <span className="ach-right-title">🏆 Leaderboard</span>
            <span className="ach-right-sub">Top 50 performers</span>
          </div>
          <LeaderboardPanel />
        </div>

      </div>
    </div>
  );
}