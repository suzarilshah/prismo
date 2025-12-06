# Prismo Appwrite Functions

This directory contains serverless functions deployed to Appwrite for the Prismo Finance application.

## Deployed Functions

### 1. `neon-sync` - Neon Database Sync

**Function ID:** `neon-sync`  
**Runtime:** Node.js 18.0  
**Timeout:** 30 seconds

A utility function that connects directly to the Neon PostgreSQL database to fetch reminders, check budget alerts, and create notifications.

#### Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/health` | GET | Health check endpoint |
| `/` | GET | Root health check |
| `/check-subscriptions` | GET | Get subscriptions due within reminder period |
| `/check-commitments` | GET | Get commitments due within reminder period |
| `/check-budgets?userId=<uuid>` | GET | Get budget threshold alerts for a user |
| `/check-tax-reminders` | GET | Get Malaysian LHDN tax filing reminders |
| `/sync-notifications` | GET | Create notifications for all due items |

### 2. `daily-reminder-check` - Daily Reminder Check

**Function ID:** `daily-reminder-check`  
**Runtime:** Node.js 18.0  
**Timeout:** 60 seconds  
**Schedule:** `0 0 * * *` (8 AM Malaysia Time / 00:00 UTC)

A scheduled function that runs daily at 8 AM Malaysia Time to check for:
- Subscription payment reminders
- Commitment due date reminders  
- Budget threshold warnings
- Tax filing deadline reminders (Malaysia LHDN)

#### Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/health` | GET | Health check with schedule info |
| `/test` | GET | Dry run - checks but doesn't create notifications |
| `/` | GET | Full execution - checks and creates notifications |

## Environment Variables

Both functions require the following environment variable set in Appwrite:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |

## CRON Schedule

The `daily-reminder-check` function is scheduled to run at **8:00 AM Malaysia Time**.

**Important:** Appwrite schedules run in **UTC**. Since Malaysia is UTC+8:
- 8 AM Malaysia = 00:00 UTC
- CRON expression: `0 0 * * *`

| CRON | UTC Time | Malaysia Time |
|------|----------|---------------|
| `0 0 * * *` | 00:00 (Midnight) | 08:00 (8 AM) |
| `0 8 * * *` | 08:00 | 16:00 (4 PM) |

## Deployment

### Prerequisites

1. Install Appwrite CLI: `npm install -g appwrite-cli`
2. Configure credentials in `.env` file

### Deploy Commands

```bash
# Configure CLI with API key
APPWRITE_API_KEY=$(grep APPWRITE_API_KEY .env | cut -d'=' -f2 | tr -d '"')
appwrite client --endpoint "https://syd.cloud.appwrite.io/v1" --project-id "prismo" --key "$APPWRITE_API_KEY"

# Push neon-sync function
appwrite push function --function-id "neon-sync"

# Push daily-reminder-check function
appwrite push function --function-id "daily-reminder-check"

# Push all functions at once
appwrite push function
```

### Test Deployed Functions

```bash
# Test neon-sync health
appwrite functions create-execution --function-id "neon-sync" --xpath "/health"

# Test daily-reminder-check (dry run)
appwrite functions create-execution --function-id "daily-reminder-check" --xpath "/test"

# Test sync-notifications
appwrite functions create-execution --function-id "neon-sync" --xpath "/sync-notifications"
```

## Testing

Run the comprehensive test suite:

```bash
node appwrite-functions/test-functions.js
```

This tests:
- Environment configuration
- `neon-sync` function endpoints
- `daily-reminder-check` function endpoints
- Scheduled trigger simulation

## Project Structure

```
appwrite-functions/
├── README.md                    # This file
├── test-functions.js            # Comprehensive test suite
├── neon-sync/
│   ├── index.js                 # Main function code
│   ├── package.json             # Dependencies
│   └── README.md                # Function-specific docs
└── daily-reminder-check/
    ├── index.js                 # Scheduled check function
    └── package.json             # Dependencies
```

## Notification Types Created

| Type | Category | Priority | Trigger |
|------|----------|----------|---------|
| `subscription_due_today` | subscription | high | Due date is today |
| `subscription_reminder` | subscription | normal | Due within reminder days |
| `commitment_due_today` | commitment | high | Due date is today |
| `commitment_reminder` | commitment | normal | Due within reminder days |
| `budget_exceeded` | budget | urgent | Spending > 100% of budget |
| `budget_warning` | budget | high | Spending > 80% of budget |
| `tax_filing_reminder` | tax | varies | Before LHDN deadline |

## Database Tables Used

- `users` - User information
- `subscriptions` - Active subscriptions
- `subscription_payments` - Payment tracking per billing cycle
- `commitments` - Financial commitments
- `commitment_payments` - Commitment payment tracking
- `budgets` - User budgets
- `categories` - Expense categories
- `transactions` - Transaction records
- `notification_preferences` - User notification settings
- `notifications` - Generated notifications
- `tax_years` - Tax filing records

## Monitoring

View function logs in the Appwrite Console:
1. Go to **Functions** → Select function
2. Click **Executions** tab
3. View individual execution logs and errors

## Troubleshooting

### Common Issues

1. **"column np.enable_email does not exist"**
   - The column name is `email_enabled`, not `enable_email`
   - Check schema.ts for correct column names

2. **"syntax error at or near '$1'"**
   - Neon template literals don't support empty placeholders
   - Use conditional queries instead of inline conditionals

3. **Function not triggering on schedule**
   - Verify the CRON expression is correct
   - Check that the function is enabled
   - Ensure the schedule is in UTC time
