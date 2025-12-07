"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Globe, Bell, Shield, Palette, Database, Loader2, Brain, Sparkles, Sun, Moon, Monitor, Check } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { AISettingsForm } from "@/components/ai/AISettingsForm";
import { cn } from "@/lib/utils";

interface UserSettings {
  id?: string;
  currency: string;
  language: string;
  timezone: string;
  dateFormat: string;
  notifications: boolean;
  emailNotifications: boolean;
  theme: string;
}

async function fetchUserSettings() {
  const res = await fetch("/api/user-settings");
  if (!res.ok) {
    return {
      currency: "MYR",
      language: "en",
      timezone: "Asia/Kuala_Lumpur",
      dateFormat: "DD/MM/YYYY",
      notifications: true,
      emailNotifications: true,
      theme: "system",
    };
  }
  return (await res.json()).data;
}

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const { theme: currentTheme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const [settings, setSettings] = useState<UserSettings>({
    currency: "MYR",
    language: "en",
    timezone: "Asia/Kuala_Lumpur",
    dateFormat: "DD/MM/YYYY",
    notifications: true,
    emailNotifications: true,
    theme: "system",
  });

  const { data: userSettings, isLoading } = useQuery({
    queryKey: ["user-settings"],
    queryFn: fetchUserSettings,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (userSettings) {
      setSettings(userSettings);
    }
  }, [userSettings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSave = async () => {
    try {
      if (!user?.id) {
        toast.error("User not found", {
          description: "Please refresh the page and try again.",
        });
        return;
      }

      const res = await fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          userId: user.id,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save settings");
      }

      // Apply theme immediately
      if (settings.theme !== currentTheme) {
        setTheme(settings.theme);
      }

      toast.success("Settings Saved", {
        description: "Your preferences have been updated.",
      });
    } catch (error) {
      toast.error("Failed to save settings", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up max-w-4xl">
      <div>
        <h1 className="font-display font-semibold text-3xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account preferences and settings</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <div className="w-full overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="bg-muted/50 p-1 w-full md:w-auto inline-flex h-auto">
            <TabsTrigger value="general" className="data-[state=active]:bg-background flex-1 md:flex-none">
              <User className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-background flex-1 md:flex-none">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-background flex-1 md:flex-none">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-background relative flex-1 md:flex-none">
              <Brain className="w-4 h-4 mr-2" />
              AI
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                BETA
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          {/* Profile Settings */}
          <Card className="data-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Profile Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    defaultValue={user?.name || "Ahmad Rashid"}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user?.email || "demo@prismofinance.com"}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  defaultValue="+60 12-345 6789"
                  placeholder="+60 XX-XXX XXXX"
                />
              </div>
            </CardContent>
          </Card>

          {/* Regional Settings */}
          <Card className="data-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Regional Preferences</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(value) => setSettings({ ...settings, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) => setSettings({ ...settings, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ms">Bahasa Malaysia</SelectItem>
                      <SelectItem value="zh">中文 (Chinese)</SelectItem>
                      <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kuala_Lumpur">Kuala Lumpur (GMT+8)</SelectItem>
                      <SelectItem value="Asia/Singapore">Singapore (GMT+8)</SelectItem>
                      <SelectItem value="Asia/Bangkok">Bangkok (GMT+7)</SelectItem>
                      <SelectItem value="Asia/Jakarta">Jakarta (GMT+7)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={settings.dateFormat}
                    onValueChange={(value) => setSettings({ ...settings, dateFormat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card className="data-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Appearance</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Customize how Prismo looks on your device
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Theme</Label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Light Mode Option */}
                  <button
                    onClick={() => {
                      setTheme("light");
                      setSettings({ ...settings, theme: "light" });
                    }}
                    className={cn(
                      "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                      "hover:border-primary/50 hover:bg-accent/50",
                      mounted && currentTheme === "light"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-border bg-white">
                      {/* Light mode preview */}
                      <div className="absolute inset-0 p-2">
                        <div className="h-2 w-8 bg-gray-200 rounded mb-1.5" />
                        <div className="h-1.5 w-12 bg-gray-100 rounded mb-2" />
                        <div className="flex gap-1">
                          <div className="h-6 w-6 bg-gray-100 rounded" />
                          <div className="h-6 flex-1 bg-gray-50 rounded" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      <span className="text-sm font-medium">Light</span>
                    </div>
                    {mounted && currentTheme === "light" && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>

                  {/* Dark Mode Option */}
                  <button
                    onClick={() => {
                      setTheme("dark");
                      setSettings({ ...settings, theme: "dark" });
                    }}
                    className={cn(
                      "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                      "hover:border-primary/50 hover:bg-accent/50",
                      mounted && currentTheme === "dark"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-border bg-zinc-900">
                      {/* Dark mode preview */}
                      <div className="absolute inset-0 p-2">
                        <div className="h-2 w-8 bg-zinc-700 rounded mb-1.5" />
                        <div className="h-1.5 w-12 bg-zinc-800 rounded mb-2" />
                        <div className="flex gap-1">
                          <div className="h-6 w-6 bg-zinc-800 rounded" />
                          <div className="h-6 flex-1 bg-zinc-800/50 rounded" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4" />
                      <span className="text-sm font-medium">Dark</span>
                    </div>
                    {mounted && currentTheme === "dark" && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>

                  {/* System Option */}
                  <button
                    onClick={() => {
                      setTheme("system");
                      setSettings({ ...settings, theme: "system" });
                    }}
                    className={cn(
                      "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                      "hover:border-primary/50 hover:bg-accent/50",
                      mounted && currentTheme === "system"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-border">
                      {/* System mode preview - split */}
                      <div className="absolute inset-0 flex">
                        <div className="w-1/2 bg-white p-1.5">
                          <div className="h-1.5 w-4 bg-gray-200 rounded mb-1" />
                          <div className="h-1 w-6 bg-gray-100 rounded mb-1.5" />
                          <div className="h-4 w-full bg-gray-50 rounded" />
                        </div>
                        <div className="w-1/2 bg-zinc-900 p-1.5">
                          <div className="h-1.5 w-4 bg-zinc-700 rounded mb-1" />
                          <div className="h-1 w-6 bg-zinc-800 rounded mb-1.5" />
                          <div className="h-4 w-full bg-zinc-800 rounded" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      <span className="text-sm font-medium">System</span>
                    </div>
                    {mounted && currentTheme === "system" && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                </div>
                {mounted && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Currently showing: <span className="font-medium capitalize">{resolvedTheme}</span> theme
                    {currentTheme === "system" && " (based on your system preference)"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="data-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Data Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Export Your Data</p>
                  <p className="text-sm text-muted-foreground">Download all your financial data in CSV format</p>
                </div>
                <Button variant="outline" size="sm">
                  Export
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sync with Bank</p>
                  <p className="text-sm text-muted-foreground">Connect your bank account for automatic transaction import</p>
                </div>
                <Button variant="outline" size="sm">
                  Connect
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button for General */}
          <div className="flex justify-end gap-3">
            <Button variant="outline">Cancel</Button>
            <Button onClick={handleSave} className="gap-2">
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="data-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Notification Preferences</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive alerts about your spending and budgets</p>
                </div>
                <Button
                  variant={settings.notifications ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
                >
                  {settings.notifications ? "Enabled" : "Disabled"}
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Get monthly summaries and important updates</p>
                </div>
                <Button
                  variant={settings.emailNotifications ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings({ ...settings, emailNotifications: !settings.emailNotifications })}
                >
                  {settings.emailNotifications ? "Enabled" : "Disabled"}
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Budget Alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified when approaching budget limits</p>
                </div>
                <Button variant="default" size="sm">
                  Enabled
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Bill Reminders</p>
                  <p className="text-sm text-muted-foreground">Reminders before subscription due dates</p>
                </div>
                <Button variant="default" size="sm">
                  Enabled
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="data-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Security & Privacy</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full md:w-auto">
                Change Password
              </Button>
              <Separator />
              <Button variant="outline" className="w-full md:w-auto">
                Enable Two-Factor Authentication
              </Button>
              <Separator />
              <div className="pt-2">
                <Button variant="destructive" className="w-full md:w-auto">
                  Delete Account
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="ai" className="space-y-6">
          <AISettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
