"use client";

import { cn } from "@/lib/utils";
import { motion, useSpring, useTransform, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface AnimatedProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  color?: "default" | "success" | "warning" | "danger" | "gradient";
  showLabel?: boolean;
  label?: string;
  animate?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4"
};

const colorClasses = {
  default: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  gradient: "bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500"
};

export function AnimatedProgress({
  value,
  max = 100,
  size = "md",
  color = "default",
  showLabel = false,
  label,
  animate = true,
  className
}: AnimatedProgressProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayPercent, setDisplayPercent] = useState(0);
  
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  // Determine color based on percentage if using status colors
  const getStatusColor = () => {
    if (color !== "default") return color;
    if (percentage >= 100) return "danger";
    if (percentage >= 80) return "warning";
    return "default";
  };

  // Animate the percentage display
  useEffect(() => {
    if (!animate || !isInView) return;
    
    const duration = 1500;
    const steps = 60;
    const increment = percentage / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= percentage) {
        setDisplayPercent(percentage);
        clearInterval(timer);
      } else {
        setDisplayPercent(current);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [percentage, animate, isInView]);

  return (
    <div ref={ref} className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-zinc-400">{label || "Progress"}</span>
          <span className="text-sm font-medium text-white">
            {animate ? Math.round(displayPercent) : Math.round(percentage)}%
          </span>
        </div>
      )}
      
      <div className={cn(
        "w-full bg-zinc-800 rounded-full overflow-hidden",
        sizeClasses[size]
      )}>
        <motion.div
          className={cn(
            "h-full rounded-full relative overflow-hidden",
            colorClasses[getStatusColor()]
          )}
          initial={{ width: 0 }}
          animate={{ width: isInView ? `${percentage}%` : 0 }}
          transition={{ 
            duration: animate ? 1.5 : 0, 
            ease: [0.22, 1, 0.36, 1] 
          }}
        >
          {/* Shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: isInView ? "200%" : "-100%" }}
            transition={{ 
              duration: 1.5, 
              delay: 0.5,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

// Circular progress component
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showValue?: boolean;
  label?: string;
  animate?: boolean;
  className?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color = "#3b82f6",
  showValue = true,
  label,
  animate = true,
  className
}: CircularProgressProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayValue, setDisplayValue] = useState(0);
  
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  // Animate the value display
  useEffect(() => {
    if (!animate || !isInView) return;
    
    const duration = 1500;
    const steps = 60;
    const increment = percentage / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= percentage) {
        setDisplayValue(percentage);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [percentage, animate, isInView]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-zinc-800"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: isInView ? offset : circumference }}
          transition={{ 
            duration: animate ? 1.5 : 0, 
            ease: [0.22, 1, 0.36, 1] 
          }}
        />
      </svg>
      
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            className="text-2xl font-bold text-white"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: isInView ? 1 : 0, scale: isInView ? 1 : 0.5 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            {Math.round(animate ? displayValue : percentage)}%
          </motion.span>
          {label && (
            <span className="text-xs text-zinc-500">{label}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Goal Progress component with milestone markers
interface GoalProgressProps {
  current: number;
  target: number;
  milestones?: number[];
  label?: string;
  currency?: string;
  className?: string;
}

export function GoalProgress({
  current,
  target,
  milestones = [25, 50, 75, 100],
  label,
  currency = "RM",
  className
}: GoalProgressProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div ref={ref} className={cn("w-full", className)}>
      {label && (
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-white">{label}</span>
          <span className="text-sm text-zinc-400">
            {currency} {current.toLocaleString()} / {currency} {target.toLocaleString()}
          </span>
        </div>
      )}
      
      <div className="relative">
        {/* Progress bar */}
        <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full relative"
            initial={{ width: 0 }}
            animate={{ width: isInView ? `${percentage}%` : 0 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg shadow-blue-500/50"
              initial={{ scale: 0 }}
              animate={{ scale: isInView ? 1 : 0 }}
              transition={{ delay: 1.5, duration: 0.3, type: "spring" }}
            />
          </motion.div>
        </div>
        
        {/* Milestone markers */}
        <div className="absolute top-0 left-0 right-0 h-3 pointer-events-none">
          {milestones.map((milestone) => (
            <div
              key={milestone}
              className="absolute top-0 bottom-0 w-px bg-zinc-600"
              style={{ left: `${milestone}%` }}
            />
          ))}
        </div>
        
        {/* Milestone labels */}
        <div className="flex justify-between mt-2">
          <span className="text-xs text-zinc-500">0%</span>
          {milestones.filter(m => m !== 100).map((milestone) => (
            <span 
              key={milestone} 
              className={cn(
                "text-xs",
                percentage >= milestone ? "text-blue-400" : "text-zinc-500"
              )}
            >
              {milestone}%
            </span>
          ))}
          <span className={cn(
            "text-xs",
            percentage >= 100 ? "text-emerald-400" : "text-zinc-500"
          )}>
            100%
          </span>
        </div>
      </div>
    </div>
  );
}
