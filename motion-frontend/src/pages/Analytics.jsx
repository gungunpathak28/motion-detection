import React from "react";
import { motion } from "framer-motion";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { panelStyle, itemVariants } from "../components/Shared";

export default function Analytics({ chartData, isRunning, eventStats }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#f8fafc", textShadow: "0 0 10px rgba(255,255,255,0.2)" }}>System Analytics</div>
      
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 }}>
        <motion.div variants={itemVariants} style={panelStyle}>
          <div style={{ fontSize: 12, color: "#00ffff", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 20, fontWeight: 700 }}>Motion Intensity Graph</div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 10, fontFamily: "'Space Mono', monospace" }} />
                <YAxis stroke="#475569" tick={{ fontSize: 10, fontFamily: "'Space Mono', monospace" }} width={30} />
                <Tooltip contentStyle={{ background: "rgba(15, 23, 42, 0.9)", border: "1px solid #00ffff", borderRadius: 8, boxShadow: "0 0 15px rgba(0,255,255,0.2)", color: "#00ffff" }} itemStyle={{ color: "#00ffff" }} labelStyle={{ display: "none" }} />
                <Line type="monotone" dataKey="intensity" stroke="#00ffff" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#00ffff", boxShadow: "0 0 10px #00ffff" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} style={panelStyle}>
          <div style={{ fontSize: 12, color: "#00ffff", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 20, fontWeight: 700 }}>System Integrity</div>
          <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ name: "Active", value: isRunning ? 100 : 0 }, { name: "Offline", value: isRunning ? 0 : 100 }]} innerRadius={70} outerRadius={100} dataKey="value" stroke="none">
                  <Cell fill="#00ffff" style={{ filter: "drop-shadow(0 0 8px rgba(0,255,255,0.5))" }} />
                  <Cell fill="rgba(255,255,255,0.05)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#00ffff", textShadow: "0 0 15px rgba(0,255,255,0.5)", fontFamily: "'Space Mono', monospace" }}>{isRunning ? "100%" : "0%"}</div>
              <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.1em", marginTop: 4 }}>HEALTH</div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} style={panelStyle}>
         <div style={{ fontSize: 12, color: "#00ffff", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 20, fontWeight: 700 }}>Event Distribution</div>
         <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventStats}>
                <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 11, fontFamily: "'Space Mono', monospace" }} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ background: "rgba(15, 23, 42, 0.9)", border: "1px solid #3b82f6", borderRadius: 8 }} itemStyle={{ color: "#3b82f6" }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
         </div>
      </motion.div>

    </div>
  );
}
