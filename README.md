# Prismo Finance

> **Premium Financial Management Platform for Malaysia**

A world-class personal finance web application built with Next.js, featuring expense tracking, tax optimization, subscription management, and financial goal setting - all tailored for Malaysian users.

## Features

### Core Features
- **Expense Tracking** - Automatic categorization, beautiful visualizations, and trend analysis
- **Subscription Manager** - Track all recurring commitments (Netflix, car payments, rent, etc.)
- **Malaysian Tax Optimization** - LHDN-compliant tax deduction tracking for YA 2024/2025
- **Financial Goals** - Set, track, and achieve goals with gamification
- **Receipt Scanner** - OCR-powered scanning with 7-year retention for tax purposes
- **Family Sharing** - Role-based access for household financial management
- **Budget Management** - Category-based budgets with smart alerts
- **Multi-Currency Support** - Track expenses in 13+ currencies

### Premium Features
- **AI-Powered Insights** - Personalized recommendations based on spending patterns
- **Financial Health Score** - Real-time scoring with actionable improvement tips
- **Cash Flow Forecasting** - 30-90 day predictions
- **Net Worth Tracking** - Assets, liabilities, and portfolio monitoring
- **Achievement System** - Badges, streaks, and rewards for financial milestones

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **TanStack Query** - Powerful data synchronization
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible components
- **Recharts** - Data visualization
- **Framer Motion** - Smooth animations

### Backend
- **Neon DB** - Serverless Postgres with connection pooling
- **Drizzle ORM** - Type-safe database queries
- **Neon Auth** - Authentication with 2FA support
- **Next.js API Routes** - Serverless API endpoints

### External Services
- **Appwrite** - File storage for receipts/documents
- **Azure Document Intelligence** - OCR for receipt scanning
- **Plaid** (optional) - Bank account linking
- **SendGrid/AWS SES** - Transactional emails

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Neon DB account (free tier available)
- Appwrite account (optional, for document storage)
- Azure account (optional, for OCR)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/prismo-finance.git
   cd prismo-finance
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your credentials:
   - `DATABASE_URL` - Your Neon DB connection string
   - `APPWRITE_*` - Appwrite project credentials
   - `AZURE_*` - Azure Document Intelligence credentials

4. **Generate and run database migrations**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
prismo/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── dashboard/        # Dashboard widgets
│   ├── forms/            # Form components
│   └── providers.tsx     # Context providers
├── db/                   # Database layer
│   ├── schema.ts         # Drizzle schema definitions
│   └── index.ts          # Database client
├── lib/                  # Utility functions
│   ├── utils.ts          # Helper functions
│   ├── validations.ts    # Zod schemas
│   └── constants.ts      # App constants
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── config/               # Configuration files

```

## Database Schema

### Core Tables
- **users** - User accounts with 2FA support
- **categories** - Expense/income categories with tax metadata
- **transactions** - Financial transactions with OCR linking
- **subscriptions** - Recurring commitments and bills
- **goals** - Financial goals with progress tracking
- **budgets** - Category-based budget limits
- **documents** - Receipt/invoice storage metadata
- **taxDeductions** - LHDN tax deduction tracking
- **achievements** - Gamification badges and milestones
- **userSettings** - User preferences and dashboard config

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Malaysian Tax Categories (LHDN YA 2024)

The app supports all major LHDN tax relief categories:

- **Basic Personal Relief**: RM 9,000
- **Medical & Insurance**: Up to RM 19,000
  - Medical/education insurance (RM 3,000)
  - Self medical expenses (RM 8,000)
  - Parents medical expenses (RM 8,000)
- **Education**: Up to RM 17,000
  - Tertiary/postgraduate fees (RM 7,000)
  - Skill development (RM 2,000)
  - SSPN savings (RM 8,000)
- **Lifestyle**: RM 2,500
- **EPF**: RM 4,000
- **Special Equipment**: RM 1,000+

## Security

- **PDPA Compliant** - Full compliance with Malaysian data protection laws
- **Bank-Level Encryption** - TLS 1.2+ for data in transit
- **2FA Authentication** - Optional two-factor authentication
- **SOC 2 Ready** - Following industry security standards
- **Role-Based Access** - Granular permissions for family sharing

## Roadmap

### Phase 1 (Weeks 1-4) ✅ In Progress
- [x] Project setup and infrastructure
- [x] Database schema and migrations
- [x] Authentication with 2FA
- [ ] Expense tracking MVP
- [ ] Basic dashboard

### Phase 2 (Weeks 5-8)
- [ ] Subscription tracking
- [ ] Budget management
- [ ] Financial goals
- [ ] Malaysian tax features

### Phase 3 (Weeks 9-12)
- [ ] Receipt OCR integration
- [ ] Document management
- [ ] Advanced analytics
- [ ] Gamification system

### Phase 4 (Weeks 13-16)
- [ ] Multi-currency support
- [ ] Family sharing
- [ ] AI-powered insights
- [ ] PWA optimization

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

This project is proprietary software. All rights reserved.

## Support

For questions or support, please contact:
- Email: support@prismofinance.com
- Documentation: [https://docs.prismofinance.com](https://docs.prismofinance.com)

---

Built with ❤️ for Malaysia
