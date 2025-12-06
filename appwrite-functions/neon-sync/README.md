# Prismo Neon Sync - Appwrite Function

This Appwrite function connects directly to Neon PostgreSQL using the Neon Serverless Driver, bypassing any intermediate backend. It's designed for scheduled tasks like sending reminders and creating notifications.

## Features

- **Subscription Reminders**: Check for upcoming subscription payments
- **Commitment Reminders**: Check for upcoming bill/loan payments  
- **Budget Alerts**: Check for budget threshold warnings and exceeded budgets
- **Tax Filing Reminders**: LHDN (Malaysia) tax filing deadline notifications
- **Notification Sync**: Create notifications directly in the database

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string (required) |

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/check-subscriptions` | GET | List subscriptions due within reminder period |
| `/check-commitments` | GET | List commitments due within reminder period |
| `/check-budgets?userId=<id>` | GET | Check budget alerts for a user |
| `/check-tax-reminders` | GET | Check LHDN tax filing deadline reminders |
| `/sync-notifications` | GET | Create all reminder notifications |

## Query Parameters

- `userId` (optional): Filter results for a specific user

## Deployment

### 1. Create the Function in Appwrite Console

```bash
# Or use Appwrite CLI
appwrite functions create \
  --functionId prismo-neon-sync \
  --name "Prismo Neon Sync" \
  --runtime node-18.0 \
  --entrypoint index.js \
  --commands "npm install"
```

### 2. Set Environment Variables

In Appwrite Console, add the `DATABASE_URL` variable with your Neon connection string.

### 3. Deploy the Function

```bash
# Using Appwrite CLI
cd appwrite-functions/neon-sync
appwrite functions createDeployment \
  --functionId prismo-neon-sync \
  --entrypoint index.js \
  --commands "npm install" \
  --code .
```

### 4. Create a Schedule (for automated reminders)

Set up a CRON schedule in Appwrite to run the `/sync-notifications` endpoint daily:

```
0 8 * * *   # Run at 8 AM daily
```

## Usage Examples

### Check Subscription Reminders
```bash
curl -X GET "https://your-appwrite.io/v1/functions/prismo-neon-sync/executions" \
  -H "X-Appwrite-Project: your-project-id" \
  -H "X-Appwrite-Key: your-api-key" \
  -d '{"path": "/check-subscriptions"}'
```

### Sync All Notifications
```bash
curl -X GET "https://your-appwrite.io/v1/functions/prismo-neon-sync/executions" \
  -H "X-Appwrite-Project: your-project-id" \
  -H "X-Appwrite-Key: your-api-key" \
  -d '{"path": "/sync-notifications"}'
```

## Response Examples

### Health Check
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T08:00:00.000Z"
}
```

### Sync Notifications
```json
{
  "success": true,
  "summary": {
    "subscriptionReminders": 3,
    "commitmentReminders": 2,
    "taxReminders": 1,
    "notificationsCreated": 6
  }
}
```

## Malaysian Tax Deadlines (LHDN)

The function checks for these deadlines:
- **BE Form (Employment Income)**: April 30
- **B Form (Business Income)**: June 30

Users are reminded based on their `notification_preferences.tax_reminder_days` setting (default: 30 days).

## Security Notes

- The `DATABASE_URL` should be set as an environment variable in Appwrite
- Never expose the database URL in client-side code
- Use Appwrite's built-in authentication for API access
