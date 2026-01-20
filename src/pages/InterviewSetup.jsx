import { useState } from "react";

function InterviewSetup() {
  const [camera, setCamera] = useState(false);
  const [mic, setMic] = useState(false);

  return (
    <div style={styles.container}>
      <h1>Interview Setup</h1>
      <p>Please make sure everything is ready before joining the interview.</p>

      <div style={styles.card}>
        <h3>System Check</h3>

        <label>
          <input
            type="checkbox"
            checked={camera}
            onChange={() => setCamera(!camera)}
          />
          Camera Working
        </label>

        <label>
          <input
            type="checkbox"
            checked={mic}
            onChange={() => setMic(!mic)}
          />
          Microphone Working
        </label>
      </div>

      <div style={styles.card}>
        <h3>Instructions</h3>
        <ul>
          <li>Be in a quiet, well-lit room</li>
          <li>Ensure stable internet connection</li>
          <li>Keep your ID ready</li>
          <li>Do not refresh during the interview</li>
        </ul>
      </div>

      <button
        disabled={!(camera && mic)}
        style={{
          ...styles.button,
          backgroundColor: camera && mic ? "#2563eb" : "#9ca3af",
        }}
      >
        Join Interview
      </button>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "600px",
    margin: "50px auto",
    padding: "20px",
    fontFamily: "Arial",
  },
  card: {
    background: "#f9fafb",
    padding: "15px",
    marginBottom: "20px",
    borderRadius: "8px",
  },
  button: {
    width: "100%",
    padding: "12px",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer",
  },
};

export default InterviewSetup;
