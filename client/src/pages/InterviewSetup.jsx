import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInterview } from "../context/InterviewContext";
import "../styles/interviewSetup.css";

const InterviewSetup = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const { startInterview } = useInterview();

  const [camera, setCamera] = useState(false);
  const [mic, setMic] = useState(false);
  const [error, setError] = useState("");

  const cameraStreamRef = useRef(null);
  const micStreamRef = useRef(null);

  const checkCamera = async () => {
    if (camera) {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
      setCamera(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      setCamera(true);
      setError("");
    } catch {
      setError("Camera permission denied");
    }
  };

  const checkMic = async () => {
    if (mic) {
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
      setMic(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMic(true);
      setError("");
    } catch {
      setError("Microphone permission denied");
    }
  };

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const readyCount = [camera, mic].filter(Boolean).length;

  return (
    <div className="setup-page">
      <div className="setup-card">
        <div className="header">
          <div className="badge">PRE-CHECK</div>
          <h1>{role.toUpperCase()} Interview</h1>
          <p className="subtitle">System readiness & guidelines</p>
        </div>

        <div className="progress">
          <div className="progress-bar">
            <span style={{ width: `${(readyCount / 2) * 100}%` }} />
          </div>
          <div className="progress-text">{readyCount}/2 checks completed</div>
        </div>

        <div className="section">
          <h3>Device Checks</h3>

          <div className={`check-item ${camera ? "on" : ""}`} onClick={checkCamera}>
            <div className="icon">📷</div>
            <div className="meta">
              <strong>Camera</strong>
              <small>{camera ? "Camera detected" : "Click to test camera"}</small>
            </div>
            <div className="toggle"><span /></div>
          </div>

          <div className={`check-item ${mic ? "on" : ""}`} onClick={checkMic}>
            <div className="icon">🎤</div>
            <div className="meta">
              <strong>Microphone</strong>
              <small>{mic ? "Mic detected" : "Click to test microphone"}</small>
            </div>
            <div className="toggle"><span /></div>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="section">
          <h3>Interview Rules</h3>
          <ul className="rules">
            <li>Be in a quiet, well-lit room</li>
            <li>Stable internet connection required</li>
            <li>Do not refresh or switch tabs</li>
            <li>Each question has limited time</li>
          </ul>
        </div>

        <div className="footer">
          <div className={`status ${camera && mic ? "ok" : ""}`}>
            {camera && mic ? "System Ready" : "Complete all checks to continue"}
          </div>

          <button
            className={`join-btn ${camera && mic ? "active" : ""}`}
            disabled={!(camera && mic)}
            onClick={() => {
              startInterview(role);
              navigate(`/interview-room/${role}`);
            }}
          >
            Start Interview
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetup;
