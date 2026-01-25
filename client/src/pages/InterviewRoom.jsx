import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInterview } from "../context/InterviewContext";
import { analyzeAnswer } from "../utils/analyzeAnswer";
import Timer from "../components/interview/Timer";
import "../styles/interview.css";

const InterviewRoom = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [answer, setAnswer] = useState("");

  const {
    questions,
    currentIndex,
    nextQuestion,
    finished,
    startInterview,
  } = useInterview();

  useEffect(() => {
    startInterview(role);
    startCamera();
    return stopCamera;
  }, [role]);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    streamRef.current = stream;
    videoRef.current.srcObject = stream;
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const handleNext = () => {
    const score = analyzeAnswer(answer);
    nextQuestion(answer, score);
    setAnswer("");

    if (finished) {
      stopCamera();
      navigate("/feedback");
    }
  };

  if (!questions.length) return null;

  return (
    <div className="interview-layout">
      {/* LEFT */}
      <div className="left-panel">
        <video ref={videoRef} autoPlay muted />
        <button onClick={() => setCameraOn(!cameraOn)}>
          🎥 {cameraOn ? "On" : "Off"}
        </button>
        <button onClick={() => setMicOn(!micOn)}>
          🎙 {micOn ? "On" : "Muted"}
        </button>
      </div>

      {/* RIGHT */}
      <div className="right-panel">
        <Timer
          duration={60}
          questionIndex={currentIndex}
          onTimeUp={handleNext}
        />

        <h2>{questions[currentIndex]}</h2>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer..."
        />

        <button onClick={handleNext}>Next</button>
      </div>
    </div>
  );
};

export default InterviewRoom;
