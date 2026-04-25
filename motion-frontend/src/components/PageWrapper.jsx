import React from "react";
import { motion } from "framer-motion";

export function PageWrapper({ active, children }) {
  return (
    <motion.div
      initial={false}
      animate={{ 
        opacity: active ? 1 : 0, 
        y: active ? 0 : 20, 
        scale: active ? 1 : 0.98,
        pointerEvents: active ? "auto" : "none" 
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        position: active ? "relative" : "absolute",
        visibility: active ? "visible" : "hidden",
        width: "100%",
        top: 0,
        left: 0,
        zIndex: active ? 10 : 0
      }}
    >
      {children}
    </motion.div>
  );
}
