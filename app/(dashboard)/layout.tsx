"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/logo";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  LayoutDashboard,
  Wallet,
  PieChart,
  Target,
  Settings,
  Menu,
  Search,
  LogOut,
  CreditCard,
  Receipt,
  DollarSign,
  Store,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Users,
  Building,
  TrendingUp,
  FileText,
  Briefcase,
  Check,
  Folder,
  User,
  Heart,
  Rocket,
  Plus,
  Sparkles,
} from "lucide-react";
import { NotificationDropdown } from "@/components/notification-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { MobileBottomNav } from "@/components/ui/mobile-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Finance Group types
interface FinanceGroup {
  id: string;
  name: string;
  type: string;
  currency: string;
  isDefault: boolean;
  totalMembers: number;
}

// Fetch finance groups
async function fetchFinanceGroups() {
  const res = await fetch("/api/finance-groups");
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

// Get icon for group type
const getGroupIcon = (type: string) => {
  switch (type) {
    case "personal": return User;
    case "family": return Heart;
    case "business": return Building;
    case "side_hustle": return Rocket;
    default: return Folder;
  }
};

// Get color for group type
const getGroupColor = (type: string) => {
  switch (type) {
    case "personal": return "text-blue-500";
    case "family": return "text-pink-500";
    case "business": return "text-emerald-500";
    case "side_hustle": return "text-purple-500";
    default: return "text-muted-foreground";
  }
};

// Navigation organized by categories
const navCategories = [
  {
    name: "Overview",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "AI Assistant", href: "/dashboard/ai", icon: Sparkles },
      { name: "Forecast", href: "/dashboard/forecast", icon: TrendingUp },
    ],
    defaultOpen: true,
  },
  {
    name: "Money Flow",
    icon: Wallet,
    items: [
      { name: "Transactions", href: "/dashboard/transactions", icon: Wallet },
      { name: "Income", href: "/dashboard/income", icon: DollarSign },
      { name: "Credit Cards", href: "/dashboard/credit-cards", icon: CreditCard },
      { name: "Vendors", href: "/dashboard/vendors", icon: Store },
    ],
    defaultOpen: true,
  },
  {
    name: "Planning",
    icon: Target,
    items: [
      { name: "Budgets", href: "/dashboard/budgets", icon: PieChart },
      { name: "Goals", href: "/dashboard/goals", icon: Target },
    ],
    defaultOpen: true,
  },
  {
    name: "Recurring",
    icon: CreditCard,
    items: [
      { name: "Subscriptions", href: "/dashboard/subscriptions", icon: CreditCard },
      { name: "Commitments", href: "/dashboard/commitments", icon: ClipboardList },
    ],
    defaultOpen: true,
  },
  {
    name: "Tax & Reports",
    icon: FileText,
    items: [
      { name: "Tax Management", href: "/dashboard/tax", icon: Receipt },
    ],
    defaultOpen: true,
  },
  {
    name: "Workspace",
    icon: Users,
    items: [
      { name: "Finance Groups", href: "/dashboard/groups", icon: Users },
    ],
    defaultOpen: true,
  },
  {
    name: "Account",
    icon: Settings,
    items: [
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
    defaultOpen: false,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, signOut, isLoading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Handle search submission
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/transactions?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [searchQuery, router]);

  // Fetch finance groups
  const { data: financeGroupsData } = useQuery<FinanceGroup[]>({
    queryKey: ["finance-groups"],
    queryFn: fetchFinanceGroups,
    enabled: isAuthenticated,
  });

  // Ensure financeGroups is always an array
  const financeGroups = Array.isArray(financeGroupsData) ? financeGroupsData : [];

  // Get active group (default or first)
  const activeGroup = financeGroups.length > 0 
    ? (financeGroups.find(g => g.id === activeGroupId) || 
       financeGroups.find(g => g.isDefault) || 
       financeGroups[0])
    : null;

  // Set initial active group
  useEffect(() => {
    if (financeGroups.length > 0 && !activeGroupId) {
      const defaultGroup = financeGroups.find(g => g.isDefault) || financeGroups[0];
      if (defaultGroup) {
        setActiveGroupId(defaultGroup.id);
      }
    }
  }, [financeGroups, activeGroupId]);

  // Get user initials
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading your dashboard..." variant="default" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex relative overflow-x-hidden max-w-[100vw]">
      {/* Grid Background Pattern */}
      <div className="fixed inset-0 pointer-events-none grid-pattern" />
      
      {/* Ambient Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/3 blur-[150px] rounded-full" />
      </div>
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar-background backdrop-blur-md fixed h-full z-30">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-border">
          <Logo href="/" size="sm" />
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navCategories.map((category) => {
            const hasActiveItem = category.items.some(
              (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            );
            
            // For single-item categories, render directly without accordion
            if (category.items.length === 1) {
              const item = category.items[0];
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "group-hover:text-primary")} />
                  {item.name}
                </Link>
              );
            }
            
            // For multi-item categories, use collapsible accordion
            return (
              <Collapsible
                key={category.name}
                defaultOpen={category.defaultOpen || hasActiveItem}
                className="space-y-1"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                  <div className="flex items-center gap-2">
                    <category.icon className="w-4 h-4" />
                    <span>{category.name}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pl-2">
                  {category.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "group-hover:text-primary")} />
                        {item.name}
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-3">
          {/* Finance Group Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full p-3 rounded-xl bg-muted/50 border border-border hover:bg-muted hover:border-primary/30 transition-all text-left group">
                {activeGroup ? (
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      activeGroup.type === "personal" && "bg-blue-500/20",
                      activeGroup.type === "family" && "bg-pink-500/20",
                      activeGroup.type === "business" && "bg-emerald-500/20",
                      activeGroup.type === "side_hustle" && "bg-purple-500/20",
                      !["personal", "family", "business", "side_hustle"].includes(activeGroup.type) && "bg-muted"
                    )}>
                      {React.createElement(getGroupIcon(activeGroup.type), {
                        className: cn("w-4 h-4", getGroupColor(activeGroup.type))
                      })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{activeGroup.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{activeGroup.type.replace("_", " ")}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Folder className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">No Workspace</p>
                      <p className="text-xs text-muted-foreground">Create one to start</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[220px]">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Switch Workspace
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {financeGroups.length > 0 ? (
                financeGroups.map((group: FinanceGroup) => {
                  const GroupIcon = getGroupIcon(group.type);
                  const isActive = activeGroup?.id === group.id;
                  return (
                    <DropdownMenuItem
                      key={group.id}
                      onClick={() => setActiveGroupId(group.id)}
                      className={cn("cursor-pointer", isActive && "bg-primary/10")}
                    >
                      <GroupIcon className={cn("w-4 h-4 mr-2", getGroupColor(group.type))} />
                      <span className="flex-1 truncate">{group.name}</span>
                      {isActive && <Check className="w-4 h-4 text-primary ml-2" />}
                      {group.isDefault && !isActive && (
                        <Badge variant="outline" className="text-[10px] ml-2">Default</Badge>
                      )}
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                  No workspaces found
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/groups" className="cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Manage Workspaces
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Logout Button */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between w-full max-w-[100vw] overflow-hidden">
          <div className="flex items-center gap-4 md:hidden">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Menu className="w-6 h-6" />
            </Button>
            <Logo href="/" variant="icon" size="sm" />
          </div>

          <form onSubmit={handleSearch} className="hidden md:flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions... (press Enter)" 
                className="w-full h-9 pl-10 pr-4 rounded-lg bg-muted/50 border border-border focus:outline-none focus:border-primary/50 focus:bg-muted text-sm transition-all placeholder:text-muted-foreground/70"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationDropdown />
            
            <div className="h-6 w-px bg-border mx-2" />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold leading-none">{user?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-primary/20">
                    {getInitials(user?.name)}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-red-500 focus:text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 z-10 overflow-x-hidden pb-mobile-nav w-full max-w-full">
          <div className="w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        onSignOut={signOut}
        userName={user?.email ?? user?.name ?? undefined}
      />
    </div>
  );
}
