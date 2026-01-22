import "../../styles/interview.css";
import "../../styles/recorder.css";

const AnswerRecorder = ({ transcript, isRecording }) => (
  <div className="glass-card">
    <h3>Your Answer</h3>
    <div className={`recorder-box ${isRecording ? "active" : ""}`}>
      {transcript || "Start speaking..."}
    </div>
  </div>
);

export default AnswerRecorder;
