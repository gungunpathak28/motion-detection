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

  // 🔥 ADD THESE STATES (after existing useState)
  // 🔥 MODE SYSTEM (NEW)
const [mode, setMode] = useState("backend"); // backend | browser
const [recording, setRecording] = useState(false);
const [lastFile, setLastFile] = useState("");
const [soundOn, setSoundOn] = useState(true);

// 🔥 Browser Camera Refs (IMPORTANT)
const videoRef = useRef(null);
const canvasRef = useRef(null);
const prevFrameRef = useRef(null);

const alertSoundRef = useRef(null);

useEffect(() => {
  alertSoundRef.current = new Audio("/alert.mp3");
}, []);
useEffect(() => {
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`${API}/status`);
      const data = await res.json();

      setStatus(prev => {
        if (data.status !== prev.status && data.status === "Motion Detected") {

          setLog(l => [{
            time: new Date().toLocaleTimeString(),
            msg: "⚡ Motion event detected"
          }, ...l.slice(0, 19)]);

          // ✅ FIXED SOUND
          if (soundOn && alertSoundRef.current) {
            alertSoundRef.current.currentTime = 0;
            alertSoundRef.current.play().catch(() => {});
          }
        }
        return data;
      });

    } catch (_) {}
  }, 500);
  return () => clearInterval(interval);
}, []);
useEffect(() => {
  if (!soundOn && alertSoundRef.current) {
    alertSoundRef.current.pause();
    alertSoundRef.current.currentTime = 0;
  }
}, [soundOn]);

  const handleStart = async () => {
    await fetch(`${API}/start`, { method: "POST" });
    setCamOn(true);
    setLog(l => [{ time: new Date().toLocaleTimeString(), msg: "▶ Camera started" }, ...l]);
  };

  const handleStop = async () => {
    await fetch(`${API}/stop`, { method: "POST" });
    setCamOn(false);
    setLog(l => [{ time: new Date().toLocaleTimeString(), msg: "⏹ Camera stopped" }, ...l]);
  };

  const handleReset = async () => {
    await fetch(`${API}/reset`, { method: "POST" });
    setLog(l => [{ time: new Date().toLocaleTimeString(), msg: "🔄 Background reference reset" }, ...l]);
  };
  const handleStartRecording = async () => {
  try {
    console.log("Start Recording clicked");

    const res = await fetch(`${API}/start_recording`, {
      method: "POST",
    });

    const data = await res.json();
    console.log("Backend response:", data);

    if (data.file) {
      setRecording(true);
      setLastFile(data.file);
    }

    setLog(l => [{
      time: new Date().toLocaleTimeString(),
      msg: "🎥 Recording started"
    }, ...l]);

  } catch (err) {
    console.error("Recording error:", err);
  }
};

const handleStopRecording = async () => {
  await fetch(`${API}/stop_recording`, { method: "POST" });
  setRecording(false);

  setLog(l => [{
    time: new Date().toLocaleTimeString(),
    msg: "⏹ Recording stopped"
  }, ...l]);
};
// 🌐 Browser Camera Start
const startBrowserCamera = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  videoRef.current.srcObject = stream;
  setCamOn(true);

  setLog(l => [{
    time: new Date().toLocaleTimeString(),
    msg: "🌐 Browser camera started"
  }, ...l]);
};

useEffect(() => {
  if (!camOn || mode !== "browser") return;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");

  const detect = () => {
    const video = videoRef.current;

    if (!video || video.readyState !== 4) {
      requestAnimationFrame(detect);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);

    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (prevFrameRef.current) {
      let diff = 0;

      for (let i = 0; i < frame.data.length; i += 4) {
        const d = Math.abs(frame.data[i] - prevFrameRef.current.data[i]);
        if (d > 30) diff++;
      }

      // 🔥 MOTION DETECT
      if (diff > 5000) {

        setStatus(s => ({ ...s, status: "Motion Detected" }));

        setLog(l => [{
          time: new Date().toLocaleTimeString(),
          msg: "🌐 Browser motion detected"
        }, ...l.slice(0, 19)]);

        // 🔊 SOUND AUTO PLAY
        if (soundOn && alertSoundRef.current) {
          if (!alertSoundRef.current.paused) return;
          alertSoundRef.current.currentTime = 0;
          alertSoundRef.current.play().catch(() => {});
        }

      } else {
        setStatus(s => ({ ...s, status: "Normal" }));
      }
    }

    prevFrameRef.current = frame;

    requestAnimationFrame(detect);
  };

  detect();

}, [camOn, mode]);

