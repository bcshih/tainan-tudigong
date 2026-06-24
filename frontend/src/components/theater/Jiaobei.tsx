import { AnimatePresence, motion } from "framer-motion";

export function Crescent({ flat, side }: { flat: boolean; side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <div
      style={{
        width: "3.6rem",
        height: "5.5rem",
        transform: isLeft ? "scaleX(-1) rotate(-15deg)" : "scaleX(1) rotate(15deg)",
        filter: "drop-shadow(2px 8px 10px rgba(0,0,0,0.5))"
      }}
      aria-hidden
    >
      <svg viewBox="0 0 100 160" style={{ width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <linearGradient id={`flatGrad-${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d43822" />
            <stop offset="100%" stopColor="#8f1507" />
          </linearGradient>

          <radialGradient id={`roundGrad-${side}`} cx="30%" cy="40%" r="70%" fx="20%" fy="30%">
            <stop offset="0%" stopColor="#ff6247" />
            <stop offset="20%" stopColor="#de2a14" />
            <stop offset="70%" stopColor="#8f1507" />
            <stop offset="100%" stopColor="#3d0500" />
          </radialGradient>
        </defs>

        <path
          d="M 50,5 C 110,40 110,120 50,155 C 35,110 35,50 50,5 Z"
          fill={flat ? `url(#flatGrad-${side})` : `url(#roundGrad-${side})`}
        />
        
        {flat && (
          <path
            d="M 50,5 C 105,40 105,120 50,155 C 38,110 38,50 50,5 Z"
            fill="none"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="1"
          />
        )}

        {!flat && (
          <path
            d="M 50,5 C 100,40 100,120 50,155"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="4"
            style={{ filter: "blur(2px)" }}
          />
        )}
      </svg>
    </div>
  );
}

export function AnimatedJiubei({ 
  phase, 
  c1, 
  c2 
}: { 
  phase: "idle" | "ready" | "throwing" | "result", 
  c1: boolean, 
  c2: boolean 
}) {
  const tossing = phase === "throwing";
  const ready = phase === "ready";
  const settled = phase === "result";

  return (
    <div className="jiaobei">
      <div className="jiaobei__stage" style={{ padding: 0, minHeight: "auto", gap: "1.5rem" }}>
        <div className="jiaobei__pair">
          {/* Left block */}
          <motion.div
            className="jiaobei__toss"
            animate={
              tossing
                ? { y: [-4, -120, 0], rotate: [0, -380, -360] }
                : ready
                ? { y: -20, rotate: 0 }
                : { y: 0, rotate: settled ? -360 : 0 }
            }
            transition={
              tossing
                ? { duration: 1.2, ease: "easeOut" }
                : { type: "spring", stiffness: 300, damping: 14 }
            }
          >
            <Crescent flat={c1} side="left" />
          </motion.div>

          {/* Right block */}
          <motion.div
            className="jiaobei__toss"
            animate={
              tossing
                ? { y: [-4, -150, 0], rotate: [0, 420, 360] }
                : ready
                ? { y: -20, rotate: 0 }
                : { y: 0, rotate: settled ? 360 : 0 }
            }
            transition={
              tossing
                ? { duration: 1.2, ease: "easeOut", delay: 0.06 }
                : { type: "spring", stiffness: 300, damping: 14, delay: 0.06 }
            }
          >
            <Crescent flat={c2} side="right" />
          </motion.div>
        </div>

        {/* Gold burst on the holy cast */}
        <AnimatePresence>
          {settled && (!c1 && c2) && ( // 聖筊才發光
            <motion.span
              className="jiaobei__burst"
              aria-hidden
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.3, 1.7, 2.3] }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
