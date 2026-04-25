import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { panelStyle, itemVariants, getEventIcon, getEventColor } from "../components/Shared";

export default function Logs({ log, logRef }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, height: "100%" }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#f8fafc", textShadow: "0 0 10px rgba(255,255,255,0.2)" }}>Security Logs</div>
      
      <motion.div variants={itemVariants} style={{ ...panelStyle, flex: 1, display: "flex", flexDirection: "column", minHeight: 600 }}>
        <div style={{ fontSize: 12, color: "#00ffff", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 20, fontWeight: 700 }}>System Event History</div>
        
        <div ref={logRef} style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 12, paddingRight: 8 }}>
          {log.length === 0 && (
            <div style={{ color: "#475569", fontSize: 12, fontFamily: "'Space Mono', monospace", textAlign: "center", marginTop: 40 }}>Waiting for events...</div>
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
                    fontSize: 12, fontFamily: "'Space Mono', monospace", 
                    background: `linear-gradient(90deg, ${color}15 0%, transparent 100%)`,
                    borderLeft: `3px solid ${color}`,
                    padding: "16px", borderRadius: "0 8px 8px 0",
                    display: "flex", alignItems: "center", gap: 16,
                    boxShadow: `inset 10px 0 20px -10px ${color}33`
                  }}
                >
                  <span style={{ fontSize: 18, filter: `drop-shadow(0 0 5px ${color})` }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: color, fontWeight: 600, fontSize: 14 }}>{e.msg.replace(/[⚡▶⏹🔄🎥⚠️ℹ️]/g, "").trim().toUpperCase()}</span>
                  </div>
                  <span style={{ color: "#64748b", fontSize: 11 }}>{e.time}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
