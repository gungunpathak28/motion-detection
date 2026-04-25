import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { panelStyle, itemVariants, btnStyle, PulsingDot } from "../components/Shared";

const API = "http://localhost:5000";

export default function Camera({ 
  isRunning, motionActive, recording, mode, setMode, 
  handleStart, handleStop, startBrowserCamera, stopBrowserCamera,
  handleStartRecording, handleStopRecording, 
  soundOn, setSoundOn, handleReset, lastFile, camOn,
  videoRef, canvasRef, overlayRef
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#f8fafc", textShadow: "0 0 10px rgba(255,255,255,0.2)" }}>Optical Sensor Interface</div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32, alignItems: "start" }}>
        
        {/* Camera Panel */}
        <motion.div variants={itemVariants} style={{ ...panelStyle, padding: 0 }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0, 255, 255, 0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)" }}>
             <div style={{ fontSize: 12, color: "#00ffff", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
               <span style={{ width: 8, height: 8, background: "#00ffff", borderRadius: "50%", boxShadow: "0 0 10px #00ffff" }} /> LIVE OPTICAL FEED
             </div>
             <div style={{ fontSize: 11, color: "#64748b", fontFamily: "'Space Mono', monospace" }}>CAM-01 [FRONT]</div>
          </div>

          <div style={{ position: "relative", minHeight: 500, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            
            {/* CCTV Overlay Corners */}
            <div style={{ position: "absolute", top: 20, left: 20, width: 40, height: 40, borderTop: "3px solid rgba(0,255,255,0.5)", borderLeft: "3px solid rgba(0,255,255,0.5)", zIndex: 10 }} />
            <div style={{ position: "absolute", top: 20, right: 20, width: 40, height: 40, borderTop: "3px solid rgba(0,255,255,0.5)", borderRight: "3px solid rgba(0,255,255,0.5)", zIndex: 10 }} />
            <div style={{ position: "absolute", bottom: 20, left: 20, width: 40, height: 40, borderBottom: "3px solid rgba(0,255,255,0.5)", borderLeft: "3px solid rgba(0,255,255,0.5)", zIndex: 10 }} />
            <div style={{ position: "absolute", bottom: 20, right: 20, width: 40, height: 40, borderBottom: "3px solid rgba(0,255,255,0.5)", borderRight: "3px solid rgba(0,255,255,0.5)", zIndex: 10 }} />

            {/* On-screen Overlays */}
            <div style={{ position: "absolute", top: 30, left: 30, zIndex: 10 }}>
              {isRunning && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: "rgba(0,0,0,0.6)", padding: "6px 12px", borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#00ffff", display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(0,255,255,0.2)" }}>
                  <PulsingDot color="#00ffff" /> RECORDING: {recording ? "ACTIVE" : "STANDBY"}
                </motion.div>
              )}
            </div>
            
            <div style={{ position: "absolute", top: 30, right: 30, zIndex: 10 }}>
              <AnimatePresence>
                {!recording && motionActive && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} style={{ background: "rgba(239, 68, 68, 0.9)", padding: "8px 16px", borderRadius: 4, fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#fff", boxShadow: "0 0 30px rgba(239,68,68,0.6)", border: "1px solid #ff0000" }}>
                    ⚠️ SUBJECT DETECTED
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Video Elements */}
            {mode === "backend" && isRunning && (
              <img src={`${API}/video_feed`} alt="Live feed" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            )}
            
            {/* 
              We always render video and canvas so detection works globally, 
              but they are styled to fit inside this container nicely.
              (Note: The ref is controlled by App.jsx) 
            */}
            {mode === "browser" && (
              <>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: camOn ? "block" : "none" }} />
                <canvas ref={overlayRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none", display: camOn ? "block" : "none" }} />
              </>
            )}
            
            {/* Grid Lines */}
            {isRunning && (
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
            )}

            {!isRunning && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, color: "#334155" }}>
                <div style={{ fontSize: 64 }}>📡</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, letterSpacing: "0.2em", color: "#475569" }}>CONNECTION LOST</div>
              </div>
            )}

            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
        </motion.div>

        {/* Controls Panel */}
        <motion.div variants={itemVariants} style={panelStyle}>
          <div style={{ fontSize: 12, color: "#00ffff", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 24, fontWeight: 700 }}>Command Center</div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <motion.button 
              whileHover={!isRunning ? {} : { scale: 1.02 }}
              whileTap={!isRunning ? {} : { scale: 0.98 }}
              onClick={() => {
                if (recording) handleStopRecording();
                if (mode === "browser" && camOn) stopBrowserCamera();
                if (mode === "backend" && isRunning) handleStop();
                setMode(mode === "backend" ? "browser" : "backend");
              }}
              style={{...btnStyle("#3b82f6", false), justifyContent: "space-between", padding: "16px 20px" }}
            >
              <span>Input Source</span>
              <span style={{ color: "#3b82f6", background: "rgba(59, 130, 246, 0.15)", padding: "4px 10px", borderRadius: 6, boxShadow: "0 0 10px rgba(59, 130, 246, 0.3)" }}>{mode.toUpperCase()}</span>
            </motion.button>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <motion.button whileHover={isRunning ? {} : { scale: 1.02 }} whileTap={isRunning ? {} : { scale: 0.98 }} onClick={mode === "backend" ? handleStart : startBrowserCamera} disabled={isRunning} style={btnStyle("#00ffff", isRunning)}>
                ▶ Initialize
              </motion.button>
              <motion.button whileHover={!isRunning ? {} : { scale: 1.02 }} whileTap={!isRunning ? {} : { scale: 0.98 }} onClick={mode === "backend" ? handleStop : stopBrowserCamera} disabled={!isRunning} style={btnStyle("#ef4444", !isRunning)}>
                ⏹ Terminate
              </motion.button> 
              <motion.button whileHover={recording || !isRunning ? {} : { scale: 1.02 }} whileTap={recording || !isRunning ? {} : { scale: 0.98 }} onClick={handleStartRecording} disabled={recording || !isRunning} style={btnStyle("#f59e0b", recording || !isRunning)}>
                🎥 Record
              </motion.button>
              <motion.button whileHover={!recording ? {} : { scale: 1.02 }} whileTap={!recording ? {} : { scale: 0.98 }} onClick={handleStopRecording} disabled={!recording} style={btnStyle("#f97316", !recording)}>
                ⏹ Stop Rec
              </motion.button>
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setSoundOn(!soundOn)} style={btnStyle(soundOn ? "#00ffff" : "#64748b", false)}>
              {soundOn ? "🔊 Audio Alerts Active" : "🔇 Audio Alerts Muted"}
            </motion.button>
            
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleReset} style={{...btnStyle("#8b5cf6", false), borderStyle: "dashed" }}>
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
                  padding: "16px",
                  background: "rgba(0, 255, 255, 0.1)",
                  border: "1px solid rgba(0, 255, 255, 0.3)",
                  borderRadius: 12,
                  color: "#00ffff", textDecoration: "none",
                  fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace",
                  boxShadow: "0 0 20px rgba(0, 255, 255, 0.15)"
                }}
              >
                📥 EXPORT FOOTAGE
              </motion.a>
            )}
          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  );
}
