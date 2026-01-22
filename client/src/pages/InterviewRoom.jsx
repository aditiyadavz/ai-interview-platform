import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

import QuestionCard from "../components/interview/QuestionCard";
import AnswerRecorder from "../components/interview/AnswerRecorder";
import Timer from "../components/interview/Timer";
import ProgressBar from "../components/interview/ProgressBar";

import useRecorder from "../hooks/useRecorder";
import { analyzeAnswer } from "../utils/analyzeAnswer";
import { useInterview } from "../context/InterviewContext";

import "../styles/interview.css";

const InterviewRoom = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const {
    QUESTIONS,
    currentIndex,
    nextQuestion,
    finished,
  } = useInterview();

  const {
    transcript,
    isRecording,
    startRecording,
    stopRecording,
  } = useRecorder();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        videoRef.current.srcObject = s;
        setTimeout(startRecording, 2000);
      });
  }, []);

  const handleNext = () => {
    stopRecording();
    const score = analyzeAnswer(transcript);
    nextQuestion(transcript, score);

    if (finished) navigate("/feedback");
    else startRecording();
  };

  return (
    <div className="interview-page">
      <div className="glass-card">
        <h1>{role.toUpperCase()} Interview</h1>

        <video ref={videoRef} autoPlay muted className="camera-box" />

        <ProgressBar
          current={currentIndex + 1}
          total={QUESTIONS.length}
        />

        <Timer duration={60} onTimeUp={handleNext} />

        <QuestionCard question={QUESTIONS[currentIndex]} />

        <AnswerRecorder
          transcript={transcript}
          isRecording={isRecording}
        />

        <button className="neon-btn" onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  );
};

export default InterviewRoom;