// 🌐 Stop
const stopBrowserCamera = () => {
  const tracks = videoRef.current?.srcObject?.getTracks();
  tracks?.forEach(t => t.stop());
  setCamOn(false);

  setLog(l => [{
    time: new Date().toLocaleTimeString(),
    msg: "🌐 Browser camera stopped"
  }, ...l]);
};
  const motionActive = status.status === "Motion Detected";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#e0e0e0",
      fontFamily: "'Inter', sans-serif",
      padding: "32px 24px",
      boxSizing: "border-box",
    }}>

      {/* 🔥 Global Logo Hover Animation */}
      <style>
        {`
          .logo:hover {
            transform: scale(1.08);
          }
        `}
      </style>

      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>

          {/* 🔥 LEFT SIDE (Logo + Title) */}
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

          {/* STATUS */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: motionActive ? "rgba(255,60,60,0.1)" : "rgba(0,255,136,0.07)",
            border: `1px solid ${motionActive ? "#ff3c3c55" : "#00ff8855"}`,
            borderRadius: 99, padding: "8px 16px",
            transition: "all 0.4s ease",
          }}>
            <PulsingDot active={status.running} />
            <span style={{ fontSize: 13, fontFamily: "'Space Mono', monospace", color: motionActive ? "#ff6060" : "#00ff88" }}>
              {motionActive ? "MOTION" : status.running ? "CLEAR" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <StatCard label="Status" value={status.running ? (motionActive ? "Alert" : "Watching") : "Off"} accent={motionActive ? "#ff6060" : "#00ff88"} />
          <StatCard label="Events" value={status.motion_count} accent="#60aaff" />
          <StatCard label="FPS" value={status.fps || "—"} accent="#ffcc44" />
          <StatCard label="Camera" value={status.running ? "ON" : "OFF"} accent={status.running ? "#00ff88" : "#555"} />
          <StatCard label="Recording" value={recording ? "ON" : "OFF"} accent={recording ? "#ff4444" : "#555"} />
        </div>

        {/* Main layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>

          {/* Video Feed */}
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${motionActive ? "#ff3c3c44" : "#ffffff11"}`,
            borderRadius: 16, overflow: "hidden",
            transition: "border-color 0.4s ease",
            position: "relative",
          }}>
            {camOn ? (
              mode === "backend" ? (
              <img
              src={`${API}/video_feed`}
              alt="Live feed"
              style={{ width: "100%", maxHeight: 420, objectFit: "cover" }}
              />
            ) : (
            <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: "100%", maxHeight: 420, objectFit: "cover" }}
             />
            )
          ) : (
          <div>Camera offline</div>
          )}
      
              <div style={{
                height: 360, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12,
                color: "#333",
              }}>
                <div style={{ fontSize: 48 }}>📷</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13 }}>Camera offline</div>
                <div style={{ fontSize: 12, color: "#222" }}>Press Start to begin</div>
              </div>
          
            {motionActive && (
              <div style={{
                position: "absolute", top: 12, right: 12,
                background: "#ff3c3c", borderRadius: 6,
                padding: "4px 10px", fontSize: 11,
                fontFamily: "'Space Mono', monospace",
                animation: "blink 0.8s step-end infinite",
              }}>
                ● REC
                <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Controls */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid #ffffff11",
              borderRadius: 16, padding: 20,
            }}>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 14 }}>Controls</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                 onClick={() => setMode(mode === "backend" ? "browser" : "backend")}
                 style={btnStyle("#ffaa00", false)}
                >
                  🔁 Mode: {mode.toUpperCase()}
                </button>
                <button 
                onClick={mode === "backend" ? handleStart : startBrowserCamera}
                disabled={mode === "backend" ? status.running : camOn}
                style={btnStyle("#00ff88", mode === "backend" ? status.running : camOn)}

                >
                  ▶ Start Camera
                  </button>
                 <button 
                 onClick={mode === "backend" ? handleStop : stopBrowserCamera}
                 disabled={mode === "backend" ? !status.running : !camOn}
                 style={btnStyle("#ff6060", mode === "backend" ? !status.running : !camOn)}

                 >
                  ⏹ Stop Camera
                  </button> 
                <button onClick={handleReset} disabled={!status.running} style={btnStyle("#60aaff", !status.running)}>
                  🔄 Reset Background
                </button>
                  <button 
                  onClick={() => {
                    console.log("CLICKED");
                    handleStartRecording();
                  }}
                  disabled={recording}
                  style={btnStyle("#ffcc00", recording)}
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
                         href={`${API}/download/${lastFile}`} 
                         download
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

            {/* Event Log */}
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
                    <span style={{ color: e.msg.includes("Motion") ? "#ff8080" : "#aaa" }}>{e.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, fontSize: 11, color: "#333", fontFamily: "'Space Mono', monospace", textAlign: "center" }}>
           Motion Detection System &nbsp;|&nbsp; OpenCV + Flask + React
        </div>
      </div>
    </div>
  );
}

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