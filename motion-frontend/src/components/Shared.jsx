import React from "react";
import { motion } from "framer-motion";
import Tilt from "react-parallax-tilt";

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

export const panelStyle = {
  background: "rgba(15, 23, 42, 0.5)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(0, 255, 255, 0.1)",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,255,255,0.02)",
  position: "relative",
  overflow: "hidden"
};

export function GlowingCard({ label, value, icon, color }) {
  return (
    <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} glareEnable={true} glareMaxOpacity={0.2} scale={1.02} transitionSpeed={2000} style={{ flex: 1, minWidth: 200 }}>
      <motion.div
        variants={itemVariants}
        whileHover={{ boxShadow: `0 0 40px ${color}33`, borderColor: `${color}88` }}
        style={{
          background: "linear-gradient(145deg, rgba(15, 23, 42, 0.8) 0%, rgba(2, 6, 23, 0.9) 100%)",
          backdropFilter: "blur(20px)",
          border: `1px solid rgba(255, 255, 255, 0.05)`,
          borderRadius: 24,
          padding: "24px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "2px", background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
        <div style={{ position: "absolute", bottom: "-20px", right: "-20px", width: 100, height: 100, background: color, filter: "blur(60px)", opacity: 0.15, borderRadius: "50%" }} />
        
        <div style={{
          width: 56, height: 56, borderRadius: "16px",
          background: `linear-gradient(135deg, ${color}22 0%, transparent 100%)`, 
          border: `1px solid ${color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, boxShadow: `inset 0 0 20px ${color}22`
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 6, fontFamily: "'Space Mono', monospace" }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#f8fafc", fontFamily: "'Inter', sans-serif", textShadow: `0 0 20px ${color}55` }}>{value}</div>
        </div>
      </motion.div>
    </Tilt>
  );
}

export function PulsingDot({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 12, height: 12, marginRight: 10 }}>
      <motion.span 
        animate={{ boxShadow: [`0 0 0 0 ${color}99`, `0 0 0 15px ${color}00`] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          display: "block", width: 12, height: 12, borderRadius: "50%",
          background: color, boxShadow: `0 0 10px ${color}`
        }} 
      />
    </span>
  );
}

export const getEventIcon = (msg) => {
  if (msg.includes("started")) return "▶";
  if (msg.includes("stopped")) return "⏹";
  if (msg.includes("reset")) return "🔄";
  if (msg.includes("recording")) return "🎥";
  if (msg.includes("motion") || msg.includes("Motion") || msg.includes("⚡")) return "⚡";
  if (msg.includes("denied")) return "⚠️";
  return "ℹ️";
};

export const getEventColor = (msg) => {
  if (msg.includes("motion") || msg.includes("Motion") || msg.includes("⚡")) return "#ef4444"; 
  if (msg.includes("started") || msg.includes("Camera")) return "#00ffff"; 
  if (msg.includes("recording")) return "#f59e0b"; 
  if (msg.includes("reset")) return "#3b82f6"; 
  return "#8b5cf6"; 
};

export const btnStyle = (color, disabled) => ({
  background: disabled ? "rgba(255,255,255,0.02)" : `linear-gradient(135deg, ${color}22 0%, transparent 100%)`,
  border: `1px solid ${disabled ? "rgba(255,255,255,0.05)" : color + "66"}`,
  color: disabled ? "#475569" : color,
  borderRadius: 12,
  padding: "14px 16px",
  fontSize: 12,
  fontFamily: "'Space Mono', monospace",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  cursor: disabled ? "not-allowed" : "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
  backdropFilter: "blur(10px)",
  boxShadow: disabled ? "none" : `0 0 15px ${color}22, inset 0 0 10px ${color}11`,
  width: "100%",
  transition: "all 0.3s ease"
});
