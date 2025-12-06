/**
 * Appwrite Function: Daily Reminder Check
 * 
 * Scheduled to run at 8 AM Malaysia Time (00:00 UTC) via CRON: "0 0 * * *"
 * 
 * This function performs daily checks for:
 * - Subscription payment reminders
 * - Commitment due date reminders
 * - Budget threshold warnings
 * - Tax filing deadline reminders (Malaysia LHDN)
 * 
 * Environment Variables Required:
 * - DATABASE_URL: Neon PostgreSQL connection string
 */

import { neon } from '@neondatabase/serverless';

// Initialize Neon client
let sql;

function initDatabase() {
  if (!sql) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    sql = neon(databaseUrl);
  }
  return sql;
}

/**
 * Get all active users who have notifications enabled
 */
async function getActiveUsers() {
  const db = initDatabase();
  
  const users = await db`
    SELECT DISTINCT u.id, u.name, u.email
    FROM users u
    LEFT JOIN notification_preferences np ON u.id = np.user_id
    WHERE np.id IS NULL 
       OR (np.email_enabled = true OR np.push_enabled = true)
  `;
  
  return users;
}

/**
 * Check for subscriptions due within reminder period
 */
async function checkSubscriptionReminders() {
  const db = initDatabase();
  
  const subscriptions = await db`
    SELECT 
      s.id,
      s.user_id,
      s.name,
      s.amount,
      s.currency,
      s.frequency,
      s.next_billing_date,
      s.reminder_days,
      u.email,
      u.name as user_name,
      np.subscription_reminder_days as custom_reminder_days,
      np.email_enabled,
      np.push_enabled
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN subscription_payments sp ON s.id = sp.subscription_id 
      AND sp.billing_year = EXTRACT(YEAR FROM CURRENT_DATE)::int
      AND sp.billing_month = EXTRACT(MONTH FROM CURRENT_DATE)::int
    LEFT JOIN notification_preferences np ON s.user_id = np.user_id
    WHERE s.is_active = true 
      AND s.terminated_at IS NULL
      AND (sp.is_paid IS NULL OR sp.is_paid = false)
      AND s.next_billing_date <= CURRENT_DATE + INTERVAL '1 day' * COALESCE(np.subscription_reminder_days, s.reminder_days, 3)
      AND s.next_billing_date >= CURRENT_DATE
    ORDER BY s.next_billing_date ASC
  `;
  
  return subscriptions;
}

/**
 * Check for commitments due within reminder period
 */
async function checkCommitmentReminders() {
  const db = initDatabase();
  
  const commitments = await db`
    SELECT 
      c.id,
      c.user_id,
      c.name,
      c.amount,
      c.currency,
      c.commitment_type,
      c.next_due_date,
      c.reminder_days_before,
      u.email,
      u.name as user_name,
      np.commitment_reminder_days as custom_reminder_days,
      np.email_enabled,
      np.push_enabled
    FROM commitments c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN commitment_payments cp ON c.id = cp.commitment_id 
      AND cp.year = EXTRACT(YEAR FROM CURRENT_DATE)::int
      AND cp.month = EXTRACT(MONTH FROM CURRENT_DATE)::int
    LEFT JOIN notification_preferences np ON c.user_id = np.user_id
    WHERE c.is_active = true 
      AND c.terminated_at IS NULL
      AND (cp.is_paid IS NULL OR cp.is_paid = false)
      AND c.next_due_date <= CURRENT_DATE + INTERVAL '1 day' * COALESCE(np.commitment_reminder_days, c.reminder_days_before, 3)
      AND c.next_due_date >= CURRENT_DATE
    ORDER BY c.next_due_date ASC
  `;
  
  return commitments;
}

/**
 * Check for budget threshold warnings
 */
