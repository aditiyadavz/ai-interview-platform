import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInterview } from "../context/InterviewContext";
import "../styles/interviewSetup.css";

const InterviewSetup = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const { startInterview } = useInterview(); // ✅ CORRECT

  const [camera, setCamera] = useState(false);
  const [mic, setMic] = useState(false);
  const [error, setError] = useState("");

  const cameraStreamRef = useRef(null);
  const micStreamRef = useRef(null);

  // 🎥 Toggle camera
  const checkCamera = async () => {
    if (camera) {
      cameraStreamRef.current?.getTracks().forEach(track => track.stop());
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
      setCamera(false);
    }
  };

  // 🎙 Toggle microphone
  const checkMic = async () => {
    if (mic) {
      micStreamRef.current?.getTracks().forEach(track => track.stop());
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
      setMic(false);
    }
  };

  // 🧹 Cleanup
  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach(track => track.stop());
      micStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className="setup-page">
      <div className="setup-card">
        <h1>{role.toUpperCase()} Interview Setup</h1>
        <p>Confirm your system readiness before joining.</p>

        <div className="checklist">
          <label>
            <input type="checkbox" checked={camera} onChange={checkCamera} />
            Camera Working
          </label>

          <label>
            <input type="checkbox" checked={mic} onChange={checkMic} />
            Microphone Working
          </label>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="instructions">
          <h3>Instructions</h3>
          <ul>
            <li>Quiet environment</li>
            <li>Stable internet</li>
            <li>No refresh during interview</li>
            <li>Answer confidently</li>
          </ul>
        </div>

        <button
          className={`join-btn ${camera && mic ? "active" : ""}`}
          disabled={!(camera && mic)}
          onClick={() => {
            startInterview(role); // ✅ START interview properly
            navigate(`/interview-room/${role}`);
          }}
        >
          Join Interview
        </button>
      </div>
    </div>
  );
};

export default InterviewSetup;
