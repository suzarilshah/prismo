/**
 * Notification Service - Centralized notification management
 * 
 * This service provides a unified interface for creating, managing, and
 * checking notifications across the entire application.
 */

import { db } from "@/db";
import { notifications, notificationPreferences, NOTIFICATION_TYPES } from "@/db/schema";
import { eq } from "drizzle-orm";

// Notification category constants
export const NOTIFICATION_CATEGORIES = {
  TRANSACTION: 'transaction',
  BUDGET: 'budget',
  GOAL: 'goal',
  SUBSCRIPTION: 'subscription',
  COMMITMENT: 'commitment',
  TAX: 'tax',
  FINANCE_GROUP: 'finance_group',
  SETTINGS: 'settings',
  SYSTEM: 'system',
} as const;

// Priority levels
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// Icon mappings for notification types
export const NOTIFICATION_ICONS: Record<string, string> = {
  // Transactions
  income_added: 'TrendingUp',
  income_edited: 'Edit',
  transaction_added: 'Receipt',
  expense_added: 'ShoppingCart',
  expense_deleted: 'Trash2',
  transaction_deleted: 'Trash2',
  
  // Vendors
  vendor_added: 'Store',
  vendor_removed: 'Trash2',
  
  // Budgets
  budget_added: 'PieChart',
  budget_threshold_warning: 'AlertTriangle',
  budget_threshold_exceeded: 'AlertCircle',
  
  // Goals
  goal_added: 'Target',
  goal_edited: 'Edit',
  goal_progress_50: 'TrendingUp',
  goal_progress_75: 'TrendingUp',
  goal_progress_100: 'CheckCircle2',
  
  // Subscriptions
  subscription_added: 'CreditCard',
  subscription_reminder: 'Bell',
  subscription_due_today: 'Clock',
  subscription_overdue: 'AlertTriangle',
  
  // Commitments
  commitment_added: 'ClipboardList',
  commitment_reminder: 'Bell',
  commitment_due_today: 'Clock',
  commitment_overdue: 'AlertTriangle',
  
  // Tax
  tax_deduction_added: 'FileText',
  tax_filing_reminder: 'Calendar',
  tax_deadline_approaching: 'AlertTriangle',
  
  // Finance Groups
  finance_group_created: 'Users',
  finance_group_edited: 'Edit',
  finance_group_deleted: 'Trash2',
  finance_group_invite_sent: 'Send',
  finance_group_invite_received: 'Mail',
  finance_group_invite_accepted: 'UserCheck',
  finance_group_invite_declined: 'UserX',
  finance_group_member_joined: 'UserPlus',
  finance_group_member_left: 'UserMinus',
  finance_group_member_change: 'RefreshCw',
  
  // Settings
  settings_changed: 'Settings',
  profile_updated: 'User',
  
  // System
  system_announcement: 'Megaphone',
  achievement_unlocked: 'Award',
};

// Color mappings for notification categories
export const NOTIFICATION_COLORS: Record<string, string> = {
  transaction: 'blue',
  budget: 'amber',
  goal: 'emerald',
  subscription: 'purple',
  commitment: 'cyan',
  tax: 'orange',
  finance_group: 'pink',
  settings: 'gray',
  system: 'indigo',
};

// Types
export interface CreateNotificationParams {
  userId: string;
  type: keyof typeof NOTIFICATION_TYPES;
  title: string;
  message: string;
  category: keyof typeof NOTIFICATION_CATEGORIES;
  priority?: keyof typeof NOTIFICATION_PRIORITY;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: {
    amount?: number;
    currency?: string;
    percentComplete?: number;
    daysUntilDue?: number;
    previousValue?: string;
    newValue?: string;
    changedBy?: string;
    changedByName?: string;
    additionalInfo?: Record<string, unknown>;
  };
  triggeredByUserId?: string;
  expiresAt?: Date;
}

// Notification Service Class
export class NotificationService {
  /**
   * Create a new notification
   */
  static async create(params: CreateNotificationParams): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      // Check if user has notifications enabled for this category
      const prefs = await this.getUserPreferences(params.userId);
      
      const categoryKey = `enable${this.capitalizeFirst(params.category)}` as keyof typeof prefs;
      if (prefs && prefs[categoryKey] === false) {
        return { success: true, notificationId: undefined }; // Silently skip if disabled
      }

      const icon = NOTIFICATION_ICONS[NOTIFICATION_TYPES[params.type]] || 'Bell';
      const color = NOTIFICATION_COLORS[NOTIFICATION_CATEGORIES[params.category]] || 'gray';

      const [notification] = await db
        .insert(notifications)
        .values({
          userId: params.userId,
          type: NOTIFICATION_TYPES[params.type],
          title: params.title,
          message: params.message,
          category: NOTIFICATION_CATEGORIES[params.category],
          priority: params.priority ? NOTIFICATION_PRIORITY[params.priority] : 'normal',
          entityType: params.entityType,
          entityId: params.entityId,
          actionUrl: params.actionUrl,
          actionLabel: params.actionLabel,
          metadata: params.metadata,
          icon,
          color,
          triggeredByUserId: params.triggeredByUserId,
          expiresAt: params.expiresAt,
        })
        .returning();

      return { success: true, notificationId: notification.id };
    } catch (error) {
      console.error("Error creating notification:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get user notification preferences
   */
  static async getUserPreferences(userId: string) {
    try {
      const [prefs] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);
      
      return prefs || null;
    } catch {
      return null;
    }
  }

  /**
   * Create or update user notification preferences
   */
  static async upsertPreferences(userId: string, preferences: Partial<typeof notificationPreferences.$inferInsert>) {
    try {
      const existing = await this.getUserPreferences(userId);
      
      if (existing) {
        await db
          .update(notificationPreferences)
          .set({ ...preferences, updatedAt: new Date() })
          .where(eq(notificationPreferences.userId, userId));
      } else {
        await db
          .insert(notificationPreferences)
          .values({ userId, ...preferences });
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error upserting notification preferences:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Helper to capitalize first letter
   */
  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }

  // ========================================
  // CONVENIENCE METHODS FOR SPECIFIC EVENTS
  // ========================================

  /**
   * Income Added Notification
   */
  static async notifyIncomeAdded(userId: string, amount: number, currency: string, description?: string) {
    return this.create({
      userId,
      type: 'INCOME_ADDED',
      title: 'Income Recorded',
      message: `New income of ${currency} ${amount.toLocaleString()} has been recorded${description ? `: ${description}` : '.'}`,
      category: 'TRANSACTION',
      priority: 'NORMAL',
      entityType: 'transaction',
      actionUrl: '/dashboard/transactions',
      actionLabel: 'View Transactions',
      metadata: { amount, currency },
    });
  }

  /**
   * Income Edited Notification
   */
  static async notifyIncomeEdited(userId: string, previousAmount: number, newAmount: number, currency: string) {
    return this.create({
      userId,
      type: 'INCOME_EDITED',
      title: 'Income Updated',
      message: `Income record updated from ${currency} ${previousAmount.toLocaleString()} to ${currency} ${newAmount.toLocaleString()}.`,
      category: 'TRANSACTION',
      priority: 'NORMAL',
      entityType: 'transaction',
      actionUrl: '/dashboard/transactions',
      actionLabel: 'View Transactions',
      metadata: { 
        amount: newAmount, 
        currency, 
        previousValue: previousAmount.toString(), 
        newValue: newAmount.toString() 
      },
    });
  }

  /**
   * Expense Added Notification
   */
  static async notifyExpenseAdded(userId: string, amount: number, currency: string, description?: string, categoryName?: string) {
    return this.create({
      userId,
      type: 'TRANSACTION_ADDED',
      title: 'Expense Recorded',
      message: `New expense of ${currency} ${amount.toLocaleString()}${categoryName ? ` for ${categoryName}` : ''}${description ? `: ${description}` : '.'}`,
      category: 'TRANSACTION',
      priority: 'NORMAL',
      entityType: 'transaction',
      actionUrl: '/dashboard/transactions',
      actionLabel: 'View Transactions',
      metadata: { amount, currency },
    });
  }

  /**
   * Transaction Deleted Notification
   */
  static async notifyTransactionDeleted(userId: string, amount: number, currency: string, type: string, description?: string) {
    return this.create({
      userId,
      type: 'TRANSACTION_ADDED',
      title: `${type === 'income' ? 'Income' : 'Expense'} Deleted`,
      message: `${type === 'income' ? 'Income' : 'Expense'} of ${currency} ${amount.toLocaleString()}${description ? ` (${description})` : ''} has been removed.`,
      category: 'TRANSACTION',
      priority: 'NORMAL',
      entityType: 'transaction',
      actionUrl: '/dashboard/transactions',
      actionLabel: 'View Transactions',
      metadata: { amount, currency },
    });
  }

  /**
   * Vendor Added Notification
   */
  static async notifyVendorAdded(userId: string, vendorName: string, vendorId: string) {
    return this.create({
      userId,
      type: 'VENDOR_ADDED',
      title: 'Vendor Added',
      message: `"${vendorName}" has been added to your vendor list.`,
      category: 'TRANSACTION',
      entityType: 'vendor',
      entityId: vendorId,
      actionUrl: '/dashboard/vendors',
      actionLabel: 'View Vendors',
    });
  }

  /**
   * Vendor Removed Notification
   */
  static async notifyVendorRemoved(userId: string, vendorName: string) {
    return this.create({
      userId,
      type: 'VENDOR_REMOVED',
      title: 'Vendor Removed',
      message: `"${vendorName}" has been removed from your vendor list.`,
      category: 'TRANSACTION',
      entityType: 'vendor',
      actionUrl: '/dashboard/vendors',
      actionLabel: 'View Vendors',
    });
  }

  /**
   * Budget Added Notification
   */
  static async notifyBudgetAdded(userId: string, budgetName: string, amount: number, currency: string, budgetId: string) {
    return this.create({
      userId,
      type: 'BUDGET_ADDED',
      title: 'Budget Created',
      message: `New budget "${budgetName}" created with limit of ${currency} ${amount.toLocaleString()}.`,
      category: 'BUDGET',
      entityType: 'budget',
      entityId: budgetId,
      actionUrl: '/dashboard/budgets',
      actionLabel: 'View Budgets',
      metadata: { amount, currency },
    });
  }

  /**
   * Budget Threshold Warning Notification
   */
  static async notifyBudgetThresholdWarning(userId: string, budgetName: string, percentUsed: number, budgetId: string) {
    return this.create({
      userId,
      type: 'BUDGET_THRESHOLD_WARNING',
      title: 'Budget Alert',
      message: `Warning: "${budgetName}" budget is at ${percentUsed}% usage. Consider reviewing your spending.`,
      category: 'BUDGET',
      priority: 'HIGH',
      entityType: 'budget',
      entityId: budgetId,
      actionUrl: '/dashboard/budgets',
      actionLabel: 'Review Budget',
      metadata: { percentComplete: percentUsed },
    });
  }

  /**
   * Budget Exceeded Notification
   */
  static async notifyBudgetExceeded(userId: string, budgetName: string, percentUsed: number, budgetId: string) {
    return this.create({
      userId,
      type: 'BUDGET_THRESHOLD_EXCEEDED',
      title: 'Budget Exceeded',
      message: `Alert: "${budgetName}" budget has been exceeded! Currently at ${percentUsed}%.`,
      category: 'BUDGET',
      priority: 'URGENT',
      entityType: 'budget',
      entityId: budgetId,
      actionUrl: '/dashboard/budgets',
      actionLabel: 'Review Budget',
      metadata: { percentComplete: percentUsed },
    });
  }

  /**
   * Goal Added Notification
   */
  static async notifyGoalAdded(userId: string, goalName: string, targetAmount: number, currency: string, goalId: string) {
    return this.create({
      userId,
      type: 'GOAL_ADDED',
      title: 'Goal Created',
      message: `New goal "${goalName}" created with target of ${currency} ${targetAmount.toLocaleString()}.`,
      category: 'GOAL',
      entityType: 'goal',
      entityId: goalId,
      actionUrl: '/dashboard/goals',
      actionLabel: 'View Goals',
      metadata: { amount: targetAmount, currency },
    });
  }

  /**
   * Goal Edited Notification
   */
  static async notifyGoalEdited(userId: string, goalName: string, goalId: string) {
    return this.create({
      userId,
      type: 'GOAL_EDITED',
      title: 'Goal Updated',
      message: `Goal "${goalName}" has been updated.`,
      category: 'GOAL',
      entityType: 'goal',
      entityId: goalId,
      actionUrl: '/dashboard/goals',
      actionLabel: 'View Goal',
    });
  }

  /**
   * Goal Progress Milestone Notification
   */
  static async notifyGoalProgress(userId: string, goalName: string, percentComplete: number, goalId: string) {
    let type: 'GOAL_PROGRESS_50' | 'GOAL_PROGRESS_75' | 'GOAL_PROGRESS_100';
    let emoji: string;
    
    if (percentComplete >= 100) {
      type = 'GOAL_PROGRESS_100';
      emoji = '🎉';
    } else if (percentComplete >= 75) {
      type = 'GOAL_PROGRESS_75';
      emoji = '🔥';
    } else {
      type = 'GOAL_PROGRESS_50';
      emoji = '💪';
    }

    const title = percentComplete >= 100 ? 'Goal Achieved!' : `Goal ${percentComplete}% Complete`;
    const message = percentComplete >= 100 
      ? `${emoji} Congratulations! You've reached your goal "${goalName}"!`
      : `${emoji} Great progress! "${goalName}" is now ${percentComplete}% complete.`;

    return this.create({
      userId,
      type,
      title,
      message,
      category: 'GOAL',
      priority: percentComplete >= 100 ? 'HIGH' : 'NORMAL',
      entityType: 'goal',
      entityId: goalId,
      actionUrl: '/dashboard/goals',
      actionLabel: 'View Goal',
      metadata: { percentComplete },
    });
  }

  /**
   * Subscription Added Notification
   */
  static async notifySubscriptionAdded(userId: string, name: string, amount: number, currency: string, frequency: string, subscriptionId: string) {
    return this.create({
      userId,
      type: 'SUBSCRIPTION_ADDED',
      title: 'Subscription Added',
      message: `New ${frequency} subscription "${name}" added at ${currency} ${amount.toLocaleString()}.`,
      category: 'SUBSCRIPTION',
      entityType: 'subscription',
      entityId: subscriptionId,
      actionUrl: '/dashboard/subscriptions',
      actionLabel: 'View Subscriptions',
      metadata: { amount, currency },
    });
  }

  /**
   * Subscription Reminder Notification
   */
  static async notifySubscriptionReminder(userId: string, name: string, amount: number, currency: string, daysUntilDue: number, subscriptionId: string) {
    return this.create({
      userId,
      type: 'SUBSCRIPTION_REMINDER',
      title: 'Subscription Due Soon',
      message: `Reminder: "${name}" (${currency} ${amount.toLocaleString()}) is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}.`,
      category: 'SUBSCRIPTION',
      priority: daysUntilDue <= 1 ? 'HIGH' : 'NORMAL',
      entityType: 'subscription',
      entityId: subscriptionId,
      actionUrl: '/dashboard/subscriptions',
      actionLabel: 'Mark as Paid',
      metadata: { amount, currency, daysUntilDue },
    });
  }

  /**
   * Commitment Added Notification
   */
  static async notifyCommitmentAdded(userId: string, name: string, amount: number, currency: string, commitmentType: string, commitmentId: string) {
    return this.create({
      userId,
      type: 'COMMITMENT_ADDED',
      title: 'Commitment Added',
      message: `New ${commitmentType} commitment "${name}" added at ${currency} ${amount.toLocaleString()}.`,
      category: 'COMMITMENT',
      entityType: 'commitment',
      entityId: commitmentId,
      actionUrl: '/dashboard/commitments',
      actionLabel: 'View Commitments',
      metadata: { amount, currency },
    });
  }

  /**
   * Commitment Reminder Notification
   */
  static async notifyCommitmentReminder(userId: string, name: string, amount: number, currency: string, daysUntilDue: number, commitmentId: string) {
    return this.create({
      userId,
      type: 'COMMITMENT_REMINDER',
      title: 'Commitment Due Soon',
      message: `Reminder: "${name}" (${currency} ${amount.toLocaleString()}) is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}.`,
      category: 'COMMITMENT',
      priority: daysUntilDue <= 1 ? 'HIGH' : 'NORMAL',
      entityType: 'commitment',
      entityId: commitmentId,
      actionUrl: '/dashboard/commitments',
      actionLabel: 'Mark as Paid',
      metadata: { amount, currency, daysUntilDue },
    });
  }

  /**
   * Tax Deduction Added Notification
   */
  static async notifyTaxDeductionAdded(userId: string, category: string, amount: number, currency: string, year: number, deductionId: string) {
    return this.create({
      userId,
      type: 'TAX_DEDUCTION_ADDED',
      title: 'Tax Deduction Recorded',
      message: `New ${category} tax deduction of ${currency} ${amount.toLocaleString()} recorded for YA ${year}.`,
      category: 'TAX',
      entityType: 'tax_deduction',
      entityId: deductionId,
      actionUrl: '/dashboard/tax',
      actionLabel: 'View Tax Records',
      metadata: { amount, currency },
    });
  }

  /**
   * Tax Filing Reminder Notification
   */
  static async notifyTaxFilingReminder(userId: string, daysUntilDeadline: number, year: number) {
    const priority = daysUntilDeadline <= 7 ? 'URGENT' : daysUntilDeadline <= 30 ? 'HIGH' : 'NORMAL';
    
    return this.create({
      userId,
      type: 'TAX_FILING_REMINDER',
      title: 'Tax Filing Reminder',
      message: `Reminder: The tax filing deadline for YA ${year} is in ${daysUntilDeadline} days. Make sure all your deductions are recorded.`,
      category: 'TAX',
      priority,
      actionUrl: '/dashboard/tax',
      actionLabel: 'Review Tax Records',
      metadata: { daysUntilDue: daysUntilDeadline },
    });
  }

  /**
   * Finance Group Created Notification
   */
  static async notifyFinanceGroupCreated(userId: string, groupName: string, groupId: string) {
    return this.create({
      userId,
      type: 'FINANCE_GROUP_CREATED',
      title: 'Workspace Created',
      message: `Finance workspace "${groupName}" has been created successfully.`,
      category: 'FINANCE_GROUP',
      entityType: 'finance_group',
      entityId: groupId,
      actionUrl: '/dashboard/groups',
      actionLabel: 'View Workspace',
    });
  }

  /**
   * Finance Group Invite Notification
   */
  static async notifyFinanceGroupInvite(
    userId: string, 
    groupName: string, 
    inviterName: string, 
    role: string, 
    groupId: string,
    inviterId?: string
  ) {
    return this.create({
      userId,
      type: 'FINANCE_GROUP_INVITE_RECEIVED',
      title: 'Workspace Invitation',
      message: `${inviterName} has invited you to join "${groupName}" as ${role}.`,
      category: 'FINANCE_GROUP',
      priority: 'HIGH',
      entityType: 'finance_group',
      entityId: groupId,
      actionUrl: '/dashboard/groups',
      actionLabel: 'View Invitation',
      triggeredByUserId: inviterId,
      metadata: { changedByName: inviterName },
    });
  }

  /**
   * Finance Group Member Change Notification
   */
  static async notifyFinanceGroupMemberChange(
    userId: string,
    groupName: string,
    action: 'joined' | 'left' | 'updated',
    memberName: string,
    groupId: string,
    actorId?: string
  ) {
    const type = action === 'joined' 
      ? 'FINANCE_GROUP_MEMBER_JOINED' 
      : action === 'left' 
        ? 'FINANCE_GROUP_MEMBER_LEFT' 
        : 'FINANCE_GROUP_MEMBER_CHANGE';
    
    const actionText = action === 'joined' ? 'joined' : action === 'left' ? 'left' : 'updated in';

    return this.create({
      userId,
      type,
      title: 'Workspace Member Update',
      message: `${memberName} has ${actionText} the workspace "${groupName}".`,
      category: 'FINANCE_GROUP',
      entityType: 'finance_group',
      entityId: groupId,
      actionUrl: '/dashboard/groups',
      actionLabel: 'View Workspace',
      triggeredByUserId: actorId,
      metadata: { changedByName: memberName },
    });
  }

  /**
   * Settings Changed Notification
   */
  static async notifySettingsChanged(userId: string, settingName: string, previousValue?: string, newValue?: string) {
    return this.create({
      userId,
      type: 'SETTINGS_CHANGED',
      title: 'Settings Updated',
      message: `Your ${settingName} settings have been updated.`,
      category: 'SETTINGS',
      actionUrl: '/dashboard/settings',
      actionLabel: 'View Settings',
      metadata: { previousValue, newValue },
    });
  }
}

// Export convenience methods
export const createNotification = NotificationService.create.bind(NotificationService);
export const notifyIncomeAdded = NotificationService.notifyIncomeAdded.bind(NotificationService);
export const notifyIncomeEdited = NotificationService.notifyIncomeEdited.bind(NotificationService);
export const notifyExpenseAdded = NotificationService.notifyExpenseAdded.bind(NotificationService);
export const notifyTransactionDeleted = NotificationService.notifyTransactionDeleted.bind(NotificationService);
export const notifyVendorAdded = NotificationService.notifyVendorAdded.bind(NotificationService);
export const notifyVendorRemoved = NotificationService.notifyVendorRemoved.bind(NotificationService);
export const notifyBudgetAdded = NotificationService.notifyBudgetAdded.bind(NotificationService);
export const notifyBudgetThresholdWarning = NotificationService.notifyBudgetThresholdWarning.bind(NotificationService);
export const notifyBudgetExceeded = NotificationService.notifyBudgetExceeded.bind(NotificationService);
export const notifyGoalAdded = NotificationService.notifyGoalAdded.bind(NotificationService);
export const notifyGoalEdited = NotificationService.notifyGoalEdited.bind(NotificationService);
export const notifyGoalProgress = NotificationService.notifyGoalProgress.bind(NotificationService);
export const notifySubscriptionAdded = NotificationService.notifySubscriptionAdded.bind(NotificationService);
export const notifySubscriptionReminder = NotificationService.notifySubscriptionReminder.bind(NotificationService);
export const notifyCommitmentAdded = NotificationService.notifyCommitmentAdded.bind(NotificationService);
export const notifyCommitmentReminder = NotificationService.notifyCommitmentReminder.bind(NotificationService);
export const notifyTaxDeductionAdded = NotificationService.notifyTaxDeductionAdded.bind(NotificationService);
export const notifyTaxFilingReminder = NotificationService.notifyTaxFilingReminder.bind(NotificationService);
export const notifyFinanceGroupCreated = NotificationService.notifyFinanceGroupCreated.bind(NotificationService);
export const notifyFinanceGroupInvite = NotificationService.notifyFinanceGroupInvite.bind(NotificationService);
export const notifyFinanceGroupMemberChange = NotificationService.notifyFinanceGroupMemberChange.bind(NotificationService);
export const notifySettingsChanged = NotificationService.notifySettingsChanged.bind(NotificationService);
