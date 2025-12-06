"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Wifi, Star } from "lucide-react";

// ============================================
// PREMIUM CARD DESIGN PRESETS
// Inspired by Apple Card, Stripe, Mercury, Revolut
// ============================================

const CARD_COLORS: Record<string, { 
  bg: string; 
  accent: string; 
  text: string;
  overlay?: string;
  chipStyle: "silver" | "gold" | "black" | "rose";
}> = {
  // Premium Minimalist Collection
  "midnight": {
    bg: "linear-gradient(165deg, #0a0a0a 0%, #171717 50%, #262626 100%)",
    accent: "#ffffff",
    text: "white",
    chipStyle: "silver",
  },
  "obsidian": {
    bg: "linear-gradient(135deg, #000000 0%, #0a0a0a 100%)",
    accent: "#a3a3a3",
    text: "white",
    chipStyle: "black",
  },
  "titanium": {
    bg: "linear-gradient(145deg, #e5e5e5 0%, #d4d4d4 50%, #a3a3a3 100%)",
    accent: "#171717",
    text: "#171717",
    chipStyle: "gold",
  },
  
  // Ocean & Sky Collection
  "arctic": {
    bg: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)",
    accent: "#e0f2fe",
    text: "white",
    chipStyle: "silver",
  },
  "ocean-depth": {
    bg: "linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #0ea5e9 100%)",
    accent: "#7dd3fc",
    text: "white",
    chipStyle: "silver",
  },
  "deep-sea": {
    bg: "linear-gradient(145deg, #042f2e 0%, #0d9488 100%)",
    accent: "#5eead4",
    text: "white",
    chipStyle: "silver",
  },
  
  // Aurora & Gradient Collection
  "aurora": {
    bg: "linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4f46e5 50%, #7c3aed 75%, #a855f7 100%)",
    accent: "#c4b5fd",
    text: "white",
    overlay: "radial-gradient(ellipse at 30% 20%, rgba(167, 139, 250, 0.3) 0%, transparent 50%)",
    chipStyle: "silver",
  },
  "sunset": {
    bg: "linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #fb923c 100%)",
    accent: "#ffedd5",
    text: "white",
    chipStyle: "gold",
  },
  "rose-gold": {
    bg: "linear-gradient(145deg, #1c1917 0%, #44403c 50%, #78716c 100%)",
    accent: "#fecdd3",
    text: "white",
    overlay: "linear-gradient(135deg, rgba(251, 113, 133, 0.1) 0%, transparent 50%)",
    chipStyle: "rose",
  },
  
  // Nature Collection
  "emerald": {
    bg: "linear-gradient(145deg, #022c22 0%, #065f46 50%, #10b981 100%)",
    accent: "#a7f3d0",
    text: "white",
    chipStyle: "gold",
  },
  "forest": {
    bg: "linear-gradient(160deg, #14532d 0%, #166534 100%)",
    accent: "#86efac",
    text: "white",
    chipStyle: "silver",
  },
  
  // Premium Dark Collection
  "carbon": {
    bg: "linear-gradient(145deg, #18181b 0%, #27272a 50%, #3f3f46 100%)",
    accent: "#71717a",
    text: "white",
    overlay: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)",
    chipStyle: "black",
  },
  "slate": {
    bg: "linear-gradient(165deg, #1e293b 0%, #334155 50%, #475569 100%)",
    accent: "#94a3b8",
    text: "white",
    chipStyle: "silver",
  },
  
  // Vibrant Collection
  "electric-violet": {
    bg: "linear-gradient(135deg, #2e1065 0%, #5b21b6 50%, #7c3aed 100%)",
    accent: "#ddd6fe",
    text: "white",
    chipStyle: "silver",
  },
  "cyber-pink": {
    bg: "linear-gradient(145deg, #500724 0%, #9d174d 50%, #ec4899 100%)",
    accent: "#fce7f3",
    text: "white",
    chipStyle: "rose",
  },
  "neon-mint": {
    bg: "linear-gradient(135deg, #052e16 0%, #15803d 100%)",
    accent: "#4ade80",
    text: "white",
    overlay: "radial-gradient(ellipse at 80% 20%, rgba(74, 222, 128, 0.15) 0%, transparent 50%)",
    chipStyle: "silver",
  },
  
  // Luxury Metal Collection
  "gunmetal": {
    bg: "linear-gradient(160deg, #1f2937 0%, #374151 40%, #4b5563 70%, #6b7280 100%)",
    accent: "#9ca3af",
    text: "white",
    overlay: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 50%)",
    chipStyle: "silver",
  },
  "bronze": {
    bg: "linear-gradient(145deg, #292524 0%, #57534e 50%, #78716c 100%)",
    accent: "#d6d3d1",
    text: "white",
    overlay: "linear-gradient(135deg, rgba(214, 211, 209, 0.1) 0%, transparent 50%)",
    chipStyle: "gold",
  },
  
  // Cosmic Collection
  "nebula": {
    bg: "linear-gradient(135deg, #0c0a09 0%, #1c1917 20%, #292524 40%, #431407 70%, #7c2d12 100%)",
    accent: "#fbbf24",
    text: "white",
    overlay: "radial-gradient(ellipse at 70% 30%, rgba(251, 191, 36, 0.1) 0%, transparent 40%)",
    chipStyle: "gold",
  },
  "cosmos": {
    bg: "linear-gradient(160deg, #020617 0%, #0f172a 30%, #1e1b4b 60%, #312e81 100%)",
    accent: "#818cf8",
    text: "white",
    overlay: "radial-gradient(ellipse at 20% 80%, rgba(129, 140, 248, 0.15) 0%, transparent 50%)",
    chipStyle: "silver",
  },
  
  // Minimal Clean Collection
  "snow": {
    bg: "linear-gradient(165deg, #fafafa 0%, #f4f4f5 50%, #e4e4e7 100%)",
    accent: "#18181b",
    text: "#18181b",
    chipStyle: "silver",
  },
  "pearl": {
    bg: "linear-gradient(145deg, #fdf4ff 0%, #fae8ff 50%, #f5d0fe 100%)",
    accent: "#701a75",
    text: "#701a75",
    chipStyle: "rose",
  },
};

