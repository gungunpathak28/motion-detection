import React from "react";
import { GlowingCard, itemVariants } from "../components/Shared";
import { motion } from "framer-motion";

export default function Dashboard({ isRunning, motionActive, status, recording }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#f8fafc", textShadow: "0 0 10px rgba(255,255,255,0.2)" }}>Dashboard Overview</div>
      <motion.div variants={itemVariants} style={{ display: "flex", gap: 24, flexWrap: "wrap", width: "100%" }}>
        <GlowingCard label="System Status" value={isRunning ? (motionActive ? "ALERT" : "CLEAR") : "OFF"} icon="📡" color={motionActive ? "#ef4444" : "#00ffff"} />
        <GlowingCard label="Total Events" value={status.motion_count} icon="📊" color="#3b82f6" />
        <GlowingCard label="Frame Rate" value={`${status.fps || 0} FPS`} icon="⚡" color="#f59e0b" />
        <GlowingCard label="Rec Status" value={recording ? "REC" : "IDLE"} icon="🎥" color={recording ? "#ef4444" : "#64748b"} />
      </motion.div>
      <div style={{ padding: 24, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(20px)", borderRadius: 24, border: "1px solid rgba(0, 255, 255, 0.1)" }}>
        <div style={{ fontSize: 12, color: "#00ffff", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 20, fontWeight: 700 }}>System Status Summary</div>
        <div style={{ color: "#94a3b8", lineHeight: "1.6", fontSize: 14 }}>
          Optical sensors are {isRunning ? "currently online and monitoring" : "currently offline"}. 
          {motionActive ? " MOTION DETECTED! Ensure security protocols are engaged." : " No recent anomalies detected."}
          Total unique events recorded in this session: {status.motion_count}.
        </div>
      </div>
    </div>
  );
}
