# Prismo Finance - Setup Guide

This guide will walk you through setting up the Prismo Finance application from scratch.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)

## Step 1: Environment Setup

### 1.1 Create Neon DB Account

1. Go to [Neon](https://neon.tech) and create a free account
2. Create a new project named "prismo-finance"
3. Copy your connection string (it looks like: `postgresql://user:password@host/database`)

### 1.2 Create Appwrite Account (Optional but Recommended)

1. Go to [Appwrite Cloud](https://cloud.appwrite.io) or self-host
2. Create a new project named "prismo-finance"
3. Create a bucket for document storage
4. Copy your:
   - Endpoint URL
   - Project ID
   - API Key
   - Bucket ID

### 1.3 Create Azure Document Intelligence (Optional)

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a "Form Recognizer" or "Document Intelligence" resource
3. Copy your:
   - Endpoint URL
   - API Key

### 1.4 Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Database (Required)
DATABASE_URL="postgresql://user:password@host/database"

# Neon Auth (Required)
NEON_AUTH_SECRET="your-random-secret-key-here"

# Appwrite (Optional - for receipt storage)
APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
APPWRITE_PROJECT_ID="your-project-id"
APPWRITE_API_KEY="your-api-key"
APPWRITE_BUCKET_ID="your-bucket-id"

# Azure Document Intelligence (Optional - for OCR)
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="your-endpoint"
AZURE_DOCUMENT_INTELLIGENCE_KEY="your-key"

# Plaid (Optional - for bank linking)
PLAID_CLIENT_ID="your-client-id"
PLAID_SECRET="your-secret"
PLAID_ENV="sandbox"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 15
- React 19
- TanStack Query
- Drizzle ORM
- Tailwind CSS
- And many more...

## Step 3: Database Setup

### 3.1 Generate Database Schema

```bash
npm run db:generate
```

This creates migration files in the `drizzle/` folder.

### 3.2 Push Schema to Database

```bash
npm run db:push
```

This applies the schema to your Neon DB database.

### 3.3 Verify Database (Optional)

Open Drizzle Studio to view your database:

```bash
npm run db:studio
```

This opens a web interface at `https://local.drizzle.studio`

## Step 4: Seed Initial Data (Coming Soon)

We'll create a seed script to populate:
- Default categories (Malaysian-specific)
- Tax relief categories
- Sample transactions for demo

```bash
npm run db:seed
```

## Step 5: Start Development Server

```bash
npm run dev
```

Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Step 6: Verify Installation

Check that:
- ✅ Homepage loads correctly
- ✅ No console errors
- ✅ Database connection works
- ✅ All styles load properly

## Project Structure

```
prismo/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (signin, signup)
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── providers.tsx     # Context providers
├── db/                   # Database
│   ├── schema.ts         # Drizzle schema
│   ├── seed-data.ts      # Seed data
│   └── index.ts          # DB client
├── lib/                  # Utilities
│   ├── utils.ts          # Helper functions
│   └── constants.ts      # App constants
├── types/                # TypeScript types
│   └── index.ts          # Type definitions
├── hooks/                # Custom React hooks
├── config/               # Configuration files
├── .env                  # Environment variables
├── .env.example          # Example env file
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── tailwind.config.ts    # Tailwind config
├── next.config.ts        # Next.js config
├── drizzle.config.ts     # Drizzle config
└── README.md             # Documentation
```

## Next Steps

### Phase 1: Authentication
- [ ] Implement user registration
- [ ] Implement user login
- [ ] Add 2FA support
- [ ] Email verification

### Phase 2: Core Features
- [ ] Transaction management (CRUD)
- [ ] Category management
- [ ] Dashboard with charts
- [ ] Budget tracking

### Phase 3: Advanced Features
- [ ] Receipt OCR
- [ ] Tax optimization
- [ ] Subscription tracking
- [ ] Financial goals

### Phase 4: Polish
- [ ] PWA support
- [ ] Dark mode
- [ ] Multi-currency
- [ ] Family sharing

## Common Issues

### Issue: Database connection fails

**Solution:** Check your `DATABASE_URL` in `.env` is correct

```bash
# Test connection
psql "postgresql://user:password@host/database"
```

### Issue: Build fails with type errors

**Solution:** Clear Next.js cache and rebuild

```bash
rm -rf .next
npm run build
```

### Issue: Styles not loading

**Solution:** Make sure Tailwind is configured correctly

```bash
# Verify tailwind.config.ts exists
# Check that globals.css has @tailwind directives
```

### Issue: "Module not found" errors

**Solution:** Re-install dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

## Development Workflow

### Daily Development

1. **Pull latest changes** (if working with team)
   ```bash
   git pull origin main
   ```

2. **Install any new dependencies**
   ```bash
   npm install
   ```

3. **Run database migrations** (if schema changed)
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Start dev server**
   ```bash
   npm run dev
   ```

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code
   - Test locally
   - Check for errors

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

4. **Push to remote**
   ```bash
   git push origin feature/your-feature-name
   ```

### Database Schema Changes

When you modify `db/schema.ts`:

1. **Generate migration**
   ```bash
   npm run db:generate
   ```

2. **Review the migration** in `drizzle/` folder

3. **Apply migration**
   ```bash
   npm run db:push
   ```

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed database (coming soon) |

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Neon Documentation](https://neon.tech/docs)

## Support

If you encounter any issues:

1. Check this setup guide
2. Check the [README.md](README.md)
3. Search existing issues on GitHub
4. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Your environment (OS, Node version, etc.)

## Security Notes

⚠️ **Never commit your `.env` file to version control!**

- `.env` is already in `.gitignore`
- Use `.env.example` as a template
- Store secrets securely (use secret managers in production)

## Production Deployment

When ready to deploy:

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Test the production build**
   ```bash
   npm start
   ```

3. **Deploy to Vercel** (recommended)
   ```bash
   vercel deploy
   ```

4. **Set environment variables** in Vercel dashboard

5. **Run database migrations** on production database

---

**Happy coding! 🚀**
