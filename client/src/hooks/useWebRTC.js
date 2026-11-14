import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
  : "https://ai-interview-platform-rwh2.onrender.com";

const SIGNALING_URL = BASE_URL;
const TURN_API_URL  = `${BASE_URL}/api/turn/credentials`;

// Minimal STUN-only fallback while credentials are loading
const STUN_ONLY = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Open Relay fallback if API call fails
const OPEN_RELAY_FALLBACK = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:openrelay.metered.ca:80" },
    { urls: "turn:openrelay.metered.ca:80",                username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443",               username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  ],
  iceCandidatePoolSize: 10,
};

// Fetch fresh ICE servers from our backend (cached 10h server-side)
const fetchIceConfig = async () => {
  try {
    const res = await fetch(TURN_API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`TURN API ${res.status}`);
    const data = await res.json();
    console.log(`✅ ICE servers loaded (${data.iceServers?.length} entries) — provider: ${data.provider || "unknown"}`);
    return { ...data, iceCandidatePoolSize: 10, provider: data.provider || "unknown" };
  } catch (err) {
    console.warn("⚠️ TURN API failed, using Open Relay fallback:", err.message);
    return { ...OPEN_RELAY_FALLBACK, provider: "fallback" };
  }
};

// ── Hook ─────────────────────────────────────────────────────────────────────
export const useWebRTC = ({ code, as, name, enabled = true }) => {
  const [connected,    setConnected]    = useState(false);
  const [peerPresent,  setPeerPresent]  = useState(false);
  const [callActive,   setCallActive]   = useState(false);
  const [localStream,  setLocalStream]  = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micOn,        setMicOn]        = useState(true);
  const [camOn,        setCamOn]        = useState(true);
  const [error,        setError]        = useState("");
  const [roomData,     setRoomData]     = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [relayProvider, setRelayProvider] = useState(null); // "metered" | "fallback" | null

  const socketRef         = useRef(null);
  const pcRef             = useRef(null);
  const pendingCandidates = useRef([]);
  const localStreamRef    = useRef(null);
  const pendingListeners  = useRef([]);
  const iceRestartTimer   = useRef(null);
  const makingOffer       = useRef(false);
  const iceConfigRef      = useRef(null); // cached ICE config for this session

  // ── Build RTCPeerConnection using fetched ICE config ─────────────────────
  const createPC = useCallback((stream) => {
    clearTimeout(iceRestartTimer.current);

    if (pcRef.current) {
      pcRef.current.onicecandidate             = null;
      pcRef.current.ontrack                    = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onconnectionstatechange    = null;
      try { pcRef.current.close(); } catch { /* best-effort cleanup — safe to ignore */ }
      pcRef.current = null;
    }

    const config = iceConfigRef.current || OPEN_RELAY_FALLBACK;
    console.log(`🔧 Creating PC with ${config.iceServers.length} ICE servers`);
    const pc = new RTCPeerConnection(config);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      console.log("✅ Remote track received:", e.track.kind);
      setRemoteStream(e.streams[0]);
      setCallActive(true);
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socketRef.current?.emit("webrtc:ice-candidate", { candidate });
    };

    pc.onicegatheringstatechange = () =>
      console.log("ICE gathering:", pc.iceGatheringState);

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log("ICE state:", state);

      if (state === "connected" || state === "completed") {
        setCallActive(true);
        setError("");
        clearTimeout(iceRestartTimer.current);
      }

      if (state === "failed") {
        clearTimeout(iceRestartTimer.current);
        iceRestartTimer.current = setTimeout(async () => {
          const p = pcRef.current;
          if (!p || p.iceConnectionState !== "failed") return;
          if (as === "host") {
            try {
              makingOffer.current = true;
              const offer = await p.createOffer({ iceRestart: true });
              if (p.signalingState !== "stable") return;
              await p.setLocalDescription(offer);
              socketRef.current?.emit("webrtc:offer", { sdp: offer });
              console.log("↻ ICE restart offer sent");
            } catch (err) {
              console.error("ICE restart failed:", err);
            } finally {
              makingOffer.current = false;
            }
          }
        }, 1500);
      }

      if (state === "disconnected") {
        clearTimeout(iceRestartTimer.current);
        iceRestartTimer.current = setTimeout(() => {
          if (pcRef.current?.iceConnectionState === "disconnected" && as === "host") {
            pcRef.current?.restartIce();
          }
        }, 5000);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log("Connection state:", state);
      if (["disconnected", "failed", "closed"].includes(state)) setCallActive(false);
    };

    pcRef.current = pc;
    return pc;
  }, [as]);

  // ── Drain queued ICE candidates ───────────────────────────────────────────
  const drainCandidates = useCallback(async (pc) => {
    for (const c of pendingCandidates.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* best-effort cleanup — safe to ignore */ }
    }
    pendingCandidates.current = [];
  }, []);

  // ── Main effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!code || !as || !enabled) return;

    console.log(`🎬 Starting WebRTC as "${as}" in room "${code}"`);
    let cancelled = false;

    (async () => {
      // 1. Fetch fresh ICE config from backend FIRST
      const iceConfig = await fetchIceConfig();
      if (cancelled) return;
      iceConfigRef.current = iceConfig;
      setRelayProvider(iceConfig.provider || "fallback");

      // 2. Get local media
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        const msg =
          err.name === "NotAllowedError"  ? "Camera/microphone permission denied. Click the 🔒 lock icon, allow Camera & Microphone, then refresh." :
          err.name === "NotFoundError"    ? "No camera or microphone found. Please connect one and refresh." :
          err.name === "NotReadableError" ? "Camera is in use by another app. Close other apps and refresh." :
          `Could not access camera/microphone: ${err.message}`;
        setError(msg);
        return;
      }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      setLocalStream(stream);
      localStreamRef.current = stream;

      // 3. Connect to signaling server
      const socket = io(SIGNALING_URL, {
        path: "/socket.io",
        auth: { token: localStorage.getItem("token") || undefined },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });
      socketRef.current = socket;

      pendingListeners.current.forEach(({ event, handler }) => socket.on(event, handler));
      pendingListeners.current = [];

      socket.on("connect", () => {
        console.log("✅ Socket connected as:", as);
        setConnected(true);
        socket.emit("room:join", { code, as, name });
      });

      socket.on("reconnect", () => {
        pendingCandidates.current = [];
        socket.emit("room:join", { code, as, name });
      });

      socket.on("room:joined", (data) => {
        console.log("room:joined — peerPresent:", data.peerPresent);
        setRoomData(data);
        setPeerPresent(!!data.peerPresent);

        // Late join: if peer already present and we're host, send offer immediately
        if (as === "host" && data.peerPresent) {
          console.log("🔄 Peer already present — host sending offer");
          const pc = createPC(stream);
          (async () => {
            try {
              makingOffer.current = true;
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit("webrtc:offer", { sdp: offer });
            } catch (err) {
              console.error("Late-join offer failed:", err);
            } finally {
              makingOffer.current = false;
            }
          })();
        }
      });

      socket.on("room:error", ({ message }) => setError(message));

      socket.on("peer:joined", async ({ as: peerAs }) => {
        console.log("peer:joined — peerAs:", peerAs, "| my role:", as);
        setPeerPresent(true);
        if (as !== "host") return;

        const pc = createPC(stream);
        try {
          makingOffer.current = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc:offer", { sdp: offer });
          console.log("📤 Offer sent to guest");
        } catch (err) {
          console.error("Failed to create offer:", err);
        } finally {
          makingOffer.current = false;
        }
      });

      socket.on("peer:left", () => {
        console.log("peer:left");
        setPeerPresent(false);
        setCallActive(false);
        setRemoteStream(null);
      });

      socket.on("webrtc:offer", async ({ sdp }) => {
        console.log("📥 Offer received — creating answer");
        const pc = createPC(stream);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await drainCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("webrtc:answer", { sdp: answer });
          console.log("📤 Answer sent");
        } catch (err) {
          console.error("Failed to handle offer:", err);
        }
      });

      socket.on("webrtc:answer", async ({ sdp }) => {
        const pc = pcRef.current;
        if (!pc) return;
        if (pc.signalingState !== "have-local-offer") {
          console.warn("Ignoring answer — state:", pc.signalingState);
          return;
        }
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await drainCandidates(pc);
          console.log("✅ Remote answer set");
        } catch (err) {
          console.error("Failed to set answer:", err);
        }
      });

      socket.on("webrtc:ice-candidate", async ({ candidate }) => {
        if (!candidate) return;
        const pc = pcRef.current;
        if (pc?.remoteDescription?.type) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* best-effort cleanup — safe to ignore */ }
        } else {
          pendingCandidates.current.push(candidate);
        }
      });

      socket.on("chat:message", (msg) =>
        setChatMessages((p) => [...p, msg]));

      socket.on("disconnect", () => {
        console.log("Socket disconnected");
        setConnected(false);
      });
    })();

    return () => {
      cancelled = true;
      clearTimeout(iceRestartTimer.current);
      socketRef.current?.disconnect();
      if (pcRef.current) {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack        = null;
        try { pcRef.current.close(); } catch { /* best-effort cleanup — safe to ignore */ }
        pcRef.current = null;
      }
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [code, as, enabled]);

  // ── Public API ────────────────────────────────────────────────────────────
  const onInterviewEvent = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
      return () => socketRef.current?.off(event, handler);
    }
    pendingListeners.current.push({ event, handler });
    return () => {
      pendingListeners.current = pendingListeners.current.filter(
        (l) => !(l.event === event && l.handler === handler)
      );
      socketRef.current?.off(event, handler);
    };
  }, []);

  const emitInterviewEvent = useCallback((event, payload) => {
    socketRef.current?.emit(event, payload);
  }, []);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
    socketRef.current?.emit("media:toggle", { kind: "mic", enabled: track.enabled });
  }, []);

  const toggleCam = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
    socketRef.current?.emit("media:toggle", { kind: "cam", enabled: track.enabled });
  }, []);

  const sendChatMessage = useCallback((text) => {
    socketRef.current?.emit("chat:message", { text, from: name });
    setChatMessages((p) => [...p, { text, from: name, at: Date.now(), self: true }]);
  }, [name]);

  const hangUp = useCallback(() => {
    clearTimeout(iceRestartTimer.current);
    socketRef.current?.disconnect();
    if (pcRef.current) {
      try { pcRef.current.close(); } catch { /* best-effort cleanup — safe to ignore */ }
      pcRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    setCallActive(false);
  }, []);

  return {
    connected, peerPresent, callActive, localStream, remoteStream,
    micOn, camOn, error, roomData, chatMessages, relayProvider,
    toggleMic, toggleCam, sendChatMessage, hangUp,
    emitInterviewEvent, onInterviewEvent,
  };
};