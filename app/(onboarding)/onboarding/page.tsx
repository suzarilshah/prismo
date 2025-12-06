"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, Check, Wallet, Target, Shield, Building2, Briefcase, ChevronLeft, Loader2,
  User, Heart, Users, TrendingUp, Home, Car, Plane, GraduationCap, Sparkles, Receipt,
  CalendarDays, DollarSign, PiggyBank, CreditCard, FileText, Rocket, Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "@/app/actions/onboarding";

const steps = [
  { id: "welcome", title: "Welcome", icon: Sparkles },
  { id: "profile", title: "Profile", icon: User },
  { id: "workspace", title: "Workspace", icon: Building2 },
  { id: "financials", title: "Finances", icon: Wallet },
  { id: "tax", title: "Tax Profile", icon: Receipt },
  { id: "goals", title: "Goals", icon: Target },
];

// Financial goals options
const FINANCIAL_GOALS = [
  { id: "emergency_fund", label: "Build Emergency Fund", icon: Shield, description: "3-6 months of expenses" },
  { id: "debt_free", label: "Become Debt Free", icon: CreditCard, description: "Pay off all debts" },
  { id: "home", label: "Buy a Home", icon: Home, description: "Save for property downpayment" },
  { id: "retirement", label: "Early Retirement", icon: PiggyBank, description: "FIRE lifestyle" },
  { id: "car", label: "Buy a Car", icon: Car, description: "Vehicle purchase fund" },
  { id: "travel", label: "Travel Fund", icon: Plane, description: "Annual vacations" },
  { id: "education", label: "Education Fund", icon: GraduationCap, description: "Kids' education or upskilling" },
  { id: "investing", label: "Start Investing", icon: TrendingUp, description: "Build investment portfolio" },
];

