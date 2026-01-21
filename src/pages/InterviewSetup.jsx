import { useState } from "react";
import "../styles/interviewSetup.css";

function InterviewSetup() {
  const [camera, setCamera] = useState(false);
  const [mic, setMic] = useState(false);

  return (
    <div className="interview-setup">
      <h1>Interview Setup</h1>
      <p>Please make sure everything is ready before joining the interview.</p>

      <div className="setup-grid">
        {/* System Check */}
        <div className="setup-card">
          <h3>System Check</h3>

          <label className="setup-check">
            <input
              type="checkbox"
              checked={camera}
              onChange={() => setCamera(!camera)}
            />
            Camera Working
          </label>

          <label className="setup-check">
            <input
              type="checkbox"
              checked={mic}
              onChange={() => setMic(!mic)}
            />
            Microphone Working
          </label>
        </div>

        {/* Instructions */}
        <div className="setup-card">
          <h3>Instructions</h3>
          <ul>
            <li>Be in a quiet, well-lit room</li>
            <li>Ensure stable internet connection</li>
            <li>Keep your ID ready</li>
            <li>Do not refresh during the interview</li>
          </ul>
        </div>
      </div>

      <button className="join-btn" disabled={!(camera && mic)}>
        Join Interview
      </button>

      <div className="setup-note">
        AI feedback will start once the interview begins
      </div>
    </div>
  );
}

export default InterviewSetup;
