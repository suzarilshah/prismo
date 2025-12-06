"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Brain,
  Sparkles,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  Server,
  Key,
  Shield,
  Zap,
  Database,
  AlertTriangle,
  Settings2,
  RefreshCw,
  CircleDot,
} from "lucide-react";

interface AISettings {
  aiEnabled: boolean;
  provider: "azure_foundry" | "openai" | "anthropic";
  modelEndpoint: string | null;
  modelName: string | null;
  temperature: number;
  maxTokens: number;
  enableCrag: boolean;
  relevanceThreshold: number;
  maxRetrievalDocs: number;
  enableWebSearchFallback: boolean;
  dataAccess: {
    transactions: boolean;
    budgets: boolean;
    goals: boolean;
    subscriptions: boolean;
    creditCards: boolean;
    taxData: boolean;
    income: boolean;
    forecasts: boolean;
  };
  anonymizeVendors: boolean;
  excludeSensitiveCategories: string[];
  hasApiKey: boolean;
  maskedApiKey: string | null;
}

const DEFAULT_SETTINGS: AISettings = {
  aiEnabled: false,
  provider: "azure_foundry",
  modelEndpoint: null,
  modelName: null,
  temperature: 0.7,
  maxTokens: 2048,
  enableCrag: true,
  relevanceThreshold: 0.7,
  maxRetrievalDocs: 10,
  enableWebSearchFallback: false,
  dataAccess: {
    transactions: true,
    budgets: true,
    goals: true,
    subscriptions: true,
    creditCards: true,
    taxData: true,
    income: true,
    forecasts: true,
  },
  anonymizeVendors: false,
  excludeSensitiveCategories: [],
  hasApiKey: false,
  maskedApiKey: null,
};

const PROVIDERS = [
  { value: "azure_foundry", label: "Azure AI Foundry", description: "Microsoft's enterprise AI platform" },
  { value: "openai", label: "OpenAI", description: "GPT-4, GPT-4o, GPT-3.5" },
  { value: "anthropic", label: "Anthropic", description: "Claude 3.5, Claude 3" },
];

const DATA_ACCESS_OPTIONS = [
  { key: "transactions", label: "Transactions", icon: "💳", description: "Spending history and patterns" },
  { key: "budgets", label: "Budgets", icon: "📊", description: "Budget allocations and usage" },
  { key: "goals", label: "Goals", icon: "🎯", description: "Financial goals and progress" },
  { key: "subscriptions", label: "Subscriptions", icon: "🔄", description: "Recurring payments" },
  { key: "creditCards", label: "Credit Cards", icon: "💳", description: "Card usage and limits" },
  { key: "taxData", label: "Tax Data", icon: "🧾", description: "Tax deductions and PCB" },
  { key: "income", label: "Income", icon: "💰", description: "Income sources and trends" },
  { key: "forecasts", label: "Forecasts", icon: "📈", description: "Spending predictions" },
];

async function fetchAISettings(): Promise<AISettings> {
  const res = await fetch("/api/ai/settings");
  if (!res.ok) return DEFAULT_SETTINGS;
  const data = await res.json();
  return data.data || DEFAULT_SETTINGS;
}

async function saveAISettings(settings: Partial<AISettings> & { apiKey?: string }) {
  const res = await fetch("/api/ai/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to save settings");
  return res.json();
}

async function testConnection(data: {
  provider: string;
  modelEndpoint: string;
  modelName: string;
  apiKey?: string;
}) {
  const res = await fetch("/api/ai/test-connection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Connection test failed");
  return result;
}

