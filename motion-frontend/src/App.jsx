import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Tilt from "react-parallax-tilt";

const API = "http://localhost:5000";

const themes = {
  dark: {
    bg: "#020617", // Slate 950
    text: "#f8fafc", // Slate 50
    cardBg: "rgba(15, 23, 42, 0.4)", // Slate 900
    border: "rgba(255, 255, 255, 0.08)",
    accentBase: "rgba(255, 255, 255, 0.03)",
    shadow: "0 8px 32px rgba(0, 0, 0, 0.5)"
  },
  light: {
    bg: "#f8fafc", // Slate 50
    text: "#0f172a", // Slate 900
    cardBg: "rgba(255, 255, 255, 0.7)", // White
    border: "rgba(0, 0, 0, 0.1)",
    accentBase: "rgba(0, 0, 0, 0.03)",
    shadow: "0 8px 32px rgba(0, 0, 0, 0.05)"
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

function StatCard({ label, value, accent, themeProps }) {
  return (
    <Tilt tiltMaxAngleX={8} tiltMaxAngleY={8} glareEnable={true} glareMaxOpacity={0.15} scale={1.02} transitionSpeed={2000} style={{ flex: 1, minWidth: 140 }}>
      <motion.div 
        variants={itemVariants}
        style={{
          background: themeProps.cardBg,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `1px solid ${themeProps.border}`,
          borderRadius: 20,
          padding: "20px 24px",
          boxShadow: themeProps.shadow,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: accent, boxShadow: `0 0 12px ${accent}` }} />
        <div style={{ fontSize: 11, color: themeProps.text, opacity: 0.6, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'Space Mono', monospace" }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: accent, fontFamily: "'Space Mono', monospace", letterSpacing: "-0.02em", textShadow: `0 0 20px ${accent}44` }}>{value}</div>
      </motion.div>
    </Tilt>
  );
}

function PulsingDot({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 10, height: 10, marginRight: 8 }}>
      <motion.span 
        animate={{ boxShadow: [`0 0 0 0 ${color}99`, `0 0 0 10px ${color}00`] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          display: "block", width: 10, height: 10, borderRadius: "50%",
          background: color,
        }} 
      />
    </span>
  );
}

const getEventIcon = (msg) => {
  if (msg.includes("started")) return "▶";
  if (msg.includes("stopped")) return "⏹";
  if (msg.includes("reset")) return "🔄";
  if (msg.includes("recording")) return "🎥";
  if (msg.includes("motion") || msg.includes("Motion") || msg.includes("⚡")) return "⚡";
  if (msg.includes("denied")) return "⚠️";
  return "ℹ️";
};

const getEventColor = (msg) => {
  if (msg.includes("motion") || msg.includes("Motion") || msg.includes("⚡")) return "#ef4444"; // Red
  if (msg.includes("started") || msg.includes("Camera")) return "#10b981"; // Green
  if (msg.includes("recording")) return "#f59e0b"; // Orange
  if (msg.includes("reset")) return "#3b82f6"; // Blue
  return "#8b5cf6"; // Purple
};

export default function App() {
  const [themeMode, setThemeMode] = useState("dark");
  const themeProps = themes[themeMode];

  const [status, setStatus] = useState({ status: "Normal", motion_count: 0, fps: 0, running: false });
  const [camOn, setCamOn] = useState(false);
  const [log, setLog] = useState([]);
  const logRef = useRef(null);

  const [mode, setMode] = useState("browser"); // backend | browser
  const [recording, setRecording] = useState(false);
  const [lastFile, setLastFile] = useState("");
  const [soundOn, setSoundOn] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const prevFrameRef = useRef(null);
  const alertSoundRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  
  const motionFramesRef = useRef(0);
  const isMotionActiveRef = useRef(false);
  const frameCountRef = useRef(0);

  useEffect(() => {
    alertSoundRef.current = new Audio("/alert.mp3");
  }, []);

  // Smooth scroll logic
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [log]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (mode === "browser") return;
      try {
        const res = await fetch(`${API}/status`);
        if (!res.ok) return;
        const data = await res.json();

        setStatus(prev => {
          if (data.status !== prev.status && data.status === "Motion Detected") {
            setLog(l => [{ id: Date.now(), time: new Date().toLocaleTimeString(), msg: "⚡ Backend motion detected" }, ...l.slice(0, 19)]);
            if (soundOn && alertSoundRef.current) {
              if (alertSoundRef.current.paused) {
                alertSoundRef.current.currentTime = 0;
                alertSoundRef.current.play().catch(() => {});
              }
            }
          }
          return data;
        });
      } catch (_) {}
    }, 500);
    return () => clearInterval(interval);
  }, [mode, soundOn]);

  useEffect(() => {
    if (!soundOn && alertSoundRef.current) {
      alertSoundRef.current.pause();
      alertSoundRef.current.currentTime = 0;
    }
  }, [soundOn]);

  const addLog = (msg) => {
    setLog(l => [{ id: Date.now(), time: new Date().toLocaleTimeString(), msg }, ...l.slice(0, 29)]);
  };

  const handleStart = async () => {
    try {
      await fetch(`${API}/start`, { method: "POST" });
      addLog("▶ Backend camera started");
    } catch (err) {
      console.error("Backend start error:", err);
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${API}/stop`, { method: "POST" });
      addLog("⏹ Backend camera stopped");
    } catch (err) {
      console.error("Backend stop error:", err);
    }
  };

  const handleReset = async () => {
    try {
      await fetch(`${API}/reset`, { method: "POST" });
    } catch (err) {}
    
    setStatus(s => ({ ...s, status: "Normal", motion_count: 0 }));
    setLog([{ id: Date.now(), time: new Date().toLocaleTimeString(), msg: "🔄 System completely reset" }]);
    
    prevFrameRef.current = null;
    motionFramesRef.current = 0;
    isMotionActiveRef.current = false;
    frameCountRef.current = 0;
    
    if (alertSoundRef.current) {
      alertSoundRef.current.pause();
      alertSoundRef.current.currentTime = 0;
    }
    
    if (overlayRef.current) {
      const ctx = overlayRef.current.getContext("2d");
      ctx?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
  };

  const handleStartRecording = async () => {
    if (mode === "browser") {
      if (!videoRef.current || !videoRef.current.srcObject) return;
      const stream = videoRef.current.srcObject;
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        chunksRef.current = [];
        const url = URL.createObjectURL(blob);
        setLastFile(url);
      };
      mediaRecorderRef.current.start();
      setRecording(true);
      addLog("🎥 Browser recording started");
      return;
    }

    try {
      const res = await fetch(`${API}/start_recording`, { method: "POST" });
      const data = await res.json();
      if (data.file) {
        setRecording(true);
        setLastFile(data.file);
      }
      addLog("🎥 Backend recording started");
    } catch (err) {
      console.error("Recording error:", err);
    }
  };

  const handleStopRecording = async () => {
    if (mode === "browser") {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setRecording(false);
      addLog("⏹ Browser recording stopped");
      return;
    }

    try {
      await fetch(`${API}/stop_recording`, { method: "POST" });
      setRecording(false);
      addLog("⏹ Backend recording stopped");
    } catch (err) {
      console.error("Recording stop error:", err);
    }
  };

  const startBrowserCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (!videoRef.current) return;
      
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      
      setCamOn(true);
      addLog("🌐 Browser camera started");
    } catch (err) {
      console.error("Camera error:", err);
      addLog("⚠️ Camera access denied");
    }
  };

  const stopBrowserCamera = () => {
    if (recording) handleStopRecording();
    const tracks = videoRef.current?.srcObject?.getTracks();
    tracks?.forEach(t => t.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamOn(false);
    
    setStatus(s => ({ ...s, status: "Normal" }));
    prevFrameRef.current = null;
    motionFramesRef.current = 0;
    isMotionActiveRef.current = false;
    frameCountRef.current = 0;
    
    if (overlayRef.current) {
      const ctx = overlayRef.current.getContext("2d");
      ctx?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
    
    addLog("🌐 Browser camera stopped");
  };

  useEffect(() => {
    let animationFrameId;

    if (!camOn || mode !== "browser") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const detect = () => {
      const video = videoRef.current;
      const overlay = overlayRef.current;

      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameId = requestAnimationFrame(detect);
        return;
      }

      setStatus(s => s.fps !== 30 ? { ...s, fps: 30 } : s);

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (overlay) {
          overlay.width = video.videoWidth;
          overlay.height = video.videoHeight;
        }
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const overlayCtx = overlay?.getContext("2d");
      if (overlayCtx) {
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
      }

      if (prevFrameRef.current && prevFrameRef.current.width === canvas.width && prevFrameRef.current.height === canvas.height) {
        let diff = 0;
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

        for (let i = 0; i < frame.data.length; i += 64) {
          const r = Math.abs(frame.data[i] - prevFrameRef.current.data[i]);
          const g = Math.abs(frame.data[i + 1] - prevFrameRef.current.data[i + 1]);
          const b = Math.abs(frame.data[i + 2] - prevFrameRef.current.data[i + 2]);
          
          if (r + g + b > 45) {
            diff++;
            const p = i / 4;
            const x = p % canvas.width;
            const y = Math.floor(p / canvas.width);
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }

        if (diff > 50) {
          motionFramesRef.current++;
        } else {
          if (motionFramesRef.current > 0) motionFramesRef.current--;
        }

        if (motionFramesRef.current >= 3) {
          motionFramesRef.current = 3;
          
          if (!isMotionActiveRef.current) {
            isMotionActiveRef.current = true;
            setStatus(s => ({ ...s, status: "Motion Detected", motion_count: s.motion_count + 1 }));
            addLog("⚡ Browser motion detected");
            
            if (soundOn && alertSoundRef.current) {
              if (alertSoundRef.current.paused) {
                alertSoundRef.current.currentTime = 0;
                alertSoundRef.current.play().catch(() => {});
              }
            }
          }

          const boxWidth = maxX - minX;
          const boxHeight = maxY - minY;
          if (overlayCtx && boxWidth > 30 && boxHeight > 30) {
             overlayCtx.strokeStyle = "#10b981";
             overlayCtx.lineWidth = 3;
             overlayCtx.lineJoin = "round";
             overlayCtx.strokeRect(minX, minY, boxWidth, boxHeight);
             
             // Add soft glow to bounding box
             overlayCtx.shadowColor = "#10b981";
             overlayCtx.shadowBlur = 10;
             overlayCtx.strokeRect(minX, minY, boxWidth, boxHeight);
             overlayCtx.shadowBlur = 0;
          }

        } else if (motionFramesRef.current === 0) {
          if (isMotionActiveRef.current) {
            isMotionActiveRef.current = false;
            setStatus(s => ({ ...s, status: "Normal" }));
          }
        }

        frameCountRef.current++;
        if (frameCountRef.current % 10 === 0) {
          prevFrameRef.current = frame;
        }
      } else {
        prevFrameRef.current = frame;
      }

      animationFrameId = requestAnimationFrame(detect);
    };

    detect();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [camOn, mode, soundOn]);

  const isRunning = mode === "backend" ? status.running : camOn;
  const motionActive = status.status === "Motion Detected";

  const btnStyle = (color, disabled) => ({
    background: disabled ? themeProps.accentBase : `${color}15`,
    border: `1px solid ${disabled ? themeProps.border : color + "55"}`,
    color: disabled ? (themeMode === "dark" ? "#64748b" : "#94a3b8") : color,
    borderRadius: 14,
    padding: "14px 16px",
    fontSize: 13,
    fontFamily: "'Space Mono', monospace",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backdropFilter: "blur(8px)",
    boxShadow: disabled ? "none" : `0 4px 15px ${color}11`,
    width: "100%",
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: themeProps.bg,
      color: themeProps.text,
      fontFamily: "'Inter', sans-serif",
      padding: "32px 24px",
      boxSizing: "border-box",
      transition: "background 0.5s ease, color 0.5s ease",
      overflowX: "hidden",
      position: "relative"
    }}>
      {/* Background Orbs */}
      <div style={{ position: "absolute", top: "10%", left: "5%", width: "40vw", height: "40vw", background: "radial-gradient(circle, rgba(56,189,248,0.05) 0%, rgba(0,0,0,0) 70%)", zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "5%", width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(239,68,68,0.03) 0%, rgba(0,0,0,0) 70%)", zIndex: 0, pointerEvents: "none" }} />

      <style>
        {`
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: ${themeMode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}; border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: ${themeMode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}; }
        `}
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;800&display=swap" rel="stylesheet" />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ maxWidth: 1040, margin: "0 auto", position: "relative", zIndex: 1 }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <motion.img 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5, type: "spring" }}
              src="/logo.png" 
              alt="logo" 
              style={{ width: 56, filter: themeMode === "dark" ? "drop-shadow(0 0 15px rgba(56, 189, 248, 0.4))" : "drop-shadow(0 0 10px rgba(2, 132, 199, 0.2))", borderRadius: 12 }} 
            />
            <div>
              <div style={{ fontSize: 11, color: themeProps.text, opacity: 0.5, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>
                Security Feed
              </div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em", color: themeProps.text }}>
                Live Monitor
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setThemeMode(t => t === "dark" ? "light" : "dark")}
              style={{
                background: themeProps.cardBg,
                border: `1px solid ${themeProps.border}`,
                color: themeProps.text,
                borderRadius: "50%",
                width: 44, height: 44,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", backdropFilter: "blur(8px)",
                fontSize: 20, boxShadow: themeProps.shadow,
              }}
            >
              {themeMode === "dark" ? "☀️" : "🌙"}
            </motion.button>

            <motion.div 
              layout
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: motionActive ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.1)",
                border: `1px solid ${motionActive ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.3)"}`,
                borderRadius: 99, padding: "10px 24px",
                backdropFilter: "blur(8px)", boxShadow: themeProps.shadow,
              }}
            >
              <PulsingDot color={motionActive ? "#ef4444" : isRunning ? "#10b981" : "#64748b"} />
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: motionActive ? "#ef4444" : isRunning ? "#10b981" : "#64748b", letterSpacing: "0.05em" }}>
                {motionActive ? "MOTION ALERT" : isRunning ? "WATCHING" : "OFFLINE"}
              </span>
            </motion.div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
          <StatCard label="Status" value={isRunning ? (motionActive ? "Alert" : "Clear") : "Off"} accent={motionActive ? "#ef4444" : "#10b981"} themeProps={themeProps} />
          <StatCard label="Events" value={status.motion_count} accent="#3b82f6" themeProps={themeProps} />
          <StatCard label="FPS" value={status.fps || "—"} accent="#f59e0b" themeProps={themeProps} />
          <StatCard label="Camera" value={isRunning ? "ON" : "OFF"} accent={isRunning ? "#10b981" : "#64748b"} themeProps={themeProps} />
          <StatCard label="Recording" value={recording ? "ON" : "OFF"} accent={recording ? "#ef4444" : "#64748b"} themeProps={themeProps} />
        </div>

        {/* Main Interface Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
          
          {/* Video Container */}
          <motion.div 
            variants={itemVariants}
            style={{
              background: themeProps.cardBg,
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              border: `1px solid ${motionActive ? "rgba(239, 68, 68, 0.4)" : themeProps.border}`,
              borderRadius: 24, overflow: "hidden",
              boxShadow: motionActive ? "0 0 40px rgba(239, 68, 68, 0.15)" : themeProps.shadow,
              transition: "all 0.5s ease",
              position: "relative",
              minHeight: 460, display: "flex", flexDirection: "column", justifyContent: "center"
            }}
          >
            {/* Overlays */}
            <div style={{ position: "absolute", top: 20, left: 20, display: "flex", gap: 10, zIndex: 10 }}>
              {isRunning && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", padding: "6px 14px", borderRadius: 10, fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#fff", display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(255,255,255,0.1)" }}>
                  <PulsingDot color="#ef4444" /> LIVE
                </motion.div>
              )}
              {status.fps > 0 && (
                <div style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", padding: "6px 14px", borderRadius: 10, fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#10b981", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {status.fps} FPS
                </div>
              )}
            </div>

            <div style={{ position: "absolute", top: 20, right: 20, display: "flex", flexDirection: "column", gap: 10, zIndex: 10, alignItems: "flex-end" }}>
              <AnimatePresence>
                {recording && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} style={{ background: "rgba(239, 68, 68, 0.85)", backdropFilter: "blur(8px)", padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#fff", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 0 20px rgba(239,68,68,0.4)", border: "1px solid rgba(255,255,255,0.2)" }}>
                    <div style={{ width: 8, height: 8, background: "#fff", borderRadius: "50%", animation: "pulse 1s infinite" }} /> REC
                  </motion.div>
                )}
                {!recording && motionActive && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} style={{ background: "rgba(245, 158, 11, 0.9)", backdropFilter: "blur(8px)", padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#fff", boxShadow: "0 0 20px rgba(245,158,11,0.4)", border: "1px solid rgba(255,255,255,0.2)" }}>
                    ⚡ MOTION
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Video Streams */}
            {mode === "backend" && isRunning && (
              <img
                src={`${API}/video_feed`}
                alt="Live feed"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: 24 }}
              />
            )}
            
            {mode === "browser" && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: camOn ? "block" : "none", borderRadius: 24 }}
                />
                <canvas 
                  ref={overlayRef} 
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none", display: camOn ? "block" : "none", borderRadius: 24 }} 
                />
              </>
            )}

            {!isRunning && (
              <div style={{
                height: 460,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
                color: themeProps.text, opacity: 0.4
              }}>
                <div style={{ fontSize: 64, filter: "grayscale(1)" }}>📷</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, letterSpacing: "0.1em" }}>
                  CAMERA OFFLINE
                </div>
                <div style={{ fontSize: 13 }}>Press Start to begin monitoring</div>
              </div>
            )}

            <canvas ref={canvasRef} style={{ display: "none" }} />
          </motion.div>

          {/* Right Sidebar Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Control Panel */}
            <motion.div 
              variants={itemVariants}
              style={{
                background: themeProps.cardBg,
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                border: `1px solid ${themeProps.border}`,
                borderRadius: 24, padding: 24,
                boxShadow: themeProps.shadow
              }}
            >
              <div style={{ fontSize: 11, color: themeProps.text, opacity: 0.6, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 20, fontWeight: 700 }}>System Controls</div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <motion.button 
                  whileHover={!isRunning ? {} : { scale: 1.03, y: -2 }}
                  whileTap={!isRunning ? {} : { scale: 0.97 }}
                  onClick={() => {
                    if (recording) handleStopRecording();
                    if (mode === "browser" && camOn) stopBrowserCamera();
                    if (mode === "backend" && isRunning) handleStop();
                    setMode(mode === "backend" ? "browser" : "backend");
                  }}
                  style={{...btnStyle("#3b82f6", false), gridColumn: "1 / -1", justifyContent: "space-between", padding: "14px 20px" }}
                >
                  <span style={{ color: themeProps.text, opacity: 0.8 }}>Mode</span>
                  <span style={{ color: "#3b82f6", background: "rgba(59, 130, 246, 0.15)", padding: "4px 10px", borderRadius: 6 }}>{mode.toUpperCase()}</span>
                </motion.button>
                
                <motion.button 
                  whileHover={isRunning ? {} : { scale: 1.03, y: -2 }}
                  whileTap={isRunning ? {} : { scale: 0.97 }}
                  onClick={mode === "backend" ? handleStart : startBrowserCamera}
                  disabled={isRunning}
                  style={btnStyle("#10b981", isRunning)}
                >
                  ▶ Start
                </motion.button>

                <motion.button 
                  whileHover={!isRunning ? {} : { scale: 1.03, y: -2 }}
                  whileTap={!isRunning ? {} : { scale: 0.97 }}
                  onClick={mode === "backend" ? handleStop : stopBrowserCamera}
                  disabled={!isRunning}
                  style={btnStyle("#ef4444", !isRunning)}
                >
                  ⏹ Stop
                </motion.button> 

                <motion.button 
                  whileHover={recording || !isRunning ? {} : { scale: 1.03, y: -2 }}
                  whileTap={recording || !isRunning ? {} : { scale: 0.97 }}
                  onClick={handleStartRecording}
                  disabled={recording || !isRunning}
                  style={btnStyle("#f59e0b", recording || !isRunning)}
                >
                  🎥 Record
                </motion.button>

                <motion.button 
                  whileHover={!recording ? {} : { scale: 1.03, y: -2 }}
                  whileTap={!recording ? {} : { scale: 0.97 }}
                  onClick={handleStopRecording} 
                  disabled={!recording}
                  style={btnStyle("#f97316", !recording)}
                >
                  ⏹ Stop Rec
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSoundOn(!soundOn)}
                  style={{...btnStyle(soundOn ? "#10b981" : "#64748b", false), gridColumn: "1 / -1" }}
                >
                  {soundOn ? "🔊 Audio Alerts Enabled" : "🔇 Audio Alerts Muted"}
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleReset} 
                  style={{...btnStyle("#8b5cf6", false), gridColumn: "1 / -1", borderStyle: "dashed" }}
                >
                  🔄 Factory Reset
                </motion.button>
              </div>

              <AnimatePresence>
                {lastFile && (
                  <motion.a 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                    href={mode === "browser" ? lastFile : `${API}/download/${lastFile}`} 
                    download={mode === "browser" ? "browser_recording.webm" : ""}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "14px",
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: 14,
                      color: "#10b981",
                      textDecoration: "none",
                      fontSize: 13, fontWeight: 600, fontFamily: "'Space Mono', monospace",
                      backdropFilter: "blur(4px)"
                    }}
                  >
                    📥 Download Clip
                  </motion.a>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Event Log */}
            <motion.div 
              variants={itemVariants}
              style={{
                background: themeProps.cardBg,
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                border: `1px solid ${themeProps.border}`,
                borderRadius: 24, padding: "24px 16px 24px 24px", flex: 1,
                minHeight: 280, display: "flex", flexDirection: "column",
                boxShadow: themeProps.shadow
              }}
            >
              <div style={{ fontSize: 11, color: themeProps.text, opacity: 0.6, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 20, fontWeight: 700 }}>Event Log</div>
              
              <div ref={logRef} style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 12, paddingRight: 8 }}>
                {log.length === 0 && (
                  <div style={{ color: themeProps.text, opacity: 0.4, fontSize: 13, fontFamily: "'Space Mono', monospace", textAlign: "center", marginTop: 40 }}>System initialized...</div>
                )}
                <AnimatePresence initial={false}>
                  {log.map((e) => {
                    const icon = getEventIcon(e.msg);
                    const color = getEventColor(e.msg);
                    return (
                      <motion.div 
                        key={e.id} 
                        initial={{ opacity: 0, x: -20, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: "auto" }}
                        style={{ 
                          fontSize: 12, fontFamily: "'Inter', sans-serif", 
                          background: `linear-gradient(90deg, ${color}15 0%, transparent 100%)`,
                          borderLeft: `3px solid ${color}`,
                          padding: "10px 14px", borderRadius: "0 8px 8px 0",
                          display: "flex", alignItems: "center", gap: 12
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{icon}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: color, fontWeight: 600 }}>{e.msg.replace(/[⚡▶⏹🔄🎥⚠️ℹ️]/g, "").trim()}</span>
                        </div>
                        <span style={{ color: themeProps.text, opacity: 0.4, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>{e.time}</span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        <div style={{ marginTop: 40, fontSize: 12, color: themeProps.text, opacity: 0.3, fontFamily: "'Space Mono', monospace", textAlign: "center" }}>
           Advanced Motion Dashboard &nbsp;|&nbsp; React + Framer Motion
        </div>
      </motion.div>
    </div>
  );
}