// Workspace type options
const WORKSPACE_TYPES = [
  { value: "personal", label: "Personal Finance", icon: User, color: "bg-blue-500", description: "Track your personal income and expenses" },
  { value: "family", label: "Family Budget", icon: Heart, color: "bg-pink-500", description: "Manage household finances together" },
  { value: "business", label: "Business Finances", icon: Building2, color: "bg-emerald-500", description: "Track business income and expenses" },
  { value: "side_hustle", label: "Side Hustle", icon: Rocket, color: "bg-purple-500", description: "Monitor freelance or gig income" },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State - Enhanced with all profiling data
  const [formData, setFormData] = useState({
    // Step 1: Profile
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    
    // Step 2: Workspace
    workspaceName: "",
    workspaceType: "personal",
    workspaceDescription: "",
    
    // Step 3: Financials
    occupation: "",
    employmentType: "employed" as "employed" | "self_employed" | "retired" | "student" | "unemployed",
    employerName: "",
    monthlyIncome: "",
    currency: "MYR",
    
    // Step 4: Tax Profile (Malaysian)
    maritalStatus: "single" as "single" | "married" | "divorced" | "widowed",
    numberOfDependents: "0",
    taxResidentStatus: "resident" as "resident" | "non_resident",
    epfContribution: "11", // Percentage
    
    // Step 5: Goals
    goals: [] as string[],
    primaryGoal: "",
    targetEmergencyFund: "",
  });

  // Auto-generate workspace name suggestion
  useEffect(() => {
    if (formData.firstName && !formData.workspaceName) {
      setFormData(prev => ({
        ...prev,
        workspaceName: `${formData.firstName}'s Finance`
      }));
    }
  }, [formData.firstName]);

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Final Step Submission
      setIsLoading(true);
      try {
        await completeOnboarding({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          workspaceName: formData.workspaceName,
          workspaceType: formData.workspaceType,
          workspaceDescription: formData.workspaceDescription,
          occupation: formData.occupation,
          employmentType: formData.employmentType,
          employerName: formData.employerName,
          monthlyIncome: formData.monthlyIncome,
          currency: formData.currency,
          maritalStatus: formData.maritalStatus,
          numberOfDependents: formData.numberOfDependents,
          taxResidentStatus: formData.taxResidentStatus,
          epfContribution: formData.epfContribution,
          goals: formData.goals,
          primaryGoal: formData.primaryGoal,
          targetEmergencyFund: formData.targetEmergencyFund,
        });
      } catch (error) {
        console.error("Onboarding failed:", error);
        setIsLoading(false);
      }
    }
  };

  const toggleGoal = (goalId: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId) 
        ? prev.goals.filter(g => g !== goalId)
        : [...prev.goals, goalId],
      primaryGoal: prev.goals.length === 0 ? goalId : prev.primaryGoal,
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true; // Welcome - always can proceed
      case 1: return formData.firstName.length > 0; // Profile
      case 2: return formData.workspaceName.length > 0; // Workspace
      case 3: return formData.monthlyIncome.length > 0; // Financials
      case 4: return true; // Tax - optional
      case 5: return formData.goals.length > 0; // Goals
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Grid Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundSize: '60px 60px',
        backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)'
      }} />
      
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <Card className="w-full max-w-3xl border-white/10 bg-zinc-900/80 backdrop-blur-2xl shadow-2xl relative z-10 overflow-hidden">
        {/* Progress Bar (Top) */}
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-in-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <CardHeader className="pt-8 pb-2">
          {/* Steps Indicator - Compact for 6 steps */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300",
                    index <= currentStep 
                      ? "bg-gradient-to-br from-blue-500 to-purple-600 border-transparent text-white" 
                      : "bg-zinc-900/50 border-white/10 text-muted-foreground"
                  )}
                >
                  {index < currentStep ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                </div>
                {index < steps.length - 1 && (
                  <div className={cn("w-8 h-0.5 mx-1", index < currentStep ? "bg-blue-500" : "bg-white/10")} />
                )}
              </div>
            ))}
          </div>

          <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Badge variant="outline" className="mb-2 text-xs">
              Step {currentStep + 1} of {steps.length}
            </Badge>
            <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
              {currentStep === 0 && "Welcome to Prismo"}
              {currentStep === 1 && "Tell Us About Yourself"}
              {currentStep === 2 && "Create Your Workspace"}
              {currentStep === 3 && "Financial Profile"}
              {currentStep === 4 && "Tax Information"}
              {currentStep === 5 && "Your Financial Goals"}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground max-w-md mx-auto">
              {currentStep === 0 && "Your intelligent personal finance companion. Let's set you up for success."}
              {currentStep === 1 && "Help us personalize your experience with some basic information."}
              {currentStep === 2 && "Create a dedicated workspace to organize your finances."}
              {currentStep === 3 && "Understanding your income helps us provide accurate insights."}
              {currentStep === 4 && "Optional: For Malaysian tax planning and LHDN optimization."}
              {currentStep === 5 && "What are you working towards? Select all that apply."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6 px-8 min-h-[380px]">
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 text-center">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <Crown className="w-12 h-12 text-white" />
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">Smart Finance Management</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                    <p className="text-xs text-muted-foreground">AI-Powered Forecasting</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <Receipt className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-xs text-muted-foreground">Tax Optimization</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <Users className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                    <p className="text-xs text-muted-foreground">Family Collaboration</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Takes about 2 minutes to complete setup
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Profile */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">First Name *</Label>
                  <Input 
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    placeholder="Ahmad" 
                    className="bg-white/5 border-white/10 h-12 text-lg focus:border-blue-500/50 focus:ring-blue-500/20 transition-all text-foreground placeholder:text-muted-foreground/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Last Name</Label>
                  <Input 
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    placeholder="Rashid" 
                    className="bg-white/5 border-white/10 h-12 text-lg focus:border-blue-500/50 focus:ring-blue-500/20 transition-all text-foreground placeholder:text-muted-foreground/50" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                  <Input 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+60 12-345 6789" 
                    className="bg-white/5 border-white/10 h-12 text-lg focus:border-blue-500/50 focus:ring-blue-500/20 transition-all text-foreground placeholder:text-muted-foreground/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date of Birth</Label>
                  <Input 
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                    className="bg-white/5 border-white/10 h-12 text-lg focus:border-blue-500/50 focus:ring-blue-500/20 transition-all text-foreground" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Workspace */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Workspace Name *</Label>
                <Input 
                  value={formData.workspaceName}
                  onChange={(e) => setFormData({...formData, workspaceName: e.target.value})}
                  placeholder="My Personal Finance" 
                  className="bg-white/5 border-white/10 h-12 text-lg focus:border-blue-500/50 focus:ring-blue-500/20 transition-all text-foreground placeholder:text-muted-foreground/50" 
                />
                <p className="text-xs text-muted-foreground">This will be your main financial workspace</p>
              </div>
              
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Workspace Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {WORKSPACE_TYPES.map((type) => (
                    <div
                      key={type.value}
                      onClick={() => setFormData({...formData, workspaceType: type.value})}
                      className={cn(
                        "p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.02]",
                        formData.workspaceType === type.value
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", type.color)}>
                          <type.icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className={cn("font-medium text-sm", formData.workspaceType === type.value ? "text-blue-500" : "text-foreground")}>
                            {type.label}
                          </p>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Financials */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Employment Type</Label>
                  <Select value={formData.employmentType} onValueChange={(val: typeof formData.employmentType) => setFormData({...formData, employmentType: val})}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-12 focus:ring-blue-500/20 focus:border-blue-500/50">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-foreground">
                      <SelectItem value="employed">Employed</SelectItem>
                      <SelectItem value="self_employed">Self-Employed</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="unemployed">Currently Unemployed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Occupation</Label>
                  <Input 
                    value={formData.occupation}
                    onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                    placeholder="e.g. Software Engineer" 
                    className="bg-white/5 border-white/10 h-12 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all text-foreground placeholder:text-muted-foreground/50" 
                  />
                </div>
              </div>
              
              {formData.employmentType === "employed" && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Employer Name</Label>
                  <Input 
                    value={formData.employerName}
                    onChange={(e) => setFormData({...formData, employerName: e.target.value})}
                    placeholder="e.g. Petronas, Maybank" 
                    className="bg-white/5 border-white/10 h-12 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all text-foreground placeholder:text-muted-foreground/50" 
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Monthly Income (Net) *</Label>
                  <div className="relative group">
                    <span className="absolute left-4 top-3.5 text-muted-foreground font-bold group-focus-within:text-blue-500 transition-colors">
                      RM
                    </span>
                    <Input 
                      type="number"
                      value={formData.monthlyIncome}
                      onChange={(e) => setFormData({...formData, monthlyIncome: e.target.value})}
                      placeholder="0.00" 
                      className="pl-12 bg-white/5 border-white/10 h-12 text-lg font-bold focus:border-blue-500/50 focus:ring-blue-500/20 transition-all text-foreground placeholder:text-muted-foreground/50" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Currency</Label>
                  <Select value={formData.currency} onValueChange={(val) => setFormData({...formData, currency: val})}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-12 focus:ring-blue-500/20 focus:border-blue-500/50">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-foreground">
                      <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Tax Profile */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
                <p className="text-sm text-blue-400">
                  <Receipt className="w-4 h-4 inline mr-2" />
                  This information helps optimize your LHDN tax reliefs and deductions
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Marital Status</Label>
                  <Select value={formData.maritalStatus} onValueChange={(val: typeof formData.maritalStatus) => setFormData({...formData, maritalStatus: val})}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-12 focus:ring-blue-500/20 focus:border-blue-500/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-foreground">
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Number of Dependents</Label>
                  <Select value={formData.numberOfDependents} onValueChange={(val) => setFormData({...formData, numberOfDependents: val})}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-12 focus:ring-blue-500/20 focus:border-blue-500/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-foreground">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? "dependent" : "dependents"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tax Resident Status</Label>
                  <Select value={formData.taxResidentStatus} onValueChange={(val: typeof formData.taxResidentStatus) => setFormData({...formData, taxResidentStatus: val})}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-12 focus:ring-blue-500/20 focus:border-blue-500/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-foreground">
                      <SelectItem value="resident">Tax Resident (182+ days in Malaysia)</SelectItem>
                      <SelectItem value="non_resident">Non-Resident</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">EPF Contribution Rate</Label>
                  <Select value={formData.epfContribution} onValueChange={(val) => setFormData({...formData, epfContribution: val})}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-12 focus:ring-blue-500/20 focus:border-blue-500/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-foreground">
                      <SelectItem value="0">0% (Self-employed)</SelectItem>
                      <SelectItem value="7">7% (55-75 years old)</SelectItem>
                      <SelectItem value="9">9% (55-75 years old)</SelectItem>
                      <SelectItem value="11">11% (Standard)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Goals */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="grid grid-cols-2 gap-3">
                {FINANCIAL_GOALS.map((goal) => (
                  <div 
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={cn(
                      "p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.02]",
                      formData.goals.includes(goal.id)
                        ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 flex-shrink-0",
                        formData.goals.includes(goal.id) ? "bg-blue-500 text-white" : "bg-white/10 text-muted-foreground"
                      )}>
                        <goal.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium text-sm transition-colors duration-300",
                          formData.goals.includes(goal.id) ? "text-blue-500" : "text-foreground"
                        )}>
                          {goal.label}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{goal.description}</p>
                      </div>
                      {formData.goals.includes(goal.id) && (
                        <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {formData.goals.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-muted-foreground mb-2">Selected: {formData.goals.length} goal(s)</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.goals.map(goalId => {
                      const goal = FINANCIAL_GOALS.find(g => g.id === goalId);
                      return goal ? (
                        <Badge key={goalId} variant="secondary" className="text-xs">
                          {goal.label}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t border-white/5 pt-6 px-8 pb-8">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button 
            onClick={handleNext}
            disabled={isLoading || !canProceed()}
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 font-bold shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:scale-105 min-w-[160px] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
              </>
            ) : currentStep === steps.length - 1 ? (
              <>Launch Dashboard <Rocket className="ml-2 w-4 h-4" /></>
            ) : currentStep === 0 ? (
              <>Get Started <ArrowRight className="ml-2 w-4 h-4" /></>
            ) : (
              <>Continue <ArrowRight className="ml-2 w-4 h-4" /></>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
