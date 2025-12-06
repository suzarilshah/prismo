import React from "react";
import {
  Car, HeartHandshake, CreditCard, Utensils, PiggyBank, GraduationCap,
  Zap, Film, ShoppingCart, Building, Wifi, ShieldCheck, Heart,
  MoreHorizontal, Fuel, Smartphone, Home, ShoppingBag, Repeat, ArrowRightLeft,
  Droplet, Briefcase, Laptop, TrendingUp, Wallet, Tag, Receipt, Coins, 
  Building2, Package, CircleDollarSign
} from "lucide-react";

// Map icon names to Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  car: Car,
  "heart-handshake": HeartHandshake,
  "credit-card": CreditCard,
  utensils: Utensils,
  "piggy-bank": PiggyBank,
  "graduation-cap": GraduationCap,
  zap: Zap,
  film: Film,
  "shopping-cart": ShoppingCart,
  building: Building,
  wifi: Wifi,
  "shield-check": ShieldCheck,
  heart: Heart,
  "more-horizontal": MoreHorizontal,
  fuel: Fuel,
  smartphone: Smartphone,
  home: Home,
  "shopping-bag": ShoppingBag,
  repeat: Repeat,
  "arrow-right-left": ArrowRightLeft,
  droplet: Droplet,
  briefcase: Briefcase,
  laptop: Laptop,
  "trending-up": TrendingUp,
  wallet: Wallet,
  tag: Tag,
  receipt: Receipt,
  coins: Coins,
  building2: Building2,
  package: Package,
  "circle-dollar-sign": CircleDollarSign,
};

// Map emoji icons to components (fallback for emoji-based icons)
const EMOJI_MAP: Record<string, string> = {
  "💼": "briefcase",
  "💻": "laptop",
  "📈": "trending-up",
  "💰": "wallet",
  "🏥": "heart",
  "🎓": "graduation-cap",
  "💊": "heart",
  "👨‍👩‍👧‍👦": "heart-handshake",
  "📚": "graduation-cap",
  "🎯": "tag",
  "🏦": "building",
};

interface CategoryIconProps {
  icon: string | null | undefined;
  className?: string;
  fallback?: React.ReactNode;
}

export function CategoryIcon({ icon, className = "w-4 h-4", fallback }: CategoryIconProps) {
  if (!icon) {
    return fallback ? <>{fallback}</> : <Tag className={className} />;
  }

  // Check if it's an emoji (emoji starts with a high Unicode point)
  const isEmoji = /\p{Emoji}/u.test(icon);
  
  if (isEmoji) {
    // Convert emoji to icon name if possible
    const iconName = EMOJI_MAP[icon];
    if (iconName && ICON_MAP[iconName]) {
      const IconComponent = ICON_MAP[iconName];
      return <IconComponent className={className} />;
    }
    // Render emoji directly
    return <span className="text-base leading-none">{icon}</span>;
  }

  // It's a lucide icon name
  const normalizedIcon = icon.toLowerCase().replace(/_/g, "-");
  const IconComponent = ICON_MAP[normalizedIcon];
  
  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // Fallback to Tag icon
  return fallback ? <>{fallback}</> : <Tag className={className} />;
}

export function getCategoryIconName(icon: string | null | undefined): string {
  if (!icon) return "tag";
  
  const isEmoji = /\p{Emoji}/u.test(icon);
  if (isEmoji) {
    return EMOJI_MAP[icon] || "tag";
  }
  
  return icon.toLowerCase().replace(/_/g, "-");
}

export default CategoryIcon;
