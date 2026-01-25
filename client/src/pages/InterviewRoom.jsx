import { useEffect, useRef, useState } from "react";
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
  const streamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

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

  // 🔴 HARD STOP EVERYTHING
  const stopAllMedia = () => {
    stopRecording();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.enabled = false;
        track.stop();
      });
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    streamRef.current = null;
  };

  // 🎥 START CAMERA ON ENTER
  useEffect(() => {
    let mounted = true;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (!mounted) return;

        streamRef.current = stream;
        videoRef.current.srcObject = stream;

        setTimeout(startRecording, 1200);
      })
      .catch(console.error);

    return () => {
      mounted = false;
      stopAllMedia();
    };
  }, []);

  // 🔥 TAB SWITCH SAFETY
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) stopAllMedia();
    };

    window.addEventListener("visibilitychange", handleVisibility);
    return () =>
      window.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // 🎥 CAMERA TOGGLE (LIGHT OFF IMMEDIATELY)
  const toggleCamera = () => {
    const videoTrack = streamRef.current
      ?.getTracks()
      .find(t => t.kind === "video");

    if (!videoTrack) return;

    if (cameraOn) {
      videoTrack.enabled = false;
      videoTrack.stop(); // 🔥 LIGHT OFF
      setCameraOn(false);
    } else {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(stream => {
          const newTrack = stream.getVideoTracks()[0];
          streamRef.current.addTrack(newTrack);
          videoRef.current.srcObject = streamRef.current;
          setCameraOn(true);
        });
    }
  };

  // 🎙 MIC TOGGLE
  const toggleMic = () => {
    const audioTrack = streamRef.current
      ?.getTracks()
      .find(t => t.kind === "audio");

    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setMicOn(audioTrack.enabled);
  };

  const handleNext = () => {
    stopRecording();
    const score = analyzeAnswer(transcript);
    nextQuestion(transcript, score);

    if (finished) {
      stopAllMedia();
      requestAnimationFrame(() => navigate("/feedback"));
    } else {
      startRecording();
    }
  };

  if (!QUESTIONS?.length) return null;

  return (
    <div className="interview-page">
      <div className="glass-card">
        <h1>{role.toUpperCase()} Interview</h1>

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="camera-box"
        />

        {/* 🎛 CONTROLS */}
        <div className="media-controls">
          <button onClick={toggleCamera}>
            {cameraOn ? "Turn Camera Off" : "Turn Camera On"}
          </button>

          <button onClick={toggleMic}>
            {micOn ? "Mute Mic" : "Unmute Mic"}
          </button>
        </div>

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
          {finished ? "Finish Interview" : "Next"}
        </button>
      </div>
    </div>
  );
};

export default InterviewRoom;
