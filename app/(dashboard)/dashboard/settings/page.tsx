"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Globe, Bell, Shield, Palette, Database, Loader2, Brain, Sparkles } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { AISettingsForm } from "@/components/ai/AISettingsForm";

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
      const res = await fetch("/api/user-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
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
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-background">
            <User className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-background">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-background">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-background relative">
            <Brain className="w-4 h-4 mr-2" />
            AI Assistant
            <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
              BETA
            </Badge>
          </TabsTrigger>
        </TabsList>

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
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={settings.theme}
                  onValueChange={(value) => setSettings({ ...settings, theme: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light Mode</SelectItem>
                    <SelectItem value="dark">Dark Mode</SelectItem>
                    <SelectItem value="system">System Default</SelectItem>
                  </SelectContent>
                </Select>
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
