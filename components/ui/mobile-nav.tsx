"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Wallet,
  Plus,
  Target,
  MoreHorizontal,
  X,
  PieChart,
  CreditCard,
  Receipt,
  Settings,
  Users,
  TrendingUp,
  DollarSign,
  Store,
  ClipboardList,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/logo";

// Bottom nav items - most used actions
const bottomNavItems = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Transactions", href: "/dashboard/transactions", icon: Wallet },
  { name: "Add", href: "#", icon: Plus, isAction: true },
  { name: "Goals", href: "/dashboard/goals", icon: Target },
  { name: "More", href: "#", icon: MoreHorizontal, isMore: true },
];

// Full navigation for "More" drawer
const fullNavItems = [
  { section: "Overview", items: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "AI Assistant", href: "/dashboard/ai", icon: Sparkles },
    { name: "Forecast", href: "/dashboard/forecast", icon: TrendingUp },
  ]},
  { section: "Money Flow", items: [
    { name: "Transactions", href: "/dashboard/transactions", icon: Wallet },
    { name: "Income", href: "/dashboard/income", icon: DollarSign },
    { name: "Credit Cards", href: "/dashboard/credit-cards", icon: CreditCard },
    { name: "Vendors", href: "/dashboard/vendors", icon: Store },
  ]},
  { section: "Planning", items: [
    { name: "Budgets", href: "/dashboard/budgets", icon: PieChart },
    { name: "Goals", href: "/dashboard/goals", icon: Target },
  ]},
  { section: "Recurring", items: [
    { name: "Subscriptions", href: "/dashboard/subscriptions", icon: CreditCard },
    { name: "Commitments", href: "/dashboard/commitments", icon: ClipboardList },
  ]},
  { section: "Tax & Reports", items: [
    { name: "Tax Management", href: "/dashboard/tax", icon: Receipt },
  ]},
  { section: "Workspace", items: [
    { name: "Finance Groups", href: "/dashboard/groups", icon: Users },
  ]},
  { section: "Account", items: [
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ]},
];

interface MobileNavProps {
  onAddClick?: () => void;
  onSignOut?: () => void;
  userName?: string;
}

export function MobileBottomNav({ onAddClick, onSignOut, userName }: MobileNavProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setIsMoreOpen(false);
    setIsAddMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isMoreOpen || isAddMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMoreOpen, isAddMenuOpen]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {bottomNavItems.map((item) => {
            if (item.isAction) {
              // Central Add Button
              return (
                <button
                  key={item.name}
                  onClick={() => setIsAddMenuOpen(true)}
                  className="relative -mt-6 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform"
                >
                  <Plus className="w-7 h-7" />
                </button>
              );
            }

            if (item.isMore) {
              // More Button
              return (
                <button
                  key={item.name}
                  onClick={() => setIsMoreOpen(true)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-colors min-w-[60px]",
                    isMoreOpen ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="w-6 h-6" />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </button>
              );
            }

            // Regular Nav Item
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-colors min-w-[60px]",
                  active ? "text-primary" : "text-muted-foreground active:text-foreground"
                )}
              >
                <item.icon className={cn("w-6 h-6", active && "scale-110")} />
                <span className="text-[10px] font-medium">{item.name}</span>
                {active && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute bottom-1 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Add Menu Overlay */}
      <AnimatePresence>
        {isAddMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setIsAddMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="md:hidden fixed bottom-20 left-4 right-4 z-[70] bg-card/95 backdrop-blur-xl rounded-3xl border border-border p-4 shadow-2xl safe-area-bottom"
            >
              <h3 className="text-lg font-semibold mb-4 text-center">Quick Add</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: "Transaction", href: "/dashboard/transactions?add=true", icon: Wallet, color: "bg-blue-500/10 text-blue-500" },
                  { name: "Goal", href: "/dashboard/goals?add=true", icon: Target, color: "bg-emerald-500/10 text-emerald-500" },
                  { name: "Budget", href: "/dashboard/budgets?add=true", icon: PieChart, color: "bg-violet-500/10 text-violet-500" },
                  { name: "Subscription", href: "/dashboard/subscriptions?add=true", icon: CreditCard, color: "bg-orange-500/10 text-orange-500" },
                  { name: "Income", href: "/dashboard/income?add=true", icon: DollarSign, color: "bg-teal-500/10 text-teal-500" },
                  { name: "Tax Relief", href: "/dashboard/tax?add=true", icon: Receipt, color: "bg-indigo-500/10 text-indigo-500" },
                ].map((action) => (
                  <Link
                    key={action.name}
                    href={action.href}
                    onClick={() => setIsAddMenuOpen(false)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/50 hover:bg-muted active:scale-95 transition-all"
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", action.color)}>
                      <action.icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium text-center">{action.name}</span>
                  </Link>
                ))}
              </div>
              <button
                onClick={() => setIsAddMenuOpen(false)}
                className="w-full mt-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* More Menu Drawer */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setIsMoreOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="md:hidden fixed top-0 right-0 bottom-0 w-[85%] max-w-[320px] z-[70] bg-background border-l border-border flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border safe-area-top">
                <Logo href="/" size="sm" />
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {fullNavItems.map((section) => (
                  <div key={section.section}>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">
                      {section.section}
                    </h4>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMoreOpen(false)}
                            className={cn(
                              "flex items-center justify-between px-4 py-3 rounded-xl transition-all active:scale-[0.98]",
                              active
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted active:bg-muted"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="w-5 h-5" />
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <ChevronRight className={cn("w-4 h-4 text-muted-foreground", active && "text-primary")} />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border space-y-3 safe-area-bottom">
                {userName && (
                  <div className="px-4 py-3 rounded-xl bg-muted/50">
                    <p className="text-sm font-medium">Signed in as</p>
                    <p className="text-xs text-muted-foreground truncate">{userName}</p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    onSignOut?.();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