// ============================================
// CARD NETWORK LOGOS (Typography-Based)
// Styled to match official brand fonts
// ============================================

// Visa: Futura Bold Italic style - geometric, italic, bold
// Mastercard: FF Mark style - geometric, lowercase, medium weight
// American Express: Optima/custom - condensed, all caps

interface CardLogoProps {
  textColor?: string;
}

const VisaLogo = ({ textColor = "currentColor" }: CardLogoProps) => (
  <span
    className="font-black italic tracking-tight"
    style={{
      fontFamily: "'Poppins', 'Montserrat', 'Arial Black', sans-serif",
      fontSize: "28px",
      letterSpacing: "-0.02em",
      color: textColor,
      textShadow: "0 1px 2px rgba(0,0,0,0.2)",
    }}
  >
    VISA
  </span>
);

const MastercardLogo = ({ textColor = "currentColor" }: CardLogoProps) => (
  <div className="flex items-center gap-1">
    {/* Overlapping circles */}
    <div className="flex -space-x-2">
      <div className="w-6 h-6 rounded-full bg-[#EB001B]" />
      <div className="w-6 h-6 rounded-full bg-[#F79E1B] mix-blend-multiply" />
    </div>
    <span
      className="font-medium tracking-wide"
      style={{
        fontFamily: "'Inter', 'SF Pro Display', 'Helvetica Neue', sans-serif",
        fontSize: "14px",
        letterSpacing: "0.02em",
        color: textColor,
      }}
    >
      mastercard
    </span>
  </div>
);

const AmexLogo = ({ textColor = "currentColor" }: CardLogoProps) => (
  <div className="flex flex-col items-end leading-none">
    <span
      className="font-bold tracking-tight"
      style={{
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        fontSize: "10px",
        letterSpacing: "0.05em",
        color: textColor,
        opacity: 0.8,
      }}
    >
      AMERICAN
    </span>
    <span
      className="font-bold tracking-tight"
      style={{
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        fontSize: "14px",
        letterSpacing: "0.08em",
        color: textColor,
      }}
    >
      EXPRESS
    </span>
  </div>
);

