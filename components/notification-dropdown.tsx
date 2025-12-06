"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  TrendingUp,
  Edit,
  Receipt,
  Store,
  PieChart,
  AlertTriangle,
  AlertCircle,
  Target,
  CheckCircle2,
  CreditCard,
  Clock,
  ClipboardList,
  FileText,
  Calendar,
  Users,
  Send,
  Mail,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  RefreshCw,
  Settings,
  User,
  Megaphone,
  Award,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp,
  Edit,
  Receipt,
  Store,
  Trash2,
  PieChart,
  AlertTriangle,
  AlertCircle,
  Target,
  CheckCircle2,
  CreditCard,
  Clock,
  Bell,
  ClipboardList,
  FileText,
  Calendar,
  Users,
  Send,
  Mail,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  RefreshCw,
  Settings,
  User,
  Megaphone,
  Award,
};

// Color mapping
const COLOR_MAP: Record<string, string> = {
  blue: "text-blue-500 bg-blue-500/10",
  amber: "text-amber-500 bg-amber-500/10",
  emerald: "text-emerald-500 bg-emerald-500/10",
  purple: "text-purple-500 bg-purple-500/10",
  cyan: "text-cyan-500 bg-cyan-500/10",
  orange: "text-orange-500 bg-orange-500/10",
  pink: "text-pink-500 bg-pink-500/10",
  gray: "text-gray-500 bg-gray-500/10",
  indigo: "text-indigo-500 bg-indigo-500/10",
  red: "text-red-500 bg-red-500/10",
};

// Priority colors
const PRIORITY_STYLES: Record<string, string> = {
  low: "",
  normal: "",
  high: "border-l-2 border-l-amber-500",
  urgent: "border-l-2 border-l-red-500 bg-red-500/5",
};

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  isRead: boolean;
  readAt: string | null;
  isDismissed: boolean;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  metadata: Record<string, unknown> | null;
  icon: string | null;
  color: string | null;
  createdAt: string;
}

interface NotificationResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

async function fetchNotifications(): Promise<NotificationResponse> {
  const res = await fetch("/api/notifications?limit=50");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function markAsRead(id: string) {
  const res = await fetch(`/api/notifications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isRead: true }),
  });
  if (!res.ok) throw new Error("Failed to mark as read");
  return res.json();
}

async function dismissNotification(id: string) {
  const res = await fetch(`/api/notifications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isDismissed: true }),
  });
  if (!res.ok) throw new Error("Failed to dismiss");
  return res.json();
}

async function markAllAsRead() {
  const res = await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "mark-all-read" }),
  });
  if (!res.ok) throw new Error("Failed to mark all as read");
  return res.json();
}

export function NotificationDropdown() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: dismissNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.data || [];
  const unreadCount = data?.unreadCount || 0;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
  };

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Bell;
    return ICON_MAP[iconName] || Bell;
  };

  const getColorClass = (color: string | null) => {
    if (!color) return COLOR_MAP.gray;
    return COLOR_MAP[color] || COLOR_MAP.gray;
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "just now";
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground relative hover:bg-white/5"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[380px] md:w-[420px] p-0 bg-card border-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-muted-foreground hover:text-foreground"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <CheckCheck className="w-3 h-3 mr-1" />
              )}
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs mt-1">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const IconComponent = getIcon(notification.icon);
                const colorClass = getColorClass(notification.color);
                const priorityClass = PRIORITY_STYLES[notification.priority] || "";

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative px-4 py-3 transition-colors hover:bg-muted/50",
                      !notification.isRead && "bg-primary/5",
                      priorityClass
                    )}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                          colorClass
                        )}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm font-medium leading-tight",
                              !notification.isRead && "text-foreground",
                              notification.isRead && "text-muted-foreground"
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(notification.createdAt)}
                          </span>
                          {notification.actionUrl && (
                            <Link
                              href={notification.actionUrl}
                              onClick={() => handleNotificationClick(notification)}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              {notification.actionLabel || "View"}
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              markReadMutation.mutate(notification.id);
                            }}
                            disabled={markReadMutation.isPending}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissMutation.mutate(notification.id);
                          }}
                          disabled={dismissMutation.isPending}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link href="/dashboard/settings#notifications">
                <Button
                  variant="ghost"
                  className="w-full justify-center text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Notification Settings
                </Button>
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationDropdown;
