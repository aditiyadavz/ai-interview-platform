import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useWebRTC } from "../hooks/useWebRTC";
import { getFriendRoom, finishFriendRoom, joinRoomAsUser } from "../services/friendRoomService";
import Loader from "../components/common/Loader";
import "../styles/friendCallRoom.css";

const ROLE_LABELS = {
  frontend:"Frontend Developer", backend:"Backend Developer",
  fullstack:"Full Stack Developer", devops:"DevOps Engineer",
  datascience:"Data Scientist", dsa:"DSA / Algorithms",
  hr:"HR Interview", aiml:"AI / ML Engineer",
  security:"Security Engineer", data:"Data Analyst",
};

const VERDICT_EMOJI  = { Excellent:"🏆", Good:"✅", Average:"📈", "Needs Work":"💪" };
const VERDICT_COLOR  = { Excellent:"#22c55e", Good:"#00e5ff", Average:"#f59e0b", "Needs Work":"#ef4444" };

/* ─── helpers ─────────────────────────────────────── */
const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
};
const getUserId = (u) => u?._id || u?.id || null;

/* ═══════════════════════════════════════════════════ */
const FriendCallRoom = () => {
  const { code }       = useParams();
  const [sp]           = useSearchParams();
  const navigate       = useNavigate();

  // Default to "guest" unless ?as=host is explicitly set.
  // This prevents anyone navigating without the query param (or with a
  // copied host link) from accidentally claiming the host role.
  const asParam = sp.get("as");
  const as      = asParam === "host" ? "host" : "guest";

  const token = localStorage.getItem("token");
  const user  = getUser();
  const name  = user?.name || (as === "host" ? "Host" : "Guest");

  /* ── guard: must be logged in ── */
  useEffect(() => {
    if (!token || !user) {
      sessionStorage.setItem("friendRoomRedirect", `/friend-interview/join/${code}`);
      navigate("/login");
    }
  }, []); // eslint-disable-line

  /* ── local state ── */
  const [roomMeta,         setRoomMeta]         = useState(null);
  const [loadingMeta,      setLoadingMeta]       = useState(true);
  const [started,          setStarted]           = useState(false);
  const [ended,            setEnded]             = useState(false);
  const [questionIndex,    setQuestionIndex]     = useState(0);
  const [notes,            setNotes]             = useState({});
  const [scoreResult,      setScoreResult]       = useState(null);
  const [finishing,        setFinishing]         = useState(false);
  const [chatInput,        setChatInput]         = useState("");
  const [micFlip,          setMicFlip]           = useState(false);
  const [camFlip,          setCamFlip]           = useState(false);
  const [fullscreen,       setFullscreen]        = useState(false);
  const [registeredToRoom, setRegisteredToRoom]  = useState(false);
  const [peerMuted,        setPeerMuted]         = useState(false);
  const [peerCamOff,       setPeerCamOff]        = useState(false);
  const [activeTab,        setActiveTab]         = useState("interview");
  // Verified role from DB — prevents both users claiming "host"
  const [verifiedAs,       setVerifiedAs]        = useState(null);   // null = not yet verified
  const [roleVerified,     setRoleVerified]      = useState(false);

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatEndRef     = useRef(null);
  const roomRef        = useRef(null);

  const {
    connected, peerPresent, callActive,
    localStream, remoteStream,
    micOn, camOn, error, roomData, chatMessages, relayProvider,
    toggleMic, toggleCam, sendChatMessage, hangUp,
    emitInterviewEvent, onInterviewEvent,
  } = useWebRTC({ code, as: verifiedAs, name, enabled: roleVerified });

  /* ── attach media to video elements ── */
  useEffect(() => {
    const vid = localVideoRef.current;
    if (vid && localStream) {
      vid.srcObject = localStream;
      vid.muted = true; // must be set directly, not just as JSX prop
      vid.play().catch(() => {}); // autoplay policy — force play
    }
  }, [localStream]);

  useEffect(() => {
    const vid = remoteVideoRef.current;
    if (vid && remoteStream) {
      vid.srcObject = remoteStream;
      vid.play().catch(() => {});
    }
  }, [remoteStream]);

  // Extra safety: if the ref attaches after the stream is already set, re-attach
  const attachLocalVideo = useCallback((node) => {
    localVideoRef.current = node;
    if (node && localStream) {
      node.srcObject = localStream;
      node.muted = true;
      node.play().catch(() => {});
    }
  }, [localStream]);

  const attachRemoteVideo = useCallback((node) => {
    remoteVideoRef.current = node;
    if (node && remoteStream) {
      node.srcObject = remoteStream;
      node.play().catch(() => {});
    }
  }, [remoteStream]);

  /* ── sync state from room:joined (handles reconnects + late joins) ── */
  useEffect(() => {
    if (!roomData) return;
    if (roomData.interviewStarted) setStarted(true);
    if (roomData.interviewEnded)   setEnded(true);
    if (typeof roomData.questionIndex === "number") setQuestionIndex(roomData.questionIndex);
    if (roomData.notes && Object.keys(roomData.notes).length > 0)
      setNotes((prev) => ({ ...roomData.notes, ...prev }));
  }, [roomData]);

  /* ── socket event listeners ── */
  useEffect(() => {
    const offs = [
      onInterviewEvent("interview:start", () => setStarted(true)),
      onInterviewEvent("interview:next-question", ({ index }) => setQuestionIndex(index)),
      onInterviewEvent("interview:note", ({ index, notes: n, rating }) => {
        setNotes((prev) => ({ ...prev, [index]: { notes: n, rating } }));
      }),
      onInterviewEvent("interview:end", () => setEnded(true)),
      onInterviewEvent("interview:scorecard", (data) => setScoreResult(data)),
      onInterviewEvent("media:toggle", ({ kind, enabled }) => {
        if (kind === "mic") setPeerMuted(!enabled);
        if (kind === "cam") setPeerCamOff(!enabled);
      }),
    ];
    return () => offs.forEach((off) => off?.());
  }, [onInterviewEvent]);

  /* ── fetch room meta, verify role, register guest ── */
  useEffect(() => {
    if (!token) return;
    getFriendRoom(code)
      .then(async (data) => {
        setRoomMeta(data);

        // ── Role verification: ensure the URL param matches reality ──
        // If the room's hostId matches this user, they must be host.
        // If it doesn't match (or hostId not present), they must be guest.
        const userId = getUserId(user);
        const hostId = data.hostId || data.host?._id || data.host?.id;

        if (hostId && userId) {
          const shouldBeHost = String(hostId) === String(userId);
          const correctedAs  = shouldBeHost ? "host" : "guest";

          if (correctedAs !== as) {
            // URL param was wrong — silently fix without full page reload
            console.warn(`Role mismatch: URL says "${as}" but user is "${correctedAs}". Correcting.`);
            setVerifiedAs(correctedAs);
            // Update URL to reflect correct role (replace so back button still works)
            navigate(`/friend-interview/room/${code}?as=${correctedAs}`, { replace: true });
          } else {
            setVerifiedAs(as);
          }
        } else {
          // Can't verify from DB — trust the URL param
          setVerifiedAs(as);
        }

        setRoleVerified(true);

        if (as === "guest" && !registeredToRoom) {
          try { await joinRoomAsUser(code); setRegisteredToRoom(true); } catch { /* best-effort cleanup — safe to ignore */ }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMeta(false));
  }, [code, token]); // eslint-disable-line

  /* ── auto-scroll chat ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ── fullscreen API ── */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      roomRef.current?.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ── derived state ── */
  const isInterviewer = verifiedAs
    ? (roomData
        ? (roomData.hostIsInterviewer ? verifiedAs === "host" : verifiedAs === "guest")
        : verifiedAs === "host")
    : false;

  const questions  = roomData?.questions || roomMeta?.questions || [];
  const questionsSource = roomData?.questionsSource || roomMeta?.questionsSource || "ai";
  const currentQ   = questions[questionIndex] || "";

  /* ── interview controls (interviewer only) ── */
  const handleStartInterview = () => {
    setStarted(true);
    emitInterviewEvent("interview:start");
  };

  const handleNext = () => {
    const next = Math.min(questionIndex + 1, questions.length - 1);
    setQuestionIndex(next);
    emitInterviewEvent("interview:next-question", { index: next });
  };

  const handlePrev = () => {
    const prev = Math.max(questionIndex - 1, 0);
    setQuestionIndex(prev);
    emitInterviewEvent("interview:next-question", { index: prev });
  };

  const handleNoteChange = (text) => {
    const updated = { notes: text, rating: notes[questionIndex]?.rating || 0 };
    setNotes((p) => ({ ...p, [questionIndex]: updated }));
    emitInterviewEvent("interview:note", { index: questionIndex, ...updated });
  };

  const handleRatingChange = (rating) => {
    const updated = { notes: notes[questionIndex]?.notes || "", rating };
    setNotes((p) => ({ ...p, [questionIndex]: updated }));
    emitInterviewEvent("interview:note", { index: questionIndex, ...updated });
  };

  const handleEndInterview = async () => {
    setEnded(true);
    setFinishing(true);
    const candidateAnswers = questions.map((q, i) => ({
      questionIndex: i,
      questionText:  q,
      notes:         notes[i]?.notes  || "",
      rating:        notes[i]?.rating || 0,
    }));
    try {
      const result = await finishFriendRoom(code, candidateAnswers, getUserId(user));
      setScoreResult(result);
      emitInterviewEvent("interview:end");
      emitInterviewEvent("interview:scorecard", result);
    } catch (err) {
      console.error("Finish failed:", err);
      emitInterviewEvent("interview:end");
    } finally {
      setFinishing(false);
    }
  };

  const handleToggleMic = () => {
    toggleMic(); setMicFlip(true); setTimeout(() => setMicFlip(false), 320);
  };
  const handleToggleCam = () => {
    toggleCam(); setCamFlip(true); setTimeout(() => setCamFlip(false), 320);
  };
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput("");
  };

  const handleLeave = () => {
    hangUp();
    if (scoreResult) {
      const myId = verifiedAs === "host" ? scoreResult.hostInterviewId : scoreResult.guestInterviewId;
      if (myId) { navigate(`/interview/${myId}`); return; }
    }
    navigate("/dashboard");
  };

  /* ════════════════════════════════════════════════════
     LOADING
  ════════════════════════════════════════════════════ */
  if (!token || !user) return null;
  // Wait for role verification before rendering — prevents a flash of wrong role
  if (loadingMeta || !roleVerified) return <Loader text="Connecting to room..." />;

  /* ════════════════════════════════════════════════════
     ERROR
  ════════════════════════════════════════════════════ */
  if (error) return (
    <div className="fcr-root">
      <div className="fcr-error-screen">
        <div className="fcr-error-icon">⚠️</div>
        <h2>{error}</h2>
        <button onClick={() => navigate("/dashboard")}>← Dashboard</button>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════
     END / SCORECARD SCREEN
  ════════════════════════════════════════════════════ */
  if (ended) {
    const score   = scoreResult?.candidateScore  ?? null;
    const verdict = scoreResult?.candidateVerdict ?? null;
    const vColor  = VERDICT_COLOR[verdict]  || "#94a3b8";
    const vEmoji  = VERDICT_EMOJI[verdict]  || "📋";
    const circumference = 2 * Math.PI * 50;

    return (
      <div className="fcr-root">
        <div className="fcr-end-screen">
          <div className="fcr-end-icon">{vEmoji}</div>
          <h1 className="fcr-end-title">Interview Complete!</h1>
          <p className="fcr-end-sub">Great session, <strong>{name}</strong>.</p>

          {score !== null && (
            <div className="fcr-score-ring-wrap">
              <svg className="fcr-ring-svg" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" className="fcr-ring-bg" />
                <circle
                  cx="60" cy="60" r="50"
                  className="fcr-ring-fill"
                  style={{
                    stroke: vColor,
                    strokeDasharray: `${(score / 100) * circumference} ${circumference}`,
                  }}
                />
              </svg>
              <div className="fcr-ring-inner">
                <span className="fcr-ring-num">{score}</span>
                <span className="fcr-ring-den">/ 100</span>
              </div>
            </div>
          )}

          {verdict && (
            <div className="fcr-verdict-pill"
              style={{ background:`${vColor}18`, border:`1.5px solid ${vColor}55`, color: vColor }}>
              {vEmoji} {verdict}
            </div>
          )}

          {questions.length > 0 && (
            <div className="fcr-end-breakdown">
              <h3 className="fcr-end-breakdown-title">📝 Interviewer Feedback</h3>
              {questions.map((q, i) => (
                <div key={i} className="fcr-end-q-card">
                  <div className="fcr-end-q-num">Q{i + 1}</div>
                  <div className="fcr-end-q-body">
                    <p className="fcr-end-q-text">{q}</p>
                    {(notes[i]?.rating > 0 || notes[i]?.notes) && (
                      <div className="fcr-end-q-feedback">
                        {notes[i]?.rating > 0 && (
                          <div className="fcr-end-stars">
                            {[1,2,3,4,5].map(s => (
                              <span key={s} className={s <= notes[i].rating ? "star-on" : "star-off"}>★</span>
                            ))}
                            <span className="fcr-end-star-val">{notes[i].rating}/5</span>
                          </div>
                        )}
                        {notes[i]?.notes && (
                          <p className="fcr-end-remark">
                            <span className="fcr-remark-label">🎓 Feedback:</span> {notes[i].notes}
                          </p>
                        )}
                      </div>
                    )}
                    {!notes[i]?.rating && !notes[i]?.notes && (
                      <p className="fcr-end-no-feedback">No feedback recorded for this question.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="fcr-end-actions">
            {finishing ? (
              <button className="fcr-end-btn fcr-end-primary" disabled>⏳ Saving session...</button>
            ) : (
              <button className="fcr-end-btn fcr-end-primary" onClick={handleLeave}>
                📊 View Full Scorecard & History
              </button>
            )}
            <button className="fcr-end-btn fcr-end-ghost" onClick={() => navigate("/progress")}>
              📈 Progress Dashboard
            </button>
            <button className="fcr-end-btn fcr-end-ghost" onClick={() => navigate("/dashboard")}>
              🏠 Dashboard
            </button>
          </div>

          <p className="fcr-end-saved-note">
            ✅ This session has been saved to both users' interview history and will appear in Progress.
          </p>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════
     MAIN CALL ROOM
  ════════════════════════════════════════════════════ */
  return (
    <div className={`fcr-root ${fullscreen ? "fcr-fullscreen" : ""}`} ref={roomRef}>

      {/* ── HEADER ── */}
      <div className="fcr-header">
        <div className="fcr-header-left">
          <span className="fcr-brand">AI<span>Interview</span></span>
          <span className="fcr-code-badge">#{code}</span>
          <span className={`fcr-dot ${connected ? "online" : ""}`} />
          <span className="fcr-dot-label">{connected ? "Live" : "Connecting..."}</span>
        </div>
        <div className="fcr-header-center">
          {started && (
            <div className="fcr-q-pill">
              Q{questionIndex + 1}/{questions.length}
              <div className="fcr-q-pill-bar">
                <div className="fcr-q-pill-fill"
                  style={{ width:`${((questionIndex+1)/questions.length)*100}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="fcr-header-right">
          <span className={`fcr-role-pill ${isInterviewer ? "int" : "cand"}`}>
            {isInterviewer ? "🧑‍💼 Interviewer" : "🎤 Candidate"}
          </span>
          <span className="fcr-uname">{name}</span>
          <button className="fcr-fs-btn" onClick={toggleFullscreen} title="Toggle fullscreen">
            {fullscreen ? "⊠" : "⛶"}
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="fcr-body">

        {/* LEFT: videos */}
        <div className="fcr-video-col">

          {/* Pre-start banner */}
          {!started && (
            <div className="fcr-pre-banner">
              <div className="fcr-pre-banner-icon">
                {peerPresent ? "🟢" : "🟡"}
              </div>
              <div className="fcr-pre-banner-text">
                <strong>
                  {peerPresent
                    ? "Both participants connected — ready to begin"
                    : "Waiting for the other person to join..."}
                </strong>
                <span>
                  {isInterviewer
                    ? peerPresent
                      ? "Click 'Start Interview' in the panel to begin."
                      : "Share the room link with your candidate."
                    : "The interviewer will start the session shortly."}
                </span>
              </div>
            </div>
          )}

          {/* Video grid */}
          <div className="fcr-videos">

            {/* Local tile */}
            <div className="fcr-tile fcr-tile-local">
              <div className="fcr-tile-inner">
                {localStream
                  ? <video ref={attachLocalVideo} autoPlay playsInline muted
                      className={camOn ? "" : "fcr-vid-hidden"} />
                  : <div className="fcr-tile-placeholder"><div className="fcr-cam-spin"/>Starting camera...</div>
                }
                {!camOn && localStream && (
                  <div className="fcr-tile-placeholder fcr-cam-off">
                    <span>📷</span>Camera off
                  </div>
                )}
              </div>
              <div className="fcr-tile-bar">
                <span className="fcr-tile-name">
                  {name} · {isInterviewer ? "Interviewer" : "Candidate"}
                  {!micOn && <span className="fcr-muted-tag">🔇</span>}
                </span>
                {callActive && <span className="fcr-live-dot">● LIVE</span>}
              </div>
            </div>

            {/* Remote tile */}
            <div className="fcr-tile fcr-tile-remote">
              <div className="fcr-tile-inner">
                {remoteStream
                  ? <video ref={attachRemoteVideo} autoPlay playsInline
                      className={peerCamOff ? "fcr-vid-hidden" : ""} />
                  : <div className="fcr-tile-placeholder">
                      {peerPresent
                        ? <><div className="fcr-cam-spin"/>Connecting video...</>
                        : <><span>⏳</span>Waiting for peer...</>}
                    </div>
                }
                {peerCamOff && remoteStream && (
                  <div className="fcr-tile-placeholder fcr-cam-off">
                    <span>📷</span>Camera off
                  </div>
                )}
              </div>
              <div className="fcr-tile-bar">
                <span className="fcr-tile-name">
                  {peerPresent
                    ? isInterviewer ? "Candidate" : "Interviewer"
                    : "Waiting..."}
                  {peerMuted && <span className="fcr-muted-tag">🔇</span>}
                </span>
                {peerPresent && callActive && <span className="fcr-live-dot">● LIVE</span>}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="fcr-controls">
            <button
              className={`fcr-ctrl ${!micOn ? "off" : ""} ${micFlip ? "flip" : ""}`}
              onClick={handleToggleMic}
            >
              <span className="fcr-ctrl-icon">{micOn ? "🎙️" : "🔇"}</span>
              <span className="fcr-ctrl-lbl">{micOn ? "Mute" : "Unmute"}</span>
            </button>

            <button
              className={`fcr-ctrl ${!camOn ? "off" : ""} ${camFlip ? "flip" : ""}`}
              onClick={handleToggleCam}
            >
              <span className="fcr-ctrl-icon">{camOn ? "📹" : "📵"}</span>
              <span className="fcr-ctrl-lbl">{camOn ? "Camera" : "Off"}</span>
            </button>

            <button
              className={`fcr-ctrl ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab(activeTab === "chat" ? "interview" : "chat")}
            >
              <span className="fcr-ctrl-icon">💬</span>
              <span className="fcr-ctrl-lbl">Chat</span>
              {chatMessages.length > 0 && activeTab !== "chat" && (
                <span className="fcr-badge">{chatMessages.length}</span>
              )}
            </button>

            <button className="fcr-ctrl fcr-ctrl-fs" onClick={toggleFullscreen}>
              <span className="fcr-ctrl-icon">{fullscreen ? "⊠" : "⛶"}</span>
              <span className="fcr-ctrl-lbl">{fullscreen ? "Exit FS" : "Fullscreen"}</span>
            </button>

            <button className="fcr-ctrl fcr-ctrl-leave" onClick={handleLeave}>
              <span className="fcr-ctrl-icon">📴</span>
              <span className="fcr-ctrl-lbl">Leave</span>
            </button>
          </div>

          {!callActive && peerPresent && (
            <p className="fcr-conn-note">
              🔄 Establishing peer connection — may take a few seconds on some networks.
            </p>
          )}

          {relayProvider === "fallback" && (
            <p className="fcr-relay-note" title="Using a free public relay server. If you're on different network types (e.g. WiFi and mobile data), the connection may occasionally drop or take longer to reconnect.">
              ⚠️ Using free relay — connection may be less stable across different network types.
            </p>
          )}
        </div>

        {/* RIGHT: tabs panel */}
        <div className="fcr-panel">

          {/* Tab bar */}
          <div className="fcr-tabs">
            <button
              className={`fcr-tab ${activeTab === "interview" ? "active" : ""}`}
              onClick={() => setActiveTab("interview")}
            >📋 Interview</button>
            {isInterviewer && (
              <button
                className={`fcr-tab ${activeTab === "feedback" ? "active" : ""}`}
                onClick={() => setActiveTab("feedback")}
              >🎓 Feedback</button>
            )}
            <button
              className={`fcr-tab ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              💬 Chat
              {chatMessages.length > 0 && activeTab !== "chat" && (
                <span className="fcr-tab-badge">{chatMessages.length}</span>
              )}
            </button>
          </div>

          {/* ── INTERVIEW TAB ── */}
          {activeTab === "interview" && (
            <div className="fcr-tab-body">
              {!started ? (
                <div className="fcr-prestart">
                  <div className="fcr-prestart-icon">🎯</div>
                  <h3>{ROLE_LABELS[roomMeta?.role] || roomMeta?.role || "Interview"}</h3>
                  <p>{questions.length} questions · {roomMeta?.difficulty} difficulty</p>
                  {questionsSource === "fallback" && (
                    <span
                      className="practice-mode-badge"
                      title="AI question generation is temporarily unavailable — this room is using our curated question bank instead."
                    >
                      🧩 Practice Mode
                    </span>
                  )}

                  <div className={`fcr-role-card ${isInterviewer ? "int" : "cand"}`}>
                    <span>{isInterviewer ? "🧑‍💼" : "🎤"}</span>
                    <div>
                      <strong>{isInterviewer ? "You are the Interviewer" : "You are the Candidate"}</strong>
                      <p>
                        {isInterviewer
                          ? "You control questions and give feedback after each answer."
                          : "Answer each question out loud when it appears. The interviewer will rate and give feedback."}
                      </p>
                    </div>
                  </div>

                  {isInterviewer ? (
                    <button
                      className="fcr-start-btn"
                      onClick={handleStartInterview}
                      disabled={!peerPresent}
                    >
                      {peerPresent ? "▶️ Start Interview" : "⏳ Waiting for candidate..."}
                    </button>
                  ) : (
                    <div className="fcr-cand-wait">
                      <div className="fcr-pulse" />
                      <span>Waiting for the interviewer to start...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="fcr-active">
                  <div className="fcr-q-header">
                    <span className="fcr-q-label">Question {questionIndex + 1} of {questions.length}</span>
                    {questionsSource === "fallback" && (
                      <span className="practice-mode-badge" title="Using our curated question bank while AI question generation is unavailable.">
                        🧩 Practice Mode
                      </span>
                    )}
                    <div className="fcr-q-pbar">
                      <div className="fcr-q-pfill"
                        style={{ width:`${((questionIndex+1)/questions.length)*100}%` }}/>
                    </div>
                  </div>

                  <div className="fcr-q-box">{currentQ}</div>

                  {!isInterviewer && (
                    <div className="fcr-cand-hint">
                      🎤 Speak your answer clearly. Your interviewer will rate your response and navigate to the next question.
                    </div>
                  )}

                  {isInterviewer && (
                    <div className="fcr-q-nav">
                      <button className="fcr-nav-btn" onClick={handlePrev} disabled={questionIndex === 0}>
                        ← Prev
                      </button>
                      {questionIndex < questions.length - 1 ? (
                        <button className="fcr-nav-btn primary" onClick={handleNext}>
                          Next →
                        </button>
                      ) : (
                        <button
                          className="fcr-nav-btn end"
                          onClick={handleEndInterview}
                          disabled={finishing}
                        >
                          {finishing ? "Saving..." : "🏁 End Interview"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── FEEDBACK TAB (interviewer only) ── */}
          {activeTab === "feedback" && isInterviewer && (
            <div className="fcr-tab-body fcr-feedback-tab">
              {!started ? (
                <p className="fcr-feedback-hint">Start the interview to begin giving feedback.</p>
              ) : (
                <>
                  <div className="fcr-feedback-q-label">
                    Rating Q{questionIndex + 1}: <span>{currentQ.slice(0, 60)}{currentQ.length > 60 ? "…" : ""}</span>
                  </div>

                  <div className="fcr-star-row">
                    <span>Score:</span>
                    <div className="fcr-stars-large">
                      {[1,2,3,4,5].map((s) => (
                        <button
                          key={s}
                          className={`fcr-star-lg ${(notes[questionIndex]?.rating || 0) >= s ? "on" : ""}`}
                          onClick={() => handleRatingChange(s)}
                        >★</button>
                      ))}
                    </div>
                    {notes[questionIndex]?.rating > 0 && (
                      <span className="fcr-star-val">{notes[questionIndex].rating}/5</span>
                    )}
                  </div>

                  <textarea
                    className="fcr-remark-input"
                    placeholder="Remarks for this answer — e.g. 'Good use of examples, but missing time complexity analysis.' These appear in the final scorecard."
                    value={notes[questionIndex]?.notes || ""}
                    onChange={(e) => handleNoteChange(e.target.value)}
                  />

                  <p className="fcr-feedback-saved-hint">
                    💾 Feedback saves instantly and appears in the candidate's final scorecard.
                  </p>

                  <div className="fcr-all-ratings">
                    {questions.map((q, i) => (
                      <div
                        key={i}
                        className={`fcr-rating-chip ${i === questionIndex ? "current" : ""}`}
                        onClick={() => {
                          setQuestionIndex(i);
                          emitInterviewEvent("interview:next-question", { index: i });
                        }}
                      >
                        <span className="fcr-rc-num">Q{i+1}</span>
                        <span className="fcr-rc-stars">
                          {notes[i]?.rating ? "★".repeat(notes[i].rating) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {isInterviewer && started && (
                    <div className="fcr-end-row">
                      {questionIndex < questions.length - 1 ? (
                        <button className="fcr-nav-btn primary" onClick={handleNext}>Next Question →</button>
                      ) : (
                        <button
                          className="fcr-nav-btn end"
                          onClick={handleEndInterview}
                          disabled={finishing}
                        >
                          {finishing ? "Saving..." : "🏁 End Interview"}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── CHAT TAB ── */}
          {activeTab === "chat" && (
            <div className="fcr-tab-body fcr-chat-body">
              <div className="fcr-chat-msgs">
                {chatMessages.length === 0 && (
                  <p className="fcr-chat-empty">No messages yet. Use this if audio has issues.</p>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={`fcr-msg ${m.self || m.from === name ? "me" : ""}`}>
                    <span className="fcr-msg-from">{m.from}</span>
                    <span className="fcr-msg-text">{m.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="fcr-chat-input">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder="Type a message..."
                />
                <button onClick={handleSendChat}>Send</button>
              </div>
            </div>
          )}

        </div>{/* end fcr-panel */}
      </div>{/* end fcr-body */}
    </div>
  );
};

export default FriendCallRoom;