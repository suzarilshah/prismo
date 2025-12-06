"use client";

import { motion, AnimatePresence } from "framer-motion";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  text?: string;
  className?: string;
  showText?: boolean;
  variant?: "default" | "minimal" | "fullscreen";
}

const sizeMap = {
  xs: { icon: 16, container: 28 },
  sm: { icon: 24, container: 44 },
  md: { icon: 32, container: 60 },
  lg: { icon: 48, container: 88 },
  xl: { icon: 64, container: 120 },
  "2xl": { icon: 80, container: 150 },
};

// Prism Diamond SVG Component for animation control
function PrismIcon({ size, className = "" }: { size: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="loadingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#8B5CF6" }} />
          <stop offset="100%" style={{ stopColor: "#A78BFA" }} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <g filter="url(#glow)">
        {/* Main diamond */}
        <motion.path 
          d="M 32 4 L 56 32 L 32 60 L 8 32 Z" 
          fill="url(#loadingGrad)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        {/* Left facet */}
        <path d="M 8 32 L 32 4 L 32 60 Z" fill="#6D28D9" opacity="0.5"/>
        {/* Top highlight */}
        <motion.path 
          d="M 20 18 L 32 4 L 44 18 Z" 
          fill="#FFFFFF" 
          opacity="0.4"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Center beam */}
        <motion.line 
          x1="32" y1="8" x2="32" y2="56" 
          stroke="#FFFFFF" 
          strokeWidth="3" 
          strokeLinecap="round"
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </g>
    </svg>
  );
}

// Orbiting particles
function OrbitingParticles({ size }: { size: number }) {
  const particles = [0, 1, 2, 3, 4, 5];
  const radius = size * 0.45;
  
  return (
    <>
      {particles.map((i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-violet-500"
          style={{
            left: "50%",
            top: "50%",
            marginLeft: -4,
            marginTop: -4,
          }}
          animate={{
            x: [
              Math.cos((i / particles.length) * Math.PI * 2) * radius,
              Math.cos((i / particles.length) * Math.PI * 2 + Math.PI * 2) * radius
            ],
            y: [
              Math.sin((i / particles.length) * Math.PI * 2) * radius,
              Math.sin((i / particles.length) * Math.PI * 2 + Math.PI * 2) * radius
            ],
            scale: [0.5, 1, 0.5],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.15,
          }}
        />
      ))}
    </>
  );
}

// Pulsing rings
function PulsingRings({ size }: { size: number }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-violet-500/30"
          style={{
            width: size * 0.7,
            height: size * 0.7,
            left: "50%",
            top: "50%",
            marginLeft: -(size * 0.7) / 2,
            marginTop: -(size * 0.7) / 2,
          }}
          animate={{
            scale: [1, 1.8, 1.8],
            opacity: [0.6, 0, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
            delay: i * 0.6,
          }}
        />
      ))}
    </>
  );
}

export function LoadingSpinner({
  size = "lg",
  text,
  className = "",
  showText = true,
  variant = "default"
}: LoadingSpinnerProps) {
  const { icon: iconSize, container: containerSize } = sizeMap[size];

  if (variant === "fullscreen") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <LoadingSpinnerContent 
          iconSize={iconSize * 1.5} 
          containerSize={containerSize * 1.5} 
          text={text || "Loading your dashboard..."} 
          showText={showText}
        />
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, ease: "linear", repeat: Infinity }}
        >
          <PrismIcon size={iconSize * 0.6} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-6 ${className}`}>
      <LoadingSpinnerContent 
        iconSize={iconSize} 
        containerSize={containerSize} 
        text={text || "Loading..."} 
        showText={showText}
      />
    </div>
  );
}

function LoadingSpinnerContent({ 
  iconSize, 
  containerSize, 
  text, 
  showText 
}: { 
  iconSize: number; 
  containerSize: number; 
  text: string; 
  showText: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-8">
      {/* Main animation container */}
      <div 
        className="relative flex items-center justify-center"
        style={{ width: containerSize, height: containerSize }}
      >
        {/* Ambient glow */}
        <motion.div
          className="absolute rounded-full bg-gradient-to-br from-violet-600/20 via-purple-500/15 to-fuchsia-500/20 blur-3xl"
          style={{ width: containerSize * 1.2, height: containerSize * 1.2 }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Pulsing rings */}
        <PulsingRings size={containerSize} />

        {/* Orbiting particles */}
        <OrbitingParticles size={containerSize} />

        {/* Rotating outer ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: containerSize * 0.85,
            height: containerSize * 0.85,
            border: "2px dashed rgba(139, 92, 246, 0.3)",
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Counter-rotating inner ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: containerSize * 0.65,
            height: containerSize * 0.65,
            border: "1px solid rgba(139, 92, 246, 0.2)",
          }}
          animate={{ rotate: -360 }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Spinning Prism Logo */}
        <motion.div
          className="relative z-10"
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            rotate: {
              duration: 4,
              ease: "linear",
              repeat: Infinity,
            },
            scale: {
              duration: 2,
              ease: "easeInOut",
              repeat: Infinity,
            },
          }}
        >
          {/* Logo glow */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 blur-2xl rounded-full"
            style={{ 
              width: iconSize, 
              height: iconSize,
              left: 0,
              top: 0,
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          <PrismIcon size={iconSize} className="relative z-10" />
        </motion.div>
      </div>

      {/* Loading text with animated dots */}
      <AnimatePresence>
        {showText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-2"
          >
            <motion.p
              className="text-lg font-medium text-foreground tracking-wide"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {text}
            </motion.p>
            
            {/* Animated loading dots */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-violet-500"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.15,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
