import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useRecorder from "../hooks/useRecorder";
import useProctor from "../hooks/useProctor";
import { analyzeAnswer } from "../utils/analyzeAnswer";
import { submitResumeInterview } from "../services/resumeInterviewService";
import "../styles/interview.css";
import "../styles/resumeInterview.css";

const ResumeInterviewRoom = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [started, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inputMode, setInputMode] = useState("speech");
  const [typedText, setTypedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phaseIntro, setPhaseIntro] = useState("technical"); // shown before each phase begins

  const questions = state ? [...(state.technicalQuestions || []), ...(state.hrQuestions || [])] : [];
  const phases = state?.phases || [];
  const interviewId = state?.interviewId;
  const questionsSource = state?.source;

  const { transcript, isRecording, error, startRecording, stopRecording, resetTranscript } =
    useRecorder({ echoSuppression: false });

  const transcriptRef = useRef("");
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const allAnswersRef = useRef([]);

  useEffect(() => {
    if (!interviewId || !questions.length) navigate("/resume-interview/setup", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTerminate = async ({ violations, reason }) => {
    // Auto-submit whatever was answered so far, flagged for review
    stopRecording();
    setSubmitting(true);
    try {
      await submitResumeInterview(interviewId, {
        answers: allAnswersRef.current,
        proctor: { violations, flagged: true, log: [...proctor.log, reason] },
      });
    } catch { /* best effort */ }
    navigate("/resume-interview/results", {
      state: { terminated: true, reason, violations },
    });
  };

  const proctor = useProctor({ active: started, onTerminate: handleTerminate });

  const beginInterview = async () => {
    await proctor.requestFullscreen();
    setStarting(true);
    await startRecording();
  };

  const currentPhase = phases[currentIndex];

  const switchToText = () => { stopRecording(); setInputMode("text"); };
  const switchToSpeech = async () => { setTypedText(""); setInputMode("speech"); await startRecording(); };

  const handleNext = async () => {
    const currentTranscript = inputMode === "text" ? typedText.trim() : transcriptRef.current.trim();
    stopRecording();

    const analysis = analyzeAnswer(currentTranscript);
    const isLast = currentIndex === questions.length - 1;

    const thisAnswer = {
      questionIndex: currentIndex,
      questionText: questions[currentIndex],
      transcript: currentTranscript,
      score: analysis.score,
      confidence: analysis.confidence,
      clarity: analysis.clarity,
      sentiment: analysis.sentiment,
      phase: currentPhase,
    };
    allAnswersRef.current = [...allAnswersRef.current, thisAnswer];

    if (isLast) {
      setSubmitting(true);
      try {
        const result = await submitResumeInterview(interviewId, {
          answers: allAnswersRef.current,
          proctor: { violations: proctor.violations, flagged: proctor.violations >= proctor.maxViolations, log: proctor.log },
        });
        navigate("/resume-interview/results", { state: result });
      } catch (err) {
        navigate("/resume-interview/results", { state: { error: err.message } });
      }
      return;
    }

    const nextPhaseChanges = phases[currentIndex + 1] !== currentPhase;
    setCurrentIndex((i) => i + 1);
    setTypedText("");
    resetTranscript();

    if (nextPhaseChanges) {
      stopRecording();
      setPhaseIntro(phases[currentIndex + 1]);
    } else if (inputMode === "speech") {
      startRecording();
    }
  };

  const continueFromPhaseIntro = async () => {
    setPhaseIntro(null);
    if (inputMode === "speech") await startRecording();
  };

  if (!interviewId || !questions.length) return null;

  // ── Pre-start: fullscreen + rules confirmation ──
  if (!started) {
    return (
      <div className="ri-page ri-center">
        <div className="ri-setup-card">
          <div className="ri-setup-icon">🔒</div>
          <h1>Ready to begin?</h1>
          <p className="ri-setup-sub">
            This interview runs in fullscreen with strict proctoring active. Once you begin, exiting fullscreen,
            switching tabs, or copy/pasting will count as violations.
          </p>
          {questionsSource === "fallback" && (
            <span className="practice-mode-badge" style={{ marginBottom: 12 }}>
              🧩 Practice Mode — using curated questions
            </span>
          )}
          <button className="ri-btn ri-btn-primary" onClick={beginInterview}>
            🔓 Enter Fullscreen & Begin
          </button>
        </div>
      </div>
    );
  }

  // ── Phase transition screen ──
  if (phaseIntro) {
    return (
      <div className="ri-page ri-center">
        <div className="ri-setup-card">
          <div className="ri-setup-icon">{phaseIntro === "technical" ? "💻" : "🤝"}</div>
          <h1>{phaseIntro === "technical" ? "Technical Round" : "HR Round"}</h1>
          <p className="ri-setup-sub">
            {phaseIntro === "technical"
              ? "Questions tailored to the skills and projects on your resume."
              : "Behavioral and culture-fit questions. Speak naturally, be yourself."}
          </p>
          <button className="ri-btn ri-btn-primary" onClick={continueFromPhaseIntro}>
            Continue →
          </button>
        </div>
      </div>
    );
  }

  const speechWordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  const textWordCount = typedText.trim().split(/\s+/).filter(Boolean).length;
  const wordCount = inputMode === "text" ? textWordCount : speechWordCount;
  const indexWithinPhase = phases.slice(0, currentIndex + 1).filter(p => p === currentPhase).length;
  const totalInPhase = phases.filter(p => p === currentPhase).length;

  return (
    <div className="interview-page">
      <div className="interview-bg">
        <div className="interview-orb interview-orb1" />
        <div className="interview-orb interview-orb2" />
        <div className="interview-grid" />
      </div>

      {/* Proctoring status bar */}
      <div className="ri-proctor-bar">
        <span className={`ri-phase-chip ${currentPhase}`}>
          {currentPhase === "technical" ? "💻 Technical" : "🤝 HR"} — Q{indexWithinPhase}/{totalInPhase}
        </span>
        <span className={`ri-violation-chip ${proctor.violations > 0 ? "warn" : ""}`}>
          🛡️ Violations: {proctor.violations}/{proctor.maxViolations}
        </span>
      </div>

      {proctor.warning && (
        <div className="ri-warning-overlay">
          <div className="ri-warning-modal">
            <div className="ri-warning-icon">⚠️</div>
            <h3>Proctoring Violation Detected</h3>
            <p>{proctor.warning.reason}</p>
            <p className="ri-warning-count">
              Violation {proctor.warning.count} of {proctor.maxViolations} — reaching {proctor.maxViolations} will auto-submit and flag this interview.
            </p>
            <button className="ri-btn ri-btn-primary" onClick={async () => {
              proctor.dismissWarning();
              await proctor.requestFullscreen();
            }}>
              I Understand — Continue
            </button>
          </div>
        </div>
      )}

      <div className="interview-layout ri-single-col">
        <div className="glass-card right-panel">
          <div className="question-card">
            <div className="question-label">
              Question {currentIndex + 1} / {questions.length}
              {questionsSource === "fallback" && (
                <span className="practice-mode-badge" title="Using curated question bank">🧩 Practice Mode</span>
              )}
            </div>
            <p className="question-text">{questions[currentIndex]}</p>
          </div>

          <div className={`recorder-card ${isRecording && inputMode === "speech" ? "active" : ""} ${error && inputMode === "speech" ? "has-error" : ""}`}>
            <div className="recorder-header">
              <h4>Your Answer {inputMode === "text" ? "⌨️" : "🎙"}</h4>
              <div className="recorder-meta">
                {isRecording && inputMode === "speech" && <span className="rec-live"><span className="rec-dot" />LIVE</span>}
                {wordCount > 0 && <span className="word-count">{wordCount} words</span>}
              </div>
            </div>

            {inputMode === "text" ? (
              <textarea
                className="answer-textarea"
                placeholder="Type your answer here…"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                rows={5}
              />
            ) : error ? (
              <div className="recorder-error">⚠️ {error}
                <button className="switch-to-text-btn" onClick={switchToText}>Switch to typing instead →</button>
              </div>
            ) : (
              <div className="recorder-text">
                {isRecording
                  ? transcript || <span className="placeholder-text">Listening… start speaking</span>
                  : <span className="muted-text">🔇 Microphone is off</span>}
              </div>
            )}
          </div>

          <div className="input-mode-toggle">
            <button className={`toggle-btn ${inputMode === "speech" ? "active" : ""}`} onClick={switchToSpeech}>🎙 Voice</button>
            <button className={`toggle-btn ${inputMode === "text" ? "active" : ""}`} onClick={switchToText}>⌨️ Type</button>
          </div>

          <button className="neon-btn" onClick={handleNext} disabled={submitting}>
            {submitting
              ? <span className="saving-state"><span className="saving-spinner" />Saving…</span>
              : currentIndex === questions.length - 1 ? "Finish Interview →" : "Next Question →"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeInterviewRoom;