import { useEffect, useRef, useState } from "react";

const useRecorder = () => {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) return;

    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-US";

    recog.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognitionRef.current = recog;

    return () => {
      recog.abort(); // 🔥 HARD STOP
    };
  }, []);

  const startRecording = () => {
    setTranscript("");
    recognitionRef.current?.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.abort(); // 🔥 NOT stop()
    setIsRecording(false);
  };

  return { transcript, isRecording, startRecording, stopRecording };
};

export default useRecorder;
