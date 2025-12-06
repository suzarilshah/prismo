/**
 * Appwrite Function: Neon Database Sync
 * 
 * This function connects directly to Neon PostgreSQL using the Neon Serverless Driver,
 * bypassing any intermediate backend. It can be used for:
 * - Fetching notification reminders for subscriptions and commitments
 * - Checking budget threshold alerts
 * - Syncing data between Appwrite and Neon
 * - Processing scheduled tasks (e.g., tax filing reminders)
 * 
 * Environment Variables Required:
 * - DATABASE_URL: Neon PostgreSQL connection string
 * 
 * Endpoints:
 * - GET /check-reminders: Check for due subscriptions, commitments, and budget alerts
 * - GET /sync-notifications: Create notifications for upcoming due dates
 * - GET /tax-reminders: Check for tax filing deadline reminders (Malaysia LHDN)
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

// Check for subscription reminders
async function checkSubscriptionReminders(userId) {
  const db = initDatabase();
  
  // Get subscriptions that are due within the user's reminder period
  const query = userId 
    ? db`
      SELECT 
        s.id,
        s.user_id,
        s.name,
        s.amount,
        s.currency,
        s.frequency,
        s.next_billing_date,
        s.reminder_days,
        sp.is_paid,
        np.subscription_reminder_days as custom_reminder_days
      FROM subscriptions s
      LEFT JOIN subscription_payments sp ON s.id = sp.subscription_id 
        AND sp.billing_year = EXTRACT(YEAR FROM CURRENT_DATE)::int
        AND sp.billing_month = EXTRACT(MONTH FROM CURRENT_DATE)::int
      LEFT JOIN notification_preferences np ON s.user_id = np.user_id
      WHERE s.is_active = true 
        AND s.terminated_at IS NULL
        AND (sp.is_paid IS NULL OR sp.is_paid = false)
        AND s.next_billing_date <= CURRENT_DATE + INTERVAL '1 day' * COALESCE(np.subscription_reminder_days, s.reminder_days, 3)
        AND s.user_id = ${userId}
      ORDER BY s.next_billing_date ASC
    `
    : db`
      SELECT 
        s.id,
        s.user_id,
        s.name,
        s.amount,
        s.currency,
        s.frequency,
        s.next_billing_date,
        s.reminder_days,
        sp.is_paid,
        np.subscription_reminder_days as custom_reminder_days
      FROM subscriptions s
      LEFT JOIN subscription_payments sp ON s.id = sp.subscription_id 
        AND sp.billing_year = EXTRACT(YEAR FROM CURRENT_DATE)::int
        AND sp.billing_month = EXTRACT(MONTH FROM CURRENT_DATE)::int
      LEFT JOIN notification_preferences np ON s.user_id = np.user_id
      WHERE s.is_active = true 
        AND s.terminated_at IS NULL
        AND (sp.is_paid IS NULL OR sp.is_paid = false)
        AND s.next_billing_date <= CURRENT_DATE + INTERVAL '1 day' * COALESCE(np.subscription_reminder_days, s.reminder_days, 3)
      ORDER BY s.next_billing_date ASC
    `;
  
  return query;
}

// Check for commitment reminders
async function checkCommitmentReminders(userId) {
  const db = initDatabase();
  
  const query = userId
    ? db`
      SELECT 
        c.id,
        c.user_id,
        c.name,
        c.amount,
        c.currency,
        c.commitment_type,
        c.next_due_date,
        c.reminder_days_before,
        cp.is_paid,
        np.commitment_reminder_days as custom_reminder_days
      FROM commitments c
      LEFT JOIN commitment_payments cp ON c.id = cp.commitment_id 
        AND cp.year = EXTRACT(YEAR FROM CURRENT_DATE)::int
        AND cp.month = EXTRACT(MONTH FROM CURRENT_DATE)::int
      LEFT JOIN notification_preferences np ON c.user_id = np.user_id
      WHERE c.is_active = true 
        AND c.terminated_at IS NULL
        AND (cp.is_paid IS NULL OR cp.is_paid = false)
        AND c.next_due_date <= CURRENT_DATE + INTERVAL '1 day' * COALESCE(np.commitment_reminder_days, c.reminder_days_before, 3)
        AND c.user_id = ${userId}
      ORDER BY c.next_due_date ASC
    `
    : db`
      SELECT 
        c.id,
        c.user_id,
        c.name,
        c.amount,
        c.currency,
        c.commitment_type,
        c.next_due_date,
        c.reminder_days_before,
        cp.is_paid,
        np.commitment_reminder_days as custom_reminder_days
      FROM commitments c
      LEFT JOIN commitment_payments cp ON c.id = cp.commitment_id 
        AND cp.year = EXTRACT(YEAR FROM CURRENT_DATE)::int
        AND cp.month = EXTRACT(MONTH FROM CURRENT_DATE)::int
      LEFT JOIN notification_preferences np ON c.user_id = np.user_id
      WHERE c.is_active = true 
        AND c.terminated_at IS NULL
        AND (cp.is_paid IS NULL OR cp.is_paid = false)
        AND c.next_due_date <= CURRENT_DATE + INTERVAL '1 day' * COALESCE(np.commitment_reminder_days, c.reminder_days_before, 3)
      ORDER BY c.next_due_date ASC
    `;
  
  return query;
}

// Check for budget threshold alerts
async function checkBudgetAlerts(userId) {
  const db = initDatabase();
  
  const budgetAlerts = await db`
    WITH budget_spending AS (
      SELECT 
        b.id,
        b.user_id,
        b.amount as budget_amount,
        b.alert_threshold,
        c.name as category_name,
        COALESCE(SUM(t.amount::decimal), 0) as spent_amount,
        np.budget_warning_threshold,
        np.budget_exceeded_threshold
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id 
        AND t.user_id = b.user_id 
        AND t.type = 'expense'
        AND t.date >= DATE_TRUNC('month', CURRENT_DATE)
        AND t.date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      LEFT JOIN notification_preferences np ON b.user_id = np.user_id
      WHERE b.user_id = ${userId}
      GROUP BY b.id, b.user_id, b.amount, b.alert_threshold, c.name, 
               np.budget_warning_threshold, np.budget_exceeded_threshold
    )
    SELECT 
      id,
      user_id,
      category_name,
      budget_amount,
      spent_amount,
      ROUND((spent_amount / budget_amount::decimal * 100)::numeric, 1) as percent_used,
      alert_threshold,
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

// Check for Malaysian tax filing deadlines (LHDN)
async function checkTaxReminders(userId) {
  const db = initDatabase();
  const currentYear = new Date().getFullYear();
  const currentDate = new Date();
  
  // Malaysian tax filing deadline is typically April 30 for e-filing
  // For BE form (employment income only): April 30
  // For B form (business income): June 30
  const eFilingDeadline = new Date(currentYear, 3, 30); // April 30
  const businessDeadline = new Date(currentYear, 5, 30); // June 30
  
  // Calculate days until deadlines
  const daysUntilEFiling = Math.ceil((eFilingDeadline - currentDate) / (1000 * 60 * 60 * 24));
  const daysUntilBusiness = Math.ceil((businessDeadline - currentDate) / (1000 * 60 * 60 * 24));
  
  // Get users who need reminders
  const usersNeedingReminders = userId
    ? await db`
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        ty.id as tax_year_id,
        ty.filing_status,
        ty.gross_income,
        ty.total_deductions,
        np.tax_reminder_days
      FROM users u
      LEFT JOIN tax_years ty ON u.id = ty.user_id AND ty.year = ${currentYear - 1}
      LEFT JOIN notification_preferences np ON u.id = np.user_id
      WHERE (np.enable_tax = true OR np.enable_tax IS NULL)
        AND u.id = ${userId}
        AND (ty.filing_status IS NULL OR ty.filing_status IN ('draft', 'ready'))
    `
    : await db`
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        ty.id as tax_year_id,
        ty.filing_status,
        ty.gross_income,
        ty.total_deductions,
        np.tax_reminder_days
      FROM users u
      LEFT JOIN tax_years ty ON u.id = ty.user_id AND ty.year = ${currentYear - 1}
      LEFT JOIN notification_preferences np ON u.id = np.user_id
      WHERE (np.enable_tax = true OR np.enable_tax IS NULL)
        AND (ty.filing_status IS NULL OR ty.filing_status IN ('draft', 'ready'))
    `;
  
  const reminders = usersNeedingReminders.map(user => ({
    ...user,
    daysUntilEFilingDeadline: daysUntilEFiling,
    daysUntilBusinessDeadline: daysUntilBusiness,
    taxYear: currentYear - 1,
    shouldRemind: daysUntilEFiling <= (user.tax_reminder_days || 30) && daysUntilEFiling > 0,
  }));
  
  return reminders.filter(r => r.shouldRemind);
}

// Create notifications in the database
async function createNotifications(notifications) {
  const db = initDatabase();
  
  if (notifications.length === 0) return { created: 0 };
  
  const result = await db`
    INSERT INTO notifications (
      user_id, type, title, message, category, priority,
      entity_type, entity_id, action_url, action_label,
      metadata, icon, color
    )
    SELECT * FROM UNNEST(
      ${notifications.map(n => n.userId)}::uuid[],
      ${notifications.map(n => n.type)}::varchar[],
      ${notifications.map(n => n.title)}::varchar[],
      ${notifications.map(n => n.message)}::text[],
      ${notifications.map(n => n.category)}::varchar[],
      ${notifications.map(n => n.priority)}::varchar[],
      ${notifications.map(n => n.entityType)}::varchar[],
      ${notifications.map(n => n.entityId)}::uuid[],
      ${notifications.map(n => n.actionUrl)}::varchar[],
      ${notifications.map(n => n.actionLabel)}::varchar[],
      ${notifications.map(n => JSON.stringify(n.metadata || {}))}::jsonb[],
      ${notifications.map(n => n.icon)}::varchar[],
      ${notifications.map(n => n.color)}::varchar[]
    )
    RETURNING id
  `;
  
  return { created: result.length };
}

// Main handler
export default async function ({ req, res, log, error }) {
  try {
    const { method, path, query } = req;
    const userId = query?.userId || null;
    
    log(`Received ${method} request to ${path}`);
    
    // Health check
    if (path === '/health' || path === '/') {
      return res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }
    
    // Check subscription reminders
    if (path === '/check-subscriptions') {
      const subscriptions = await checkSubscriptionReminders(userId);
      return res.json({
        success: true,
        count: subscriptions.length,
        data: subscriptions,
      });
    }
    
    // Check commitment reminders
    if (path === '/check-commitments') {
      const commitments = await checkCommitmentReminders(userId);
      return res.json({
        success: true,
        count: commitments.length,
        data: commitments,
      });
    }
    
    // Check budget alerts
    if (path === '/check-budgets' && userId) {
      const budgetAlerts = await checkBudgetAlerts(userId);
      return res.json({
        success: true,
        count: budgetAlerts.length,
        data: budgetAlerts,
      });
    }
    
    // Check tax reminders (Malaysia LHDN)
    if (path === '/check-tax-reminders') {
      const taxReminders = await checkTaxReminders(userId);
      return res.json({
        success: true,
        count: taxReminders.length,
        data: taxReminders,
      });
    }
    
    // Sync all reminders and create notifications
    if (path === '/sync-notifications') {
      const subscriptionReminders = await checkSubscriptionReminders(userId);
      const commitmentReminders = await checkCommitmentReminders(userId);
      const taxReminders = await checkTaxReminders(userId);
      
      const notifications = [];
      
      // Create subscription reminder notifications
      for (const sub of subscriptionReminders) {
        const daysUntil = Math.ceil(
          (new Date(sub.next_billing_date) - new Date()) / (1000 * 60 * 60 * 24)
        );
        
        notifications.push({
          userId: sub.user_id,
          type: daysUntil <= 0 ? 'subscription_overdue' : daysUntil === 0 ? 'subscription_due_today' : 'subscription_reminder',
          title: daysUntil <= 0 ? 'Subscription Overdue' : daysUntil === 0 ? 'Subscription Due Today' : 'Subscription Due Soon',
          message: `"${sub.name}" (${sub.currency} ${sub.amount}) is ${daysUntil <= 0 ? 'overdue' : daysUntil === 0 ? 'due today' : `due in ${daysUntil} days`}.`,
          category: 'subscription',
          priority: daysUntil <= 1 ? 'high' : 'normal',
          entityType: 'subscription',
          entityId: sub.id,
          actionUrl: '/dashboard/subscriptions',
          actionLabel: 'Mark as Paid',
          metadata: { amount: parseFloat(sub.amount), currency: sub.currency, daysUntilDue: daysUntil },
          icon: 'CreditCard',
          color: 'purple',
        });
      }
      
      // Create commitment reminder notifications
      for (const comm of commitmentReminders) {
        const daysUntil = Math.ceil(
          (new Date(comm.next_due_date) - new Date()) / (1000 * 60 * 60 * 24)
        );
        
        notifications.push({
          userId: comm.user_id,
          type: daysUntil <= 0 ? 'commitment_overdue' : daysUntil === 0 ? 'commitment_due_today' : 'commitment_reminder',
          title: daysUntil <= 0 ? 'Commitment Overdue' : daysUntil === 0 ? 'Commitment Due Today' : 'Commitment Due Soon',
          message: `"${comm.name}" (${comm.currency} ${comm.amount}) is ${daysUntil <= 0 ? 'overdue' : daysUntil === 0 ? 'due today' : `due in ${daysUntil} days`}.`,
          category: 'commitment',
          priority: daysUntil <= 1 ? 'high' : 'normal',
          entityType: 'commitment',
          entityId: comm.id,
          actionUrl: '/dashboard/commitments',
          actionLabel: 'Mark as Paid',
          metadata: { amount: parseFloat(comm.amount), currency: comm.currency, daysUntilDue: daysUntil },
          icon: 'ClipboardList',
          color: 'cyan',
        });
      }
      
      // Create tax reminder notifications
      for (const tax of taxReminders) {
        notifications.push({
          userId: tax.user_id,
          type: 'tax_filing_reminder',
          title: 'Tax Filing Reminder',
          message: `LHDN tax filing deadline for YA ${tax.taxYear} is in ${tax.daysUntilEFilingDeadline} days (April 30). Make sure all your deductions are recorded.`,
          category: 'tax',
          priority: tax.daysUntilEFilingDeadline <= 7 ? 'urgent' : tax.daysUntilEFilingDeadline <= 14 ? 'high' : 'normal',
          entityType: 'tax_year',
          entityId: tax.tax_year_id,
          actionUrl: '/dashboard/tax',
          actionLabel: 'Review Tax Records',
          metadata: { daysUntilDue: tax.daysUntilEFilingDeadline, taxYear: tax.taxYear },
          icon: 'FileText',
          color: 'orange',
        });
      }
      
      // Insert notifications (in batches if needed)
      let created = 0;
      if (notifications.length > 0) {
        const result = await createNotifications(notifications);
        created = result.created;
      }
      
      return res.json({
        success: true,
        summary: {
          subscriptionReminders: subscriptionReminders.length,
          commitmentReminders: commitmentReminders.length,
          taxReminders: taxReminders.length,
          notificationsCreated: created,
        },
      });
    }
    
    // 404 for unknown paths
    return res.json({ error: 'Not found', path }, 404);
    
  } catch (err) {
    error(`Function error: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
}
