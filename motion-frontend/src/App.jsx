import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { PulsingDot } from "./components/Shared";
import { PageWrapper } from "./components/PageWrapper";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Camera from "./pages/Camera";
import Logs from "./pages/Logs";

const API = "http://localhost:5000";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  
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

  const [chartData, setChartData] = useState(Array.from({ length: 20 }, (_, i) => ({ time: i, intensity: 0 })));

  useEffect(() => {
    alertSoundRef.current = new Audio("/alert.mp3");
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [log]);

  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => {
        const intensity = motionFramesRef.current * 33; 
        return [...prev.slice(1), { time: new Date().toLocaleTimeString().split(" ")[0], intensity }];
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
    setLog(l => [{ id: Date.now(), time: new Date().toLocaleTimeString(), msg }, ...l.slice(0, 49)]);
  };

  const handleStart = async () => {
    try {
      await fetch(`${API}/start`, { method: "POST" });
      addLog("▶ Backend camera started");
    } catch (err) {}
  };

  const handleStop = async () => {
    try {
      await fetch(`${API}/stop`, { method: "POST" });
      addLog("⏹ Backend camera stopped");
    } catch (err) {}
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
      overlayRef.current.getContext("2d")?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
  };

  const handleStartRecording = async () => {
    if (mode === "browser") {
      if (!videoRef.current || !videoRef.current.srcObject) return;
      mediaRecorderRef.current = new MediaRecorder(videoRef.current.srcObject);
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        chunksRef.current = [];
        setLastFile(URL.createObjectURL(blob));
      };
      mediaRecorderRef.current.start();
      setRecording(true);
      addLog("🎥 Browser recording started");
      return;
    }
    try {
      const res = await fetch(`${API}/start_recording`, { method: "POST" });
      const data = await res.json();
      if (data.file) { setRecording(true); setLastFile(data.file); }
      addLog("🎥 Backend recording started");
    } catch (err) {}
  };

  const handleStopRecording = async () => {
    if (mode === "browser") {
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      setRecording(false);
      addLog("⏹ Browser recording stopped");
      return;
    }
    try {
      await fetch(`${API}/stop_recording`, { method: "POST" });
      setRecording(false);
      addLog("⏹ Backend recording stopped");
    } catch (err) {}
  };

  const startBrowserCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCamOn(true);
      addLog("🌐 Browser camera started");
    } catch (err) { addLog("⚠️ Camera access denied"); }
  };

  const stopBrowserCamera = () => {
    if (recording) handleStopRecording();
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
    
    setStatus(s => ({ ...s, status: "Normal" }));
    prevFrameRef.current = null;
    motionFramesRef.current = 0;
    isMotionActiveRef.current = false;
    frameCountRef.current = 0;
    
    if (overlayRef.current) overlayRef.current.getContext("2d")?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    addLog("🌐 Browser camera stopped");
  };

  // Canvas Detection Loop
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
        if (overlay) { overlay.width = video.videoWidth; overlay.height = video.videoHeight; }
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const overlayCtx = overlay?.getContext("2d");
      if (overlayCtx) overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

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
             overlayCtx.strokeStyle = "#ef4444"; 
             overlayCtx.lineWidth = 2;
             overlayCtx.strokeRect(minX, minY, boxWidth, boxHeight);
             
             // Crosshair corners
             overlayCtx.lineWidth = 4;
             overlayCtx.beginPath();
             overlayCtx.moveTo(minX, minY + 15); overlayCtx.lineTo(minX, minY); overlayCtx.lineTo(minX + 15, minY);
             overlayCtx.moveTo(maxX, minY + 15); overlayCtx.lineTo(maxX, minY); overlayCtx.lineTo(maxX - 15, minY);
             overlayCtx.moveTo(minX, maxY - 15); overlayCtx.lineTo(minX, maxY); overlayCtx.lineTo(minX + 15, maxY);
             overlayCtx.moveTo(maxX, maxY - 15); overlayCtx.lineTo(maxX, maxY); overlayCtx.lineTo(maxX - 15, maxY);
             overlayCtx.stroke();

             overlayCtx.fillStyle = "rgba(239, 68, 68, 0.1)";
             overlayCtx.fillRect(minX, minY, boxWidth, boxHeight);
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
    return () => cancelAnimationFrame(animationFrameId);
  }, [camOn, mode, soundOn]);

  const isRunning = mode === "backend" ? status.running : camOn;
  const motionActive = status.status === "Motion Detected";
  const navItems = ["Dashboard", "Analytics", "Camera", "Logs"];

  const eventStats = [
    { name: "Browser", count: log.filter(l => l.msg.includes("Browser motion")).length },
    { name: "Backend", count: log.filter(l => l.msg.includes("Backend motion")).length },
    { name: "System", count: log.filter(l => l.msg.includes("started") || l.msg.includes("stopped") || l.msg.includes("reset")).length },
    { name: "Recordings", count: log.filter(l => l.msg.includes("recording")).length }
  ];

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "#020617",
      color: "#f8fafc",
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden"
    }}>
      {/* Background Ambient Glow */}
      <div style={{ position: "absolute", top: "0%", left: "20%", width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(0,255,255,0.03) 0%, rgba(0,0,0,0) 70%)", zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "0%", right: "0%", width: "60vw", height: "60vw", background: "radial-gradient(circle, rgba(59,130,246,0.03) 0%, rgba(0,0,0,0) 70%)", zIndex: 0, pointerEvents: "none" }} />

      <style>
        {`
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(0,255,255,0.2); border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(0,255,255,0.5); }
        `}
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;800&display=swap" rel="stylesheet" />

      {/* Left Sidebar */}
      <div style={{
        width: 280,
        background: "linear-gradient(180deg, rgba(15,23,42,0.8) 0%, rgba(2,6,23,0.9) 100%)",
        borderRight: "1px solid rgba(0, 255, 255, 0.1)",
        backdropFilter: "blur(30px)",
        display: "flex", flexDirection: "column",
        padding: "32px 24px",
        zIndex: 10,
        boxShadow: "10px 0 30px rgba(0,0,0,0.5)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 60 }}>
          <motion.img 
            initial={{ rotate: -10, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            whileHover={{ scale: 1.1, rotate: 10, filter: "drop-shadow(0 0 20px rgba(0, 255, 255, 0.8))" }}
            transition={{ duration: 0.6, type: "spring" }}
            src="/logo.png" 
            alt="logo" 
            style={{ width: 48, filter: "drop-shadow(0 0 10px rgba(0, 255, 255, 0.5))", borderRadius: 12 }} 
          />
          <div>
            <div style={{ color: "#00ffff", fontWeight: 800, letterSpacing: "0.15em", fontSize: 20, textShadow: "0 0 10px rgba(0, 255, 255, 0.5)" }}>A.I. CORE</div>
            <div style={{ color: "#64748b", fontSize: 10, letterSpacing: "0.2em", fontFamily: "'Space Mono', monospace" }}>SURVEILLANCE</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 8 }}>MAIN MENU</div>
          {navItems.map(item => (
            <motion.div
              key={item}
              whileHover={{ x: 5, backgroundColor: "rgba(0, 255, 255, 0.05)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(item)}
              style={{
                padding: "16px 20px",
                borderRadius: 14,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 16,
                background: activeTab === item ? "linear-gradient(90deg, rgba(0,255,255,0.1) 0%, transparent 100%)" : "transparent",
                borderLeft: `4px solid ${activeTab === item ? "#00ffff" : "transparent"}`,
                color: activeTab === item ? "#00ffff" : "#94a3b8",
                fontWeight: activeTab === item ? 700 : 500,
                boxShadow: activeTab === item ? "inset 20px 0 30px -20px rgba(0, 255, 255, 0.3)" : "none",
                transition: "all 0.3s ease",
                fontFamily: "'Space Mono', monospace",
                fontSize: 13, letterSpacing: "0.05em"
              }}
            >
              <span style={{ fontSize: 18, filter: activeTab === item ? "drop-shadow(0 0 5px #00ffff)" : "none" }}>
                {item === "Dashboard" ? "⚡" : item === "Analytics" ? "📊" : item === "Camera" ? "🎥" : "📝"}
              </span>
              {item}
            </motion.div>
          ))}
        </div>

        <div style={{ marginTop: "auto" }}>
          <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "16px", display: "flex", alignItems: "center", gap: 12 }}>
            <PulsingDot color="#10b981" />
            <div>
              <div style={{ color: "#10b981", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>SYSTEM ONLINE</div>
              <div style={{ color: "#64748b", fontSize: 10, fontFamily: "'Space Mono', monospace" }}>All modules optimal</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: "40px", overflowY: "auto", position: "relative", zIndex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* Top Universal Header */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 40 }}>
          
          {/* Status Indicator */}
          <motion.div 
            layout
            style={{
              display: "flex", alignItems: "center", gap: 12,
              background: motionActive ? "rgba(239, 68, 68, 0.15)" : "rgba(0, 255, 255, 0.05)",
              border: `1px solid ${motionActive ? "rgba(239, 68, 68, 0.5)" : "rgba(0, 255, 255, 0.3)"}`,
              borderRadius: 99, padding: "12px 28px",
              backdropFilter: "blur(12px)", boxShadow: motionActive ? "0 0 30px rgba(239, 68, 68, 0.3)" : "0 0 20px rgba(0, 255, 255, 0.1)",
            }}
          >
            <PulsingDot color={motionActive ? "#ef4444" : isRunning ? "#00ffff" : "#64748b"} />
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: motionActive ? "#ef4444" : isRunning ? "#00ffff" : "#64748b", letterSpacing: "0.1em" }}>
              {motionActive ? "MOTION ALERT" : isRunning ? "MONITORING ACTIVE" : "SENSORS OFFLINE"}
            </span>
          </motion.div>
        </div>

        {/* Dynamic Page Views */}
        <div style={{ position: "relative", flex: 1, width: "100%", maxWidth: 1400, margin: "0 auto" }}>
          
          <PageWrapper active={activeTab === "Dashboard"}>
            <Dashboard 
              isRunning={isRunning} 
              motionActive={motionActive} 
              status={status} 
              recording={recording} 
            />
          </PageWrapper>

          <PageWrapper active={activeTab === "Analytics"}>
            <Analytics 
              chartData={chartData} 
              isRunning={isRunning} 
              eventStats={eventStats} 
            />
          </PageWrapper>

          <PageWrapper active={activeTab === "Camera"}>
            <Camera 
              isRunning={isRunning} motionActive={motionActive} recording={recording} 
              mode={mode} setMode={setMode} 
              handleStart={handleStart} handleStop={handleStop} 
              startBrowserCamera={startBrowserCamera} stopBrowserCamera={stopBrowserCamera}
              handleStartRecording={handleStartRecording} handleStopRecording={handleStopRecording} 
              soundOn={soundOn} setSoundOn={setSoundOn} handleReset={handleReset} 
              lastFile={lastFile} camOn={camOn}
              videoRef={videoRef} canvasRef={canvasRef} overlayRef={overlayRef}
            />
          </PageWrapper>

          <PageWrapper active={activeTab === "Logs"}>
            <Logs log={log} logRef={logRef} />
          </PageWrapper>

        </div>
      </div>
    </div>
  );
}