const UnionPayLogo = ({ textColor = "currentColor" }: CardLogoProps) => (
  <div 
    className="px-2 py-1 rounded"
    style={{ 
      background: "linear-gradient(135deg, #e21836 0%, #00447c 50%, #007b84 100%)",
    }}
  >
    <span
      className="font-bold tracking-wide"
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: "12px",
        color: "white",
      }}
    >
      UnionPay
    </span>
  </div>
);

const JCBLogo = ({ textColor = "currentColor" }: CardLogoProps) => (
  <div 
    className="px-3 py-1 rounded-md"
    style={{ 
      background: "linear-gradient(135deg, #0E4C96 0%, #E5001A 50%, #007940 100%)",
    }}
  >
    <span
      className="font-black tracking-wider"
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: "16px",
        color: "white",
      }}
    >
      JCB
    </span>
  </div>
);

const DinersLogo = ({ textColor = "currentColor" }: CardLogoProps) => (
  <div className="flex flex-col items-end leading-none">
    <span
      className="font-semibold tracking-wide"
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: "10px",
        letterSpacing: "0.05em",
        color: textColor,
        opacity: 0.7,
      }}
    >
      DINERS
    </span>
    <span
      className="font-bold tracking-wide"
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: "12px",
        letterSpacing: "0.03em",
        color: textColor,
      }}
    >
      CLUB
    </span>
  </div>
);

// Logo component factory
const createCardLogo = (cardType: string, textColor?: string): React.ReactNode => {
  switch (cardType) {
    case "Visa":
      return <VisaLogo textColor={textColor} />;
    case "Mastercard":
      return <MastercardLogo textColor={textColor} />;
    case "American Express":
      return <AmexLogo textColor={textColor} />;
    case "UnionPay":
      return <UnionPayLogo textColor={textColor} />;
    case "JCB":
      return <JCBLogo textColor={textColor} />;
    case "Diners Club":
      return <DinersLogo textColor={textColor} />;
    default:
      return <VisaLogo textColor={textColor} />;
  }
};

// ============================================
// CHIP STYLES
// ============================================

const ChipStyles: Record<string, { bg: string; border: string; inner: string }> = {
  silver: {
    bg: "linear-gradient(145deg, #e2e8f0 0%, #cbd5e1 30%, #94a3b8 70%, #64748b 100%)",
    border: "rgba(148, 163, 184, 0.5)",
    inner: "rgba(71, 85, 105, 0.3)",
  },
  gold: {
    bg: "linear-gradient(145deg, #fef3c7 0%, #fcd34d 30%, #f59e0b 70%, #d97706 100%)",
    border: "rgba(217, 119, 6, 0.5)",
    inner: "rgba(180, 83, 9, 0.3)",
  },
  black: {
    bg: "linear-gradient(145deg, #52525b 0%, #3f3f46 30%, #27272a 70%, #18181b 100%)",
    border: "rgba(63, 63, 70, 0.5)",
    inner: "rgba(39, 39, 42, 0.5)",
  },
  rose: {
    bg: "linear-gradient(145deg, #fecdd3 0%, #fda4af 30%, #fb7185 70%, #f43f5e 100%)",
    border: "rgba(244, 63, 94, 0.5)",
    inner: "rgba(225, 29, 72, 0.3)",
  },
};

interface CreditCard3DProps {
  bankName: string;
  cardType: string;
  cardName: string;
  cardColor?: string;
  lastFourDigits?: string | null;
  isPrimary?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  showDetails?: boolean;
}

export function CreditCard3D({
  bankName,
  cardType,
  cardName,
  cardColor = "midnight",
  lastFourDigits,
  isPrimary = false,
  className,
  size = "md",
  onClick,
  showDetails = true,
}: CreditCard3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for 3D tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth spring animations for natural feel
  const rotateX = useSpring(useTransform(y, [-100, 100], [12, -12]), {
    stiffness: 400,
    damping: 35,
  });
  const rotateY = useSpring(useTransform(x, [-100, 100], [-12, 12]), {
    stiffness: 400,
    damping: 35,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  const colors = CARD_COLORS[cardColor] || CARD_COLORS["midnight"];
  const chipStyle = ChipStyles[colors.chipStyle || "silver"];

  const sizeClasses = {
    sm: "w-[320px] h-[200px]",
    md: "w-[380px] h-[240px]",
    lg: "w-[440px] h-[280px]",
  };

  const fontSizes = {
    sm: { bank: "text-[9px]", number: "text-base", name: "text-xs", label: "text-[8px]" },
    md: { bank: "text-[10px]", number: "text-lg", name: "text-sm", label: "text-[9px]" },
    lg: { bank: "text-xs", number: "text-xl", name: "text-base", label: "text-[10px]" },
  };

  const fonts = fontSizes[size];

  return (
    <div
      ref={ref}
      className={cn("perspective-[1200px]", className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <motion.div
        className={cn(
          sizeClasses[size],
          "relative rounded-2xl overflow-hidden cursor-pointer select-none",
          "transition-all duration-500 ease-out"
        )}
        style={{
          background: colors.bg,
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          boxShadow: isHovered
            ? `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)`
            : `0 10px 30px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03)`,
        }}
        animate={{
          scale: isHovered ? 1.02 : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Custom Overlay Pattern */}
        {colors.overlay && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: colors.overlay }}
          />
        )}

        {/* Ambient Light Reflection */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(
              ellipse 80% 50% at ${isHovered ? '30%' : '50%'} ${isHovered ? '20%' : '0%'},
              rgba(255, 255, 255, 0.12) 0%,
              transparent 60%
            )`,
            transition: "all 0.5s ease-out",
          }}
        />

        {/* Card Content */}
        <div className="relative h-full p-6 flex flex-col justify-between z-10">
          {/* Top Row - Bank Name & Contactless */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span
                className={cn(fonts.bank, "font-semibold uppercase tracking-[0.25em]")}
                style={{ color: colors.text, opacity: 0.8 }}
              >
                {bankName}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {isPrimary && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${colors.accent}20, ${colors.accent}10)`,
                    border: `1px solid ${colors.accent}30`,
                  }}
                >
                  <Star className="w-3 h-3" style={{ color: colors.accent, fill: colors.accent }} />
                  <span className="text-[9px] font-bold tracking-wider" style={{ color: colors.accent }}>
                    PRIMARY
                  </span>
                </motion.div>
              )}
              
              {/* Contactless Icon */}
              <div className="relative">
                <Wifi
                  className="w-7 h-7 rotate-90"
                  style={{ color: colors.text, opacity: 0.7 }}
                  strokeWidth={2}
                />
              </div>
            </div>
          </div>

          {/* Middle Section - Chip & Card Number */}
          <div className="flex flex-col gap-5">
            {/* Premium EMV Chip */}
            <div
              className="w-14 h-11 rounded-lg relative overflow-hidden"
              style={{
                background: chipStyle.bg,
                boxShadow: `
                  inset 0 1px 2px rgba(255,255,255,0.4),
                  inset 0 -1px 2px rgba(0,0,0,0.2),
                  0 2px 4px rgba(0,0,0,0.2)
                `,
                border: `1px solid ${chipStyle.border}`,
              }}
            >
              {/* Chip Pattern */}
              <div className="absolute inset-1 grid grid-cols-2 grid-rows-2 gap-[2px]">
                <div className="rounded-tl-sm" style={{ borderRight: `1px solid ${chipStyle.inner}`, borderBottom: `1px solid ${chipStyle.inner}` }} />
                <div className="rounded-tr-sm" style={{ borderBottom: `1px solid ${chipStyle.inner}` }} />
                <div className="rounded-bl-sm" style={{ borderRight: `1px solid ${chipStyle.inner}` }} />
                <div className="rounded-br-sm" />
              </div>
              {/* Chip Shine */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent" />
            </div>

            {/* Card Number */}
            {showDetails && (
              <div className="flex items-center gap-5">
                <span
                  className={cn(fonts.number, "font-mono tracking-[0.2em] opacity-60")}
                  style={{ color: colors.text }}
                >
                  ••••
                </span>
                <span
                  className={cn(fonts.number, "font-mono tracking-[0.2em] opacity-60")}
                  style={{ color: colors.text }}
                >
                  ••••
                </span>
                <span
                  className={cn(fonts.number, "font-mono tracking-[0.2em] opacity-60")}
                  style={{ color: colors.text }}
                >
                  ••••
                </span>
                <span
                  className={cn(fonts.number, "font-mono tracking-[0.15em] font-bold")}
                  style={{ color: colors.text }}
                >
                  {lastFourDigits || "••••"}
                </span>
              </div>
            )}
          </div>

          {/* Bottom Row - Cardholder Name & Logo */}
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span
                className={cn(fonts.label, "uppercase tracking-[0.15em] block")}
                style={{ color: colors.text, opacity: 0.5 }}
              >
                Cardholder
              </span>
              <span
                className={cn(fonts.name, "font-semibold uppercase tracking-[0.12em] block max-w-[200px] truncate")}
                style={{ color: colors.text }}
              >
                {cardName}
              </span>
            </div>

            {/* Card Network Logo */}
            <motion.div
              className="h-12 flex items-center"
              animate={{ scale: isHovered ? 1.05 : 1 }}
              transition={{ duration: 0.2 }}
            >
              {createCardLogo(cardType, colors.text)}
            </motion.div>
          </div>
        </div>

        {/* Subtle Edge Highlight */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.1)",
          }}
        />
      </motion.div>
    </div>
  );
}

