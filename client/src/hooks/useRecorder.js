import { useEffect, useRef, useState } from "react";

const useRecorder = ({ echoSuppression = true } = {}) => {
  const [transcript,  setTranscript]  = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [error,       setError]       = useState(null);
  const [permState,   setPermState]   = useState("idle"); // idle | requesting | granted | denied
  const recognitionRef = useRef(null);
  const activeRef      = useRef(false);

  const buildRecognition = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition not supported. Please use Chrome or Edge.");
      return null;
    }
    const recog = new SR();
    recog.continuous     = true;
    recog.interimResults = true;
    recog.lang           = "en-US";
    recog.maxAlternatives = 1;

    recog.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };

    recog.onend = () => {
      if (activeRef.current) {
        try { recog.start(); } catch { /* best-effort cleanup — safe to ignore */ }
      }
    };

    recog.onerror = (e) => {
      if (e.error === "no-speech") return;
      if (e.error === "not-allowed") {
        setPermState("denied");
        setError("Microphone blocked. Click the 🔒 icon in your browser address bar and allow mic access, then refresh.");
        activeRef.current = false;
        setIsRecording(false);
      }
      if (e.error === "audio-capture") {
        setError("No microphone detected. Plug in a mic and try again.");
      }
    };

    return recog;
  };

  // Request mic permission explicitly before starting
  const requestPermission = async () => {
    setPermState("requesting");
    try {
      // getUserMedia triggers the browser permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: echoSuppression,
          noiseSuppression: echoSuppression,
          autoGainControl:  true,
        }
      });
      // Stop the stream immediately — we only needed the permission grant
      stream.getTracks().forEach(t => t.stop());
      setPermState("granted");
      setError(null);
      return true;
    } catch {
      setPermState("denied");
      setError("Microphone access denied. Allow mic access in your browser settings and refresh.");
      return false;
    }
  };

  const startRecording = async () => {
    setError(null);
    activeRef.current = true;

    // If permission not yet granted, request it first
    if (permState !== "granted") {
      const ok = await requestPermission();
      if (!ok) return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* best-effort cleanup — safe to ignore */ }
    }

    const recog = buildRecognition();
    if (!recog) return;
    recognitionRef.current = recog;

    try {
      recog.start();
      setIsRecording(true);
    } catch (e) {
      setError("Could not start microphone: " + e.message);
    }
  };

  const stopRecording = () => {
    activeRef.current = false;
    try { recognitionRef.current?.abort(); } catch { /* best-effort cleanup — safe to ignore */ }
    recognitionRef.current = null;
    setIsRecording(false);
  };

  const resetTranscript = () => setTranscript("");

  useEffect(() => {
    return () => {
      activeRef.current = false;
      try { recognitionRef.current?.abort(); } catch { /* best-effort cleanup — safe to ignore */ }
    };
  }, []);

  return { transcript, isRecording, error, permState, startRecording, stopRecording, resetTranscript };
};

export default useRecorder;