async function checkBudgetAlerts() {
  const db = initDatabase();
  
  const budgetAlerts = await db`
    WITH budget_spending AS (
      SELECT 
        b.id,
        b.user_id,
        b.amount as budget_amount,
        b.alert_threshold,
        c.name as category_name,
        u.email,
        u.name as user_name,
        COALESCE(SUM(t.amount::decimal), 0) as spent_amount,
        np.budget_warning_threshold,
        np.budget_exceeded_threshold,
        np.email_enabled,
        np.push_enabled
      FROM budgets b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id 
        AND t.user_id = b.user_id 
        AND t.type = 'expense'
        AND t.date >= DATE_TRUNC('month', CURRENT_DATE)
        AND t.date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      LEFT JOIN notification_preferences np ON b.user_id = np.user_id
      GROUP BY b.id, b.user_id, b.amount, b.alert_threshold, c.name, u.email, u.name,
               np.budget_warning_threshold, np.budget_exceeded_threshold, np.email_enabled, np.push_enabled
    )
    SELECT 
      id,
      user_id,
      email,
      user_name,
      category_name,
      budget_amount,
      spent_amount,
      ROUND((spent_amount / budget_amount::decimal * 100)::numeric, 1) as percent_used,
      alert_threshold,
      email_enabled,
      push_enabled,
      CASE 
        WHEN (spent_amount / budget_amount::decimal * 100) >= COALESCE(budget_exceeded_threshold, 100) THEN 'exceeded'
        WHEN (spent_amount / budget_amount::decimal * 100) >= COALESCE(budget_warning_threshold, alert_threshold, 80) THEN 'warning'
        ELSE 'ok'
      END as alert_status
    FROM budget_spending
    WHERE (spent_amount / budget_amount::decimal * 100) >= COALESCE(budget_warning_threshold, alert_threshold, 80)
  `;
  
  return budgetAlerts;
}

/**
 * Check for Malaysian tax filing deadlines (LHDN)
 */
async function checkTaxReminders() {
  const db = initDatabase();
  const currentYear = new Date().getFullYear();
  const currentDate = new Date();
  
  // Malaysian tax filing deadlines
  const eFilingDeadline = new Date(currentYear, 3, 30); // April 30 - BE form
  const businessDeadline = new Date(currentYear, 5, 30); // June 30 - B form
  
  const daysUntilEFiling = Math.ceil((eFilingDeadline - currentDate) / (1000 * 60 * 60 * 24));
  const daysUntilBusiness = Math.ceil((businessDeadline - currentDate) / (1000 * 60 * 60 * 24));
  
  // Only check if within 60 days of deadline
  if (daysUntilEFiling > 60 && daysUntilBusiness > 60) {
    return [];
  }
  
  const usersNeedingReminders = await db`
    SELECT 
      u.id as user_id,
      u.name,
      u.email,
      ty.id as tax_year_id,
      ty.filing_status,
      ty.gross_income,
      ty.total_deductions,
      np.tax_reminder_days,
      np.email_enabled,
      np.push_enabled
    FROM users u
    LEFT JOIN tax_years ty ON u.id = ty.user_id AND ty.year = ${currentYear - 1}
    LEFT JOIN notification_preferences np ON u.id = np.user_id
    WHERE (np.enable_tax = true OR np.enable_tax IS NULL)
      AND (ty.filing_status IS NULL OR ty.filing_status IN ('draft', 'ready'))
  `;
  
  return usersNeedingReminders.map(user => ({
    ...user,
    daysUntilEFilingDeadline: daysUntilEFiling,
    daysUntilBusinessDeadline: daysUntilBusiness,
    taxYear: currentYear - 1,
    shouldRemind: daysUntilEFiling <= (user.tax_reminder_days || 30) && daysUntilEFiling > 0,
  })).filter(r => r.shouldRemind);
}

/**
 * Create notifications in the database
 */
async function createNotifications(notifications) {
  const db = initDatabase();
  
  if (notifications.length === 0) return { created: 0 };
  
  // Check for existing notifications to avoid duplicates (within last 24 hours)
  const existingNotifications = await db`
    SELECT user_id, entity_type, entity_id 
    FROM notifications 
    WHERE created_at >= NOW() - INTERVAL '24 hours'
      AND (user_id, entity_type, entity_id) IN (
        SELECT * FROM UNNEST(
          ${notifications.map(n => n.userId)}::uuid[],
          ${notifications.map(n => n.entityType)}::varchar[],
          ${notifications.map(n => n.entityId)}::uuid[]
        )
      )
  `;
  
  const existingSet = new Set(
    existingNotifications.map(n => `${n.user_id}-${n.entity_type}-${n.entity_id}`)
  );
  
  // Filter out duplicates
  const newNotifications = notifications.filter(
    n => !existingSet.has(`${n.userId}-${n.entityType}-${n.entityId}`)
  );
  
  if (newNotifications.length === 0) return { created: 0, skipped: notifications.length };
  
  const result = await db`
    INSERT INTO notifications (
      user_id, type, title, message, category, priority,
      entity_type, entity_id, action_url, action_label,
      metadata, icon, color
    )
    SELECT * FROM UNNEST(
      ${newNotifications.map(n => n.userId)}::uuid[],
      ${newNotifications.map(n => n.type)}::varchar[],
      ${newNotifications.map(n => n.title)}::varchar[],
      ${newNotifications.map(n => n.message)}::text[],
      ${newNotifications.map(n => n.category)}::varchar[],
      ${newNotifications.map(n => n.priority)}::varchar[],
      ${newNotifications.map(n => n.entityType)}::varchar[],
      ${newNotifications.map(n => n.entityId)}::uuid[],
      ${newNotifications.map(n => n.actionUrl)}::varchar[],
      ${newNotifications.map(n => n.actionLabel)}::varchar[],
      ${newNotifications.map(n => JSON.stringify(n.metadata || {}))}::jsonb[],
      ${newNotifications.map(n => n.icon)}::varchar[],
      ${newNotifications.map(n => n.color)}::varchar[]
    )
    RETURNING id
  `;
  
  return { 
    created: result.length, 
    skipped: notifications.length - newNotifications.length 
  };
}