// ============================================
// CREDIT CARD MINI - For Dropdown/Lists
// ============================================

export function CreditCardMini({
  bankName,
  cardType,
  cardName,
  cardColor = "midnight",
  lastFourDigits,
  className,
}: {
  bankName: string;
  cardType: string;
  cardName: string;
  cardColor?: string;
  lastFourDigits?: string | null;
  className?: string;
}) {
  const colors = CARD_COLORS[cardColor] || CARD_COLORS["midnight"];
  const chipStyle = ChipStyles[colors.chipStyle || "silver"];

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 rounded-xl transition-all duration-200 hover:scale-[1.02] group cursor-pointer",
        className
      )}
      style={{ 
        background: colors.bg,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {/* Mini Chip */}
      <div 
        className="w-9 h-7 rounded-md shrink-0 relative overflow-hidden"
        style={{
          background: chipStyle.bg,
          border: `1px solid ${chipStyle.border}`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: colors.text }}>
          {cardName}
        </p>
        <p className="text-xs truncate" style={{ color: colors.text, opacity: 0.6 }}>
          {bankName} {lastFourDigits && `•••• ${lastFourDigits}`}
        </p>
      </div>

      <div className="shrink-0 h-6 flex items-center opacity-80 group-hover:opacity-100 transition-opacity scale-75">
        {createCardLogo(cardType, colors.text)}
      </div>
    </div>
  );
}

// ============================================
// CARD COLOR PICKER PREVIEW
// ============================================

export function CardColorPreview({ colorKey, isSelected }: { colorKey: string; isSelected: boolean }) {
  const colors = CARD_COLORS[colorKey];
  if (!colors) return null;

  return (
    <div
      className={cn(
        "w-10 h-7 rounded-lg cursor-pointer transition-all duration-200 relative overflow-hidden",
        isSelected 
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" 
          : "hover:scale-105 hover:ring-1 hover:ring-white/20"
      )}
      style={{ 
        background: colors.bg,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      {colors.overlay && (
        <div className="absolute inset-0" style={{ background: colors.overlay }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
    </div>
  );
}

// Get all available card color keys
export const CARD_COLOR_OPTIONS = Object.keys(CARD_COLORS);

// Export card colors for use in forms
export { CARD_COLORS };
