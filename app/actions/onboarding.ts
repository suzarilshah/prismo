"use server";

import { db } from "@/db";
import { users, goals, financeGroups, financeGroupMembers, categories, userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// Goal label mapping for display
const GOAL_LABELS: Record<string, string> = {
  emergency_fund: "Build Emergency Fund",
  debt_free: "Become Debt Free",
  home: "Buy a Home",
  retirement: "Early Retirement",
  car: "Buy a Car",
  travel: "Travel Fund",
  education: "Education Fund",
  investing: "Start Investing",
};

export async function completeOnboarding(data: {
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  workspaceName: string;
  workspaceType: string;
  workspaceDescription?: string;
  occupation?: string;
  employmentType?: string;
  employerName?: string;
  monthlyIncome: string;
  currency: string;
  maritalStatus?: string;
  numberOfDependents?: string;
  taxResidentStatus?: string;
  epfContribution?: string;
  goals: string[];
  primaryGoal?: string;
  targetEmergencyFund?: string;
}) {
  const name = `${data.firstName} ${data.lastName}`.trim();
  
  // Try to get the authenticated user's session first
  let userId: string;
  let userEmail: string;
  
  const session = await getSession();
  
  if (session?.user?.id) {
    // User is authenticated via Stack Auth - update their profile
    userId = session.user.id;
    userEmail = session.user.email || `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}@prismo.app`;
    
    // Update user profile
    await db
      .update(users)
      .set({
        name,
        phone: data.phone || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : null,
        occupation: data.occupation || null,
        employmentType: data.employmentType || null,
        employerName: data.employerName || null,
        salary: data.monthlyIncome || null,
        annualIncome: data.monthlyIncome ? (parseFloat(data.monthlyIncome) * 12).toString() : null,
        currency: data.currency,
        maritalStatus: data.maritalStatus || "single",
        numberOfDependents: data.numberOfDependents ? parseInt(data.numberOfDependents) : 0,
        taxResidentStatus: data.taxResidentStatus || "resident",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
      
  } else {
    // No session - create a new user (demo mode)
    userEmail = `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}@prismo.app`;
    
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, userEmail),
    });

    if (existingUser) {
      userId = existingUser.id;
      await db
        .update(users)
        .set({
          name,
          phone: data.phone || null,
          occupation: data.occupation || null,
          employmentType: data.employmentType || null,
          employerName: data.employerName || null,
          salary: data.monthlyIncome || null,
          annualIncome: data.monthlyIncome ? (parseFloat(data.monthlyIncome) * 12).toString() : null,
          currency: data.currency,
          maritalStatus: data.maritalStatus || "single",
          numberOfDependents: data.numberOfDependents ? parseInt(data.numberOfDependents) : 0,
          taxResidentStatus: data.taxResidentStatus || "resident",
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          email: userEmail,
          name,
          phone: data.phone || null,
          occupation: data.occupation || null,
          employmentType: data.employmentType || null,
          employerName: data.employerName || null,
          salary: data.monthlyIncome || null,
          annualIncome: data.monthlyIncome ? (parseFloat(data.monthlyIncome) * 12).toString() : null,
          currency: data.currency,
          maritalStatus: data.maritalStatus || "single",
          numberOfDependents: data.numberOfDependents ? parseInt(data.numberOfDependents) : 0,
          taxResidentStatus: data.taxResidentStatus || "resident",
          emailVerified: true,
        })
        .returning({ id: users.id });
      userId = newUser.id;
    }
  }

  // 2. Create Finance Group (Workspace)
  const [existingGroup] = await db
    .select()
    .from(financeGroups)
    .where(eq(financeGroups.ownerId, userId))
    .limit(1);
  
  let financeGroupId: string;
  
  if (existingGroup) {
    // Update existing group
    financeGroupId = existingGroup.id;
    await db
      .update(financeGroups)
      .set({
        name: data.workspaceName,
        description: data.workspaceDescription || null,
        type: data.workspaceType,
        currency: data.currency,
        isDefault: true,
        updatedAt: new Date(),
      })
      .where(eq(financeGroups.id, financeGroupId));
  } else {
    // Create new finance group
    const [newGroup] = await db
      .insert(financeGroups)
      .values({
        ownerId: userId,
        name: data.workspaceName,
        description: data.workspaceDescription || `${data.workspaceType} finance workspace`,
        type: data.workspaceType,
        currency: data.currency,
        isDefault: true,
        isActive: true,
        enableForecasting: true,
        forecastingPeriod: 12,
        totalMembers: 1,
      })
      .returning();
    
    financeGroupId = newGroup.id;
    
    // Add user as owner member
    await db.insert(financeGroupMembers).values({
      financeGroupId: financeGroupId,
      userId: userId,
      role: "owner",
      permissions: {
        viewTransactions: true,
        editTransactions: true,
        viewBudgets: true,
        editBudgets: true,
        viewGoals: true,
        editGoals: true,
        viewTax: true,
        editTax: true,
        viewCommitments: true,
        editCommitments: true,
        viewReports: true,
        exportData: true,
        inviteMembers: true,
        manageMembers: true,
      },
      status: "active",
    });
  }

  // 3. Create default expense categories for this group
  const existingCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .limit(1);
  
  if (existingCategories.length === 0) {
    const defaultCategories = [
      { name: "Food & Dining", type: "expense", icon: "🍔", color: "#f97316" },
      { name: "Transportation", type: "expense", icon: "🚗", color: "#3b82f6" },
      { name: "Utilities", type: "expense", icon: "💡", color: "#eab308" },
      { name: "Shopping", type: "expense", icon: "🛍️", color: "#ec4899" },
      { name: "Entertainment", type: "expense", icon: "🎬", color: "#8b5cf6" },
      { name: "Healthcare", type: "expense", icon: "🏥", color: "#ef4444" },
      { name: "Education", type: "expense", icon: "📚", color: "#06b6d4", isTaxDeductible: true },
      { name: "Insurance", type: "expense", icon: "🛡️", color: "#14b8a6", isTaxDeductible: true },
      { name: "Salary", type: "income", icon: "💼", color: "#22c55e" },
      { name: "Bonus", type: "income", icon: "🎁", color: "#10b981" },
      { name: "Investment", type: "income", icon: "📈", color: "#06b6d4" },
      { name: "Freelance", type: "income", icon: "💻", color: "#8b5cf6" },
    ];
    
    await db.insert(categories).values(
      defaultCategories.map(cat => ({
        userId,
        financeGroupId,
        name: cat.name,
        type: cat.type as "income" | "expense",
        icon: cat.icon,
        color: cat.color,
        isTaxDeductible: cat.isTaxDeductible || false,
      }))
    );
  }

  // 4. Create Goals based on user selections
  if (data.goals.length > 0) {
    // Delete existing goals first to avoid duplicates
    await db.delete(goals).where(eq(goals.userId, userId));
    
    await db.insert(goals).values(
      data.goals.map((goalId) => ({
        userId,
        financeGroupId,
        name: GOAL_LABELS[goalId] || goalId,
        targetAmount: goalId === "emergency_fund" && data.monthlyIncome 
          ? (parseFloat(data.monthlyIncome) * 6).toString() 
          : "0",
        currency: data.currency,
        category: "Financial",
        priority: goalId === data.primaryGoal ? "high" : "medium",
      }))
    );
  }

  // 5. Create or update user settings
  const [existingSettings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  
  if (!existingSettings) {
    await db.insert(userSettings).values({
      userId,
      theme: "dark",
      language: "en",
      notifications: {
        email: true,
        push: false,
        budgetAlerts: true,
        billReminders: true,
        goalMilestones: true,
        commitmentReminders: true,
        taxDeadlines: true,
      },
      dashboardWidgets: ["overview", "spending", "goals", "budgets"],
    });
  }

  // 6. Redirect to Dashboard
  redirect("/dashboard");
}