export function AISettingsForm() {
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [localSettings, setLocalSettings] = useState<AISettings>(DEFAULT_SETTINGS);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: fetchAISettings,
  });

  // Sync local settings with fetched settings
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: saveAISettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      setHasChanges(false);
      setNewApiKey("");
      toast.success("Settings Saved", {
        description: "Your AI assistant configuration has been updated.",
      });
    },
    onError: (error) => {
      toast.error("Failed to save settings", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: testConnection,
    onSuccess: (data) => {
      toast.success("Connection Successful", {
        description: `Connected to ${localSettings.provider} in ${data.data.latencyMs}ms`,
      });
    },
    onError: (error) => {
      toast.error("Connection Failed", {
        description: error instanceof Error ? error.message : "Please check your configuration.",
      });
    },
  });

  const updateSetting = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateDataAccess = (key: string, value: boolean) => {
    setLocalSettings((prev) => ({
      ...prev,
      dataAccess: { ...prev.dataAccess, [key]: value },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const payload: Partial<AISettings> & { apiKey?: string } = { ...localSettings };
    if (newApiKey) {
      payload.apiKey = newApiKey;
    }
    saveMutation.mutate(payload);
  };

  const handleTestConnection = () => {
    if (!localSettings.modelEndpoint || !localSettings.modelName) {
      toast.error("Missing Configuration", {
        description: "Please enter model endpoint and model name.",
      });
      return;
    }

    testMutation.mutate({
      provider: localSettings.provider,
      modelEndpoint: localSettings.modelEndpoint,
      modelName: localSettings.modelName,
      apiKey: newApiKey || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card - Feature Toggle */}
      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-cyan-500/5">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  AI Financial Assistant
                  <Badge variant="secondary" className="text-xs font-normal">
                    BETA
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Get personalized financial insights, tax optimization tips, and spending recommendations
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={localSettings.aiEnabled}
              onCheckedChange={(checked) => updateSetting("aiEnabled", checked)}
            />
          </div>
        </CardHeader>

        <AnimatePresence>
          {localSettings.aiEnabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="pt-0 pb-6">
                <Alert className="bg-amber-500/10 border-amber-500/30">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-amber-600 dark:text-amber-400">
                    AI features require an API key from your chosen provider. Your data is processed securely
                    and never shared with third parties.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Configuration Cards - Only show when AI is enabled */}
      <AnimatePresence>
        {localSettings.aiEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Provider Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" />
                  AI Model Configuration
                </CardTitle>
                <CardDescription>
                  Connect to your AI provider using credentials from Azure AI Foundry, OpenAI, or Anthropic
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Provider Select */}
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={localSettings.provider}
                    onValueChange={(value: "azure_foundry" | "openai" | "anthropic") =>
                      updateSetting("provider", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          <div className="flex flex-col">
                            <span>{provider.label}</span>
                            <span className="text-xs text-muted-foreground">{provider.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Model Endpoint */}
                <div className="space-y-2">
                  <Label htmlFor="modelEndpoint">Model Endpoint</Label>
                  <Input
                    id="modelEndpoint"
                    placeholder={
                      localSettings.provider === "azure_foundry"
                        ? "https://your-resource.openai.azure.com/"
                        : localSettings.provider === "openai"
                        ? "https://api.openai.com/v1"
                        : "https://api.anthropic.com/v1"
                    }
                    value={localSettings.modelEndpoint || ""}
                    onChange={(e) => updateSetting("modelEndpoint", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {localSettings.provider === "azure_foundry"
                      ? "Your Azure OpenAI resource endpoint"
                      : "API endpoint URL (leave default for standard API)"}
                  </p>
                </div>

                {/* Model Name */}
                <div className="space-y-2">
                  <Label htmlFor="modelName">Model Name / Deployment</Label>
                  <Input
                    id="modelName"
                    placeholder={
                      localSettings.provider === "azure_foundry"
                        ? "gpt-4o (deployment name)"
                        : localSettings.provider === "openai"
                        ? "gpt-4o"
                        : "claude-3-5-sonnet-20241022"
                    }
                    value={localSettings.modelName || ""}
                    onChange={(e) => updateSetting("modelName", e.target.value)}
                  />
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? "text" : "password"}
                      placeholder={localSettings.hasApiKey ? localSettings.maskedApiKey || "••••••••" : "Enter your API key"}
                      value={newApiKey}
                      onChange={(e) => {
                        setNewApiKey(e.target.value);
                        setHasChanges(true);
                      }}
                      className="pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {localSettings.hasApiKey && !newApiKey && (
                        <Badge variant="outline" className="text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          Saved
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your API key is encrypted with AES-256 before storage
                  </p>
                </div>

                {/* Test Connection Button */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testMutation.isPending}
                  >
                    {testMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  {testMutation.isSuccess && (
                    <span className="text-sm text-emerald-500 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Connected successfully
                    </span>
                  )}
                  {testMutation.isError && (
                    <span className="text-sm text-destructive flex items-center gap-1">
                      <X className="w-4 h-4" />
                      Connection failed
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Advanced RAG Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  Advanced RAG Settings
                </CardTitle>
                <CardDescription>
                  Configure the Corrective RAG pipeline for optimal performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Temperature Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Temperature</Label>
                    <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                      {localSettings.temperature.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[localSettings.temperature]}
                    onValueChange={(values: number[]) => updateSetting("temperature", values[0])}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Select
                    value={localSettings.maxTokens.toString()}
                    onValueChange={(value) => updateSetting("maxTokens", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024">1,024 (Short responses)</SelectItem>
                      <SelectItem value="2048">2,048 (Default)</SelectItem>
                      <SelectItem value="4096">4,096 (Detailed responses)</SelectItem>
                      <SelectItem value="8192">8,192 (Very detailed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* CRAG Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <CircleDot className="w-4 h-4 text-primary" />
                      Enable Corrective RAG (CRAG)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Self-correcting retrieval with relevance grading and query rewriting
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.enableCrag}
                    onCheckedChange={(checked) => updateSetting("enableCrag", checked)}
                  />
                </div>

                {/* Relevance Threshold */}
                {localSettings.enableCrag && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 pl-6 border-l-2 border-primary/20"
                  >
                    <div className="flex items-center justify-between">
                      <Label>Relevance Threshold</Label>
                      <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                        {localSettings.relevanceThreshold.toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[localSettings.relevanceThreshold]}
                      onValueChange={(values: number[]) => updateSetting("relevanceThreshold", values[0])}
                      min={0.5}
                      max={0.95}
                      step={0.05}
                    />
                    <p className="text-xs text-muted-foreground">
                      Documents below this score trigger query rewriting
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Data Access Permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Data Access Permissions
                </CardTitle>
                <CardDescription>
                  Control which financial data the AI can analyze to provide insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {DATA_ACCESS_OPTIONS.map((option) => (
                    <div
                      key={option.key}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        localSettings.dataAccess[option.key as keyof typeof localSettings.dataAccess]
                          ? "border-primary/50 bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                      onClick={() =>
                        updateDataAccess(
                          option.key,
                          !localSettings.dataAccess[option.key as keyof typeof localSettings.dataAccess]
                        )
                      }
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{option.icon}</span>
                        <Checkbox
                          checked={localSettings.dataAccess[option.key as keyof typeof localSettings.dataAccess]}
                          onCheckedChange={(checked) => updateDataAccess(option.key, checked as boolean)}
                        />
                      </div>
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                {/* Privacy Options */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Anonymize Vendor Names</Label>
                      <p className="text-xs text-muted-foreground">
                        Replace merchant names with generic labels in AI responses
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.anonymizeVendors}
                      onCheckedChange={(checked) => updateSetting("anonymizeVendors", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 pt-4">
              {hasChanges && (
                <span className="text-sm text-muted-foreground">You have unsaved changes</span>
              )}
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !hasChanges}
                className="min-w-[120px]"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