/**
 * Log execution to audit table
 */
async function logExecution(summary, trigger) {
  const db = initDatabase();
  
  try {
    await db`
      INSERT INTO function_execution_logs (
        function_name, trigger_type, execution_time, summary, status
      ) VALUES (
        'daily-reminder-check',
        ${trigger},
        NOW(),
        ${JSON.stringify(summary)},
        'success'
      )
    `;
  } catch (err) {
    // Table might not exist, that's okay
    console.log('Could not log execution (table may not exist):', err.message);
  }
}

/**
 * Main handler
 */
export default async function ({ req, res, log, error }) {
  const startTime = Date.now();
  const trigger = req.headers['x-appwrite-trigger'] || 'http';
  
  log(`Daily Reminder Check started - Trigger: ${trigger}`);
  log(`Execution time: ${new Date().toISOString()}`);
  
  try {
    // Health check endpoint
    if (req.path === '/health') {
      return res.json({
        status: 'ok',
        function: 'daily-reminder-check',
        schedule: '0 0 * * * (8 AM Malaysia Time)',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Manual test endpoint
    if (req.path === '/test') {
      log('Running in test mode - will only check, not create notifications');
      
      const subscriptions = await checkSubscriptionReminders();
      const commitments = await checkCommitmentReminders();
      const budgets = await checkBudgetAlerts();
      const taxReminders = await checkTaxReminders();
      
      return res.json({
        success: true,
        mode: 'test',
        checks: {
          subscriptionsDue: subscriptions.length,
          commitmentsDue: commitments.length,
          budgetAlerts: budgets.length,
          taxReminders: taxReminders.length,
        },
        data: {
          subscriptions: subscriptions.slice(0, 5),
          commitments: commitments.slice(0, 5),
          budgets: budgets.slice(0, 5),
          taxReminders: taxReminders.slice(0, 5),
        },
        executionMs: Date.now() - startTime,
      });
    }
    
    // Main execution (scheduled or manual trigger)
    log('Checking subscription reminders...');
    const subscriptions = await checkSubscriptionReminders();
    log(`Found ${subscriptions.length} subscriptions needing reminders`);
    
    log('Checking commitment reminders...');
    const commitments = await checkCommitmentReminders();
    log(`Found ${commitments.length} commitments needing reminders`);
    
    log('Checking budget alerts...');
    const budgets = await checkBudgetAlerts();
    log(`Found ${budgets.length} budget alerts`);
    
    log('Checking tax filing reminders...');
    const taxReminders = await checkTaxReminders();
    log(`Found ${taxReminders.length} tax reminders`);
    
    // Build notifications array
    const notifications = [];
    
    // Subscription notifications
    for (const sub of subscriptions) {
      const daysUntil = Math.ceil(
        (new Date(sub.next_billing_date) - new Date()) / (1000 * 60 * 60 * 24)
      );
      
      notifications.push({
        userId: sub.user_id,
        type: daysUntil === 0 ? 'subscription_due_today' : 'subscription_reminder',
        title: daysUntil === 0 ? '💳 Subscription Due Today' : '💳 Subscription Due Soon',
        message: `"${sub.name}" (${sub.currency} ${sub.amount}) is ${daysUntil === 0 ? 'due today' : `due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}.`,
        category: 'subscription',
        priority: daysUntil <= 1 ? 'high' : 'normal',
        entityType: 'subscription',
        entityId: sub.id,
        actionUrl: '/dashboard/subscriptions',
        actionLabel: 'Mark as Paid',
        metadata: { 
          amount: parseFloat(sub.amount), 
          currency: sub.currency, 
          daysUntilDue: daysUntil,
          subscriptionName: sub.name,
        },
        icon: 'CreditCard',
        color: 'purple',
      });
    }
    
    // Commitment notifications
    for (const comm of commitments) {
      const daysUntil = Math.ceil(
        (new Date(comm.next_due_date) - new Date()) / (1000 * 60 * 60 * 24)
      );
      
      notifications.push({
        userId: comm.user_id,
        type: daysUntil === 0 ? 'commitment_due_today' : 'commitment_reminder',
        title: daysUntil === 0 ? '📋 Commitment Due Today' : '📋 Commitment Due Soon',
        message: `"${comm.name}" (${comm.currency} ${comm.amount}) is ${daysUntil === 0 ? 'due today' : `due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}.`,
        category: 'commitment',
        priority: daysUntil <= 1 ? 'high' : 'normal',
        entityType: 'commitment',
        entityId: comm.id,
        actionUrl: '/dashboard/commitments',
        actionLabel: 'Mark as Paid',
        metadata: { 
          amount: parseFloat(comm.amount), 
          currency: comm.currency, 
          daysUntilDue: daysUntil,
          commitmentName: comm.name,
          commitmentType: comm.commitment_type,
        },
        icon: 'ClipboardList',
        color: 'cyan',
      });
    }
    
    // Budget alert notifications
    for (const budget of budgets) {
      notifications.push({
        userId: budget.user_id,
        type: budget.alert_status === 'exceeded' ? 'budget_exceeded' : 'budget_warning',
        title: budget.alert_status === 'exceeded' ? '🚨 Budget Exceeded' : '⚠️ Budget Warning',
        message: `${budget.category_name}: You've spent ${budget.percent_used}% of your budget (${budget.spent_amount}/${budget.budget_amount}).`,
        category: 'budget',
        priority: budget.alert_status === 'exceeded' ? 'urgent' : 'high',
        entityType: 'budget',
        entityId: budget.id,
        actionUrl: '/dashboard/budgets',
        actionLabel: 'Review Budget',
        metadata: { 
          percentUsed: parseFloat(budget.percent_used), 
          spentAmount: parseFloat(budget.spent_amount),
          budgetAmount: parseFloat(budget.budget_amount),
          categoryName: budget.category_name,
        },
        icon: 'PieChart',
        color: budget.alert_status === 'exceeded' ? 'red' : 'yellow',
      });
    }
    
    // Tax reminder notifications
    for (const tax of taxReminders) {
      notifications.push({
        userId: tax.user_id,
        type: 'tax_filing_reminder',
        title: '📝 Tax Filing Reminder',
        message: `LHDN tax filing for YA ${tax.taxYear} is due in ${tax.daysUntilEFilingDeadline} days (April 30). Review your deductions now.`,
        category: 'tax',
        priority: tax.daysUntilEFilingDeadline <= 7 ? 'urgent' : tax.daysUntilEFilingDeadline <= 14 ? 'high' : 'normal',
        entityType: 'tax_year',
        entityId: tax.tax_year_id,
        actionUrl: '/dashboard/tax',
        actionLabel: 'Review Tax Records',
        metadata: { 
          daysUntilDue: tax.daysUntilEFilingDeadline, 
          taxYear: tax.taxYear,
          filingStatus: tax.filing_status,
        },
        icon: 'FileText',
        color: 'orange',
      });
    }
    
    // Create notifications in database
    log(`Creating ${notifications.length} notifications...`);
    const createResult = await createNotifications(notifications);
    log(`Created ${createResult.created} notifications, skipped ${createResult.skipped || 0} duplicates`);
    
    const summary = {
      trigger,
      executionTime: new Date().toISOString(),
      checks: {
        subscriptionReminders: subscriptions.length,
        commitmentReminders: commitments.length,
        budgetAlerts: budgets.length,
        taxReminders: taxReminders.length,
      },
      notifications: {
        total: notifications.length,
        created: createResult.created,
        skipped: createResult.skipped || 0,
      },
      executionMs: Date.now() - startTime,
    };
    
    // Log execution
    await logExecution(summary, trigger);
    
    log(`Daily Reminder Check completed in ${summary.executionMs}ms`);
    
    return res.json({
      success: true,
      ...summary,
    });
    
  } catch (err) {
    error(`Function error: ${err.message}`);
    error(err.stack);
    
    return res.json({
      success: false,
      error: err.message,
      executionMs: Date.now() - startTime,
    }, 500);
  }
}
