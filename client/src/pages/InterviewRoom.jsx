import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInterview } from "../context/InterviewContext";
import { analyzeAnswer } from "../utils/analyzeAnswer";
import Timer from "../components/interview/Timer";
import "../styles/interview.css";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const InterviewRoom = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [transcript, setTranscript] = useState("");

  const {
    questions,
    currentIndex,
    nextQuestion,
    finished,
    startInterview,
  } = useInterview();

  /* ------------------ AI SPEAKS QUESTION ------------------ */
  const speakQuestion = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  };

  /* ------------------ START CAMERA ------------------ */
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

  /* ------------------ SPEECH RECOGNITION ------------------ */
  const startListening = () => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let liveTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        liveTranscript += event.results[i][0].transcript;
      }
      setTranscript(liveTranscript);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  /* ------------------ INIT ------------------ */
  useEffect(() => {
    startInterview(role);
    startCamera();
    startListening();

    return () => {
      stopCamera();
      stopListening();
    };
  }, [role]);

  /* ------------------ ASK QUESTION ------------------ */
  useEffect(() => {
    if (questions.length) {
      speakQuestion(questions[currentIndex]);
      setTranscript("");
    }
  }, [currentIndex, questions]);

  /* ------------------ NEXT QUESTION ------------------ */
  const handleNext = () => {
    stopListening();

    const result = analyzeAnswer(transcript);
    nextQuestion(transcript, result);

    if (finished) {
      stopCamera();
      navigate("/scorecard");
    } else {
      startListening();
    }
  };

  if (!questions.length) return null;

  return (
    <div className="interview-page">
      <div className="interview-layout">

        {/* LEFT */}
        <div className="glass-card left-panel">
          <video
            ref={videoRef}
            autoPlay
            muted
            className={`camera-box ${!cameraOn ? "camera-off" : ""}`}
          />

          <div className="media-controls">
            <button
              className="control-btn"
              onClick={() => setCameraOn(!cameraOn)}
            >
              🎥 {cameraOn ? "On" : "Off"}
            </button>

            <button
              className="control-btn"
              onClick={() => {
                setMicOn(!micOn);
                micOn ? stopListening() : startListening();
              }}
            >
              🎙 {micOn ? "On" : "Muted"}
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="glass-card right-panel">
          <Timer duration={60} questionIndex={currentIndex} onTimeUp={handleNext} />

          <h2>{questions[currentIndex]}</h2>

          <div className="recorder-box active">
            {transcript || "Listening..."}
          </div>

          <button className="neon-btn" onClick={handleNext}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;
