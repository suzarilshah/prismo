"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
  iconColor?: string;
  trend?: "up" | "down" | "neutral";
  prefix?: string;
  suffix?: string;
  className?: string;
  animate?: boolean;
}

// Animated counter hook
function useAnimatedCounter(value: number, duration: number = 1000) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) {
      setDisplayValue(value);
      return;
    }

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smoother animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setHasAnimated(true);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration, hasAnimated]);

  return displayValue;
}

export function StatsCard({
  title,
  value,
  change,
  icon,
  iconColor = "bg-blue-500/20 text-blue-400",
  trend = "neutral",
  prefix = "",
  suffix = "",
  className,
  animate = true
}: StatsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring config for smooth hover effects
  const springConfig = { damping: 25, stiffness: 150 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  // Calculate rotation based on mouse position
  const rotateX = useTransform(y, [-0.5, 0.5], ["2deg", "-2deg"]);
  const rotateY = useTransform(x, [-0.5, 0.5], ["-2deg", "2deg"]);

  // Handle mouse move for 3D effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set((e.clientX - centerX) / rect.width);
    mouseY.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Parse numeric value for animation
  const numericValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]+/g, "")) 
    : value;
  
  const animatedValue = useAnimatedCounter(
    animate ? numericValue : 0, 
    1500
  );

  // Format the display value
  const formatValue = (val: number) => {
    if (typeof value === 'string' && value.includes(',')) {
      return val.toLocaleString();
    }
    return val.toString();
  };

  const displayValue = animate 
    ? `${prefix}${formatValue(animatedValue)}${suffix}`
    : `${prefix}${typeof value === 'number' ? value.toLocaleString() : value}${suffix}`;

  const trendConfig = {
    up: { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    down: { icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10" },
    neutral: { icon: Minus, color: "text-zinc-400", bg: "bg-zinc-500/10" }
  };

  const TrendIcon = trendConfig[trend].icon;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative group bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50",
        "rounded-xl p-6 overflow-hidden transition-all duration-300",
        "hover:border-zinc-700/50 hover:shadow-lg hover:shadow-blue-500/5",
        className
      )}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            {title}
          </span>
          {icon && (
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className={cn(
                "p-2.5 rounded-lg transition-colors",
                iconColor
              )}
            >
              {icon}
            </motion.div>
          )}
        </div>

        <motion.div 
          className="text-3xl font-bold text-white mb-2 tabular-nums"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          {displayValue}
        </motion.div>

        {change && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="flex items-center gap-2"
          >
            <span className={cn(
              "flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full",
              trendConfig[trend].bg,
              trendConfig[trend].color
            )}>
              <TrendIcon className="w-3.5 h-3.5" />
              {change.value > 0 ? "+" : ""}{change.value}%
            </span>
            {change.label && (
              <span className="text-sm text-zinc-500">{change.label}</span>
            )}
          </motion.div>
        )}
      </div>

      {/* Shine effect on hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100"
        style={{
          background: "linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)",
          backgroundSize: "200% 200%",
        }}
        animate={{
          backgroundPosition: ["0% 0%", "200% 200%"],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "loop",
        }}
      />
    </motion.div>
  );
}

// Quick Stats Row - for smaller inline stats
export function QuickStats({ 
  stats 
}: { 
  stats: Array<{ label: string; value: string; color?: string }> 
}) {
  return (
    <div className="flex items-center gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="text-center"
        >
          <div className={cn("text-lg font-semibold", stat.color || "text-white")}>
            {stat.value}
          </div>
          <div className="text-xs text-zinc-500">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  );
}
