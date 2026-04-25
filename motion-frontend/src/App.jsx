import { useState, useEffect, useRef } from "react";

const API = "http://localhost:5000";

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${accent}33`,
      borderRadius: 12,
      padding: "16px 20px",
      flex: 1,
      minWidth: 120,
    }}>
      <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontFamily: "'Space Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent, fontFamily: "'Space Mono', monospace", letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

function PulsingDot({ active }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 10, height: 10, marginRight: 8 }}>
      <span style={{
        display: "block", width: 10, height: 10, borderRadius: "50%",
        background: active ? "#00ff88" : "#555",
        boxShadow: active ? "0 0 0 0 rgba(0,255,136,0.6)" : "none",
        animation: active ? "pulse 1.4s ease-out infinite" : "none",
      }} />
      <style>{`@keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(0,255,136,0.6)} 70%{box-shadow:0 0 0 10px rgba(0,255,136,0)} 100%{box-shadow:0 0 0 0 rgba(0,255,136,0)} }`}</style>
    </span>
  );
}

export default function App() {
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
  const prevFrameRef = useRef(null);
  const alertSoundRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    alertSoundRef.current = new Audio("/alert.mp3");
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (mode === "browser") return; // No backend dependency in browser mode
      
      try {
        const res = await fetch(`${API}/status`);
        if (!res.ok) return;
        const data = await res.json();

        setStatus(prev => {
          if (data.status !== prev.status && data.status === "Motion Detected") {
            setLog(l => [{
              time: new Date().toLocaleTimeString(),
              msg: "⚡ Motion event detected"
            }, ...l.slice(0, 19)]);

            if (soundOn && alertSoundRef.current) {
              alertSoundRef.current.currentTime = 0;
              alertSoundRef.current.play().catch(() => {});
            }
          }
          return data;
        });
      } catch (_) {
        // Silently fail if backend is unreachable
      }
    }, 500);
    return () => clearInterval(interval);
  }, [mode, soundOn]);

  useEffect(() => {
    if (!soundOn && alertSoundRef.current) {
      alertSoundRef.current.pause();
      alertSoundRef.current.currentTime = 0;
    }
  }, [soundOn]);

  const handleStart = async () => {
    try {
      await fetch(`${API}/start`, { method: "POST" });
      setLog(l => [{ time: new Date().toLocaleTimeString(), msg: "▶ Camera started" }, ...l]);
    } catch (err) {
      console.error("Backend start error:", err);
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${API}/stop`, { method: "POST" });
      setLog(l => [{ time: new Date().toLocaleTimeString(), msg: "⏹ Camera stopped" }, ...l]);
    } catch (err) {
      console.error("Backend stop error:", err);
    }
  };

  const handleReset = async () => {
    try {
      await fetch(`${API}/reset`, { method: "POST" });
      setLog(l => [{ time: new Date().toLocaleTimeString(), msg: "🔄 Background reference reset" }, ...l]);
    } catch (err) {
      console.error("Backend reset error:", err);
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
      setLog(l => [{ time: new Date().toLocaleTimeString(), msg: "🎥 Browser recording started" }, ...l]);
      return;
    }

    try {
      const res = await fetch(`${API}/start_recording`, { method: "POST" });
      const data = await res.json();
      if (data.file) {
        setRecording(true);
        setLastFile(data.file);
      }
      setLog(l => [{ time: new Date().toLocaleTimeString(), msg: "🎥 Recording started" }, ...l]);
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
      setLog(l => [{ time: new Date().toLocaleTimeString(), msg: "⏹ Browser recording stopped" }, ...l]);
      return;
    }

    try {
      await fetch(`${API}/stop_recording`, { method: "POST" });
      setRecording(false);
      setLog(l => [{ time: new Date().toLocaleTimeString(), msg: "⏹ Recording stopped" }, ...l]);
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
      setLog(l => [{ time: new Date().toLocaleTimeString(), msg: "🌐 Browser camera started" }, ...l]);
    } catch (err) {
      console.error("Camera error:", err);
      setLog(l => [{ time: new Date().toLocaleTimeString(), msg: "⚠️ Camera access denied" }, ...l]);
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
    setLog(l => [{ time: new Date().toLocaleTimeString(), msg: "🌐 Browser camera stopped" }, ...l]);
  };

  useEffect(() => {
    let animationFrameId;

    if (!camOn || mode !== "browser") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    let lastMotionTime = 0;

    const detect = () => {
      const video = videoRef.current;

      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameId = requestAnimationFrame(detect);
        return;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (prevFrameRef.current && prevFrameRef.current.width === canvas.width && prevFrameRef.current.height === canvas.height) {
        let diff = 0;

        for (let i = 0; i < frame.data.length; i += 4) {
          const r = Math.abs(frame.data[i] - prevFrameRef.current.data[i]);
          const g = Math.abs(frame.data[i + 1] - prevFrameRef.current.data[i + 1]);
          const b = Math.abs(frame.data[i + 2] - prevFrameRef.current.data[i + 2]);
          if ((r + g + b) / 3 > 30) diff++;
        }

        if (diff > 5000) {
          const now = Date.now();
          if (now - lastMotionTime > 1000) {
            lastMotionTime = now;
            setStatus(s => ({ ...s, status: "Motion Detected", motion_count: s.motion_count + 1 }));
            
            setLog(l => [{
              time: new Date().toLocaleTimeString(),
              msg: "🌐 Browser motion detected"
            }, ...l.slice(0, 19)]);
          } else {
            setStatus(s => s.status === "Motion Detected" ? s : { ...s, status: "Motion Detected" });
          }

          if (soundOn && alertSoundRef.current) {
            if (alertSoundRef.current.paused) {
              alertSoundRef.current.currentTime = 0;
              alertSoundRef.current.play().catch(() => {});
            }
          }
        } else {
          setStatus(s => s.status === "Normal" ? s : { ...s, status: "Normal" });
        }
      }

      prevFrameRef.current = frame;
      animationFrameId = requestAnimationFrame(detect);
    };

    detect();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [camOn, mode, soundOn]);

  const isRunning = mode === "backend" ? status.running : camOn;
  const motionActive = status.status === "Motion Detected";

  function btnStyle(color, disabled) {
    return {
      background: disabled ? "rgba(255,255,255,0.03)" : `${color}15`,
      border: `1px solid ${disabled ? "#ffffff11" : color + "44"}`,
      color: disabled ? "#333" : color,
      borderRadius: 10,
      padding: "10px 16px",
      fontSize: 13,
      fontFamily: "'Space Mono', monospace",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.2s ease",
      textAlign: "left",
    };
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#e0e0e0",
      fontFamily: "'Inter', sans-serif",
      padding: "32px 24px",
      boxSizing: "border-box",
    }}>
      <style>
        {`
          .logo:hover { transform: scale(1.08); }
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        `}
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img 
              src="/logo.png" 
              alt="logo" 
              className="logo"
              style={{ 
                width: 55, 
                filter: "drop-shadow(0 0 10px #00f0ff)",
                transition: "transform 0.3s ease"
              }} 
            />
            <div>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>
                Motion Detection System
              </div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "#f0f0f0" }}>
                Live Monitor
              </h1>
            </div>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: motionActive ? "rgba(255,60,60,0.1)" : "rgba(0,255,136,0.07)",
            border: `1px solid ${motionActive ? "#ff3c3c55" : "#00ff8855"}`,
            borderRadius: 99, padding: "8px 16px",
            transition: "all 0.4s ease",
          }}>
            <PulsingDot active={isRunning} />
            <span style={{ fontSize: 13, fontFamily: "'Space Mono', monospace", color: motionActive ? "#ff6060" : "#00ff88" }}>
              {motionActive ? "MOTION" : isRunning ? "CLEAR" : "OFFLINE"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <StatCard label="Status" value={isRunning ? (motionActive ? "Alert" : "Watching") : "Off"} accent={motionActive ? "#ff6060" : "#00ff88"} />
          <StatCard label="Events" value={status.motion_count} accent="#60aaff" />
          <StatCard label="FPS" value={mode === "browser" ? (camOn ? "30" : "—") : (status.fps || "—")} accent="#ffcc44" />
          <StatCard label="Camera" value={isRunning ? "ON" : "OFF"} accent={isRunning ? "#00ff88" : "#555"} />
          <StatCard label="Recording" value={recording ? "ON" : "OFF"} accent={recording ? "#ff4444" : "#555"} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${motionActive ? "#ff3c3c44" : "#ffffff11"}`,
            borderRadius: 16, overflow: "hidden",
            transition: "border-color 0.4s ease",
            position: "relative",
          }}>
            {mode === "backend" && isRunning && (
              <img
                src={`${API}/video_feed`}
                alt="Live feed"
                style={{ width: "100%", maxHeight: 420, objectFit: "cover", display: "block" }}
              />
            )}
            
            {mode === "browser" && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", maxHeight: 420, objectFit: "cover", display: camOn ? "block" : "none" }}
              />
            )}

            {!isRunning && (
              <div style={{
                height: 360,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                color: "#333",
              }}>
                <div style={{ fontSize: 48 }}>📷</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
                  Camera offline
                </div>
                <div style={{ fontSize: 12, color: "#222" }}>
                  Press Start to begin
                </div>
              </div>
            )}

            <canvas ref={canvasRef} style={{ display: "none" }} />
            
            {recording && (
              <div style={{
                position: "absolute", top: 12, right: 12,
                background: "#ff3c3c", borderRadius: 6,
                padding: "4px 10px", fontSize: 11,
                fontFamily: "'Space Mono', monospace",
                animation: "blink 0.8s step-end infinite",
              }}>
                ● REC
              </div>
            )}
            
            {!recording && motionActive && (
              <div style={{
                position: "absolute", top: 12, right: 12,
                background: "#ff9900", borderRadius: 6,
                padding: "4px 10px", fontSize: 11,
                fontFamily: "'Space Mono', monospace",
                animation: "blink 0.8s step-end infinite",
              }}>
                MOTION
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid #ffffff11",
              borderRadius: 16, padding: 20,
            }}>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 14 }}>Controls</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                 onClick={() => {
                   if (recording) handleStopRecording();
                   if (mode === "browser" && camOn) stopBrowserCamera();
                   if (mode === "backend" && isRunning) handleStop();
                   setMode(mode === "backend" ? "browser" : "backend");
                 }}
                 style={btnStyle("#ffaa00", false)}
                >
                  🔁 Mode: {mode.toUpperCase()}
                </button>
                <button 
                  onClick={mode === "backend" ? handleStart : startBrowserCamera}
                  disabled={isRunning}
                  style={btnStyle("#00ff88", isRunning)}
                >
                  ▶ Start Camera
                </button>
                <button 
                  onClick={mode === "backend" ? handleStop : stopBrowserCamera}
                  disabled={!isRunning}
                  style={btnStyle("#ff6060", !isRunning)}
                >
                  ⏹ Stop Camera
                </button> 
                <button 
                  onClick={handleReset} 
                  disabled={!isRunning || mode === "browser"} 
                  style={btnStyle("#60aaff", !isRunning || mode === "browser")}
                >
                  🔄 Reset Background
                </button>
                <button 
                  onClick={handleStartRecording}
                  disabled={recording || !isRunning}
                  style={btnStyle("#ffcc00", recording || !isRunning)}
                >
                  🎥 Start Recording
                </button>
                <button 
                  onClick={handleStopRecording} 
                  disabled={!recording}
                  style={btnStyle("#ff8800", !recording)}
                >
                  ⏹ Stop Recording
                </button>
                <button 
                  onClick={() => setSoundOn(!soundOn)}
                  style={btnStyle("#00ffaa", false)}
                >
                  🔊 Sound {soundOn ? "ON" : "OFF"}
                </button>
                {lastFile && (
                  <a 
                    href={mode === "browser" ? lastFile : `${API}/download/${lastFile}`} 
                    download={mode === "browser" ? "browser_recording.webm" : ""}
                    style={{
                      display: "block",
                      padding: "10px",
                      border: "1px solid #00ff88",
                      borderRadius: 10,
                      color: "#00ff88",
                      textDecoration: "none",
                      fontSize: 13
                    }}
                  >
                    📥 Download Clip
                  </a>
                )}
              </div>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid #ffffff11",
              borderRadius: 16, padding: 20, flex: 1,
              maxHeight: 260, overflow: "hidden", display: "flex", flexDirection: "column",
            }}>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 14 }}>Event Log</div>
              <div ref={logRef} style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {log.length === 0 && (
                  <div style={{ color: "#333", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>No events yet...</div>
                )}
                {log.map((e, i) => (
                  <div key={i} style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", borderBottom: "1px solid #ffffff08", paddingBottom: 6 }}>
                    <span style={{ color: "#555", fontSize: 10 }}>{e.time}</span>
                    <br />
                    <span style={{ color: e.msg.includes("Motion") || e.msg.includes("⚡") ? "#ff8080" : "#aaa" }}>{e.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, fontSize: 11, color: "#333", fontFamily: "'Space Mono', monospace", textAlign: "center" }}>
           Motion Detection System &nbsp;|&nbsp; OpenCV + Flask + React
        </div>
      </div>
    </div>
  );
}