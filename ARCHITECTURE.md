# Prismo Finance - Architecture Documentation

## System Overview

Prismo Finance is a modern, serverless web application built with Next.js 15, leveraging the App Router for optimal performance and developer experience. The application follows a **component-based architecture** with clear separation of concerns.

## Technology Stack

### Frontend Layer
```
┌─────────────────────────────────────────────┐
│           Next.js 15 (App Router)           │
│  ┌───────────┐  ┌──────────┐  ┌──────────┐ │
│  │  React 19 │  │TS 5.x    │  │ Tailwind │ │
│  └───────────┘  └──────────┘  └──────────┘ │
│  ┌───────────┐  ┌──────────┐  ┌──────────┐ │
│  │ TanStack  │  │ Framer   │  │ shadcn/ui│ │
│  │  Query    │  │ Motion   │  │          │ │
│  └───────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────┘
```

### Backend Layer
```
┌─────────────────────────────────────────────┐
│        Next.js API Routes/Actions           │
│  ┌───────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Neon DB   │  │ Drizzle  │  │ Neon Auth│ │
│  │ Postgres  │  │   ORM    │  │   +2FA   │ │
│  └───────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────┘
```

### External Services
```
┌─────────────────────────────────────────────┐
│           External Integrations             │
│  ┌───────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Appwrite  │  │  Azure   │  │  Plaid   │ │
│  │  Storage  │  │Doc Intel │  │   API    │ │
│  └───────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────┘
```

## Architecture Patterns

### 1. Component Architecture

```
app/
├── (auth)/          # Public authentication pages
│   ├── layout.tsx   # Auth-specific layout
│   ├── signin/
│   └── signup/
├── (dashboard)/     # Protected dashboard pages
│   ├── layout.tsx   # Dashboard layout (sidebar, navbar)
│   ├── page.tsx     # Main dashboard
│   ├── transactions/
│   ├── subscriptions/
│   ├── goals/
│   ├── budgets/
│   ├── tax/
│   └── settings/
└── api/             # API routes and server actions
    ├── auth/
    ├── transactions/
    ├── categories/
    └── webhooks/
```

### 2. Data Flow

```
User Interaction
      ↓
React Component
      ↓
TanStack Query (Client State)
      ↓
Server Action / API Route
      ↓
Drizzle ORM (Data Layer)
      ↓
Neon DB (Postgres)
```

### 3. State Management Strategy

**Client State** (TanStack Query)
- User interactions
- Form state
- UI state (modals, drawers)
- Cached API responses

**Server State** (Database)
- User data
- Transactions
- Categories
- Goals/Budgets
- Documents

**Global State** (React Context)
- Theme (light/dark)
- User session
- Notification preferences

## Database Schema Architecture

### Entity Relationship Diagram

```
┌─────────────┐
│    Users    │
└──────┬──────┘
       │
       ├──────────┬──────────┬──────────┬──────────┬──────────┐
       │          │          │          │          │          │
       ↓          ↓          ↓          ↓          ↓          ↓
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Categories│ │Transaction│ │Subscription│ │  Goals  │ │ Budgets │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
       ↓          ↓
┌──────────┐ ┌──────────┐
│ Budgets  │ │Documents │
└──────────┘ └──────────┘
```

### Key Design Decisions

1. **Soft Deletes**: Not implemented initially (can add later)
2. **Audit Trails**: `createdAt` and `updatedAt` on all tables
3. **JSON Columns**: Used for flexible data (tags, OCR data, settings)
4. **Indexes**: On foreign keys and frequently queried columns
5. **Relations**: Managed by Drizzle ORM for type safety

## Security Architecture

### Authentication Flow

```
1. User → Sign Up/Sign In
2. Password hashed with bcrypt
3. Session token generated
4. Optional: 2FA verification
5. JWT stored in httpOnly cookie
6. Protected routes check session
```

### Data Protection

```
┌─────────────────────────────────────────────┐
│          Security Layers                    │
├─────────────────────────────────────────────┤
│ 1. HTTPS/TLS 1.2+ (Transport Security)     │
│ 2. Password Hashing (bcrypt)               │
│ 3. 2FA (TOTP)                              │
│ 4. httpOnly Cookies (XSS Protection)       │
│ 5. CSRF Tokens                             │
│ 6. Rate Limiting                           │
│ 7. Input Validation (Zod)                  │
│ 8. SQL Injection Prevention (Drizzle ORM)  │
│ 9. Row-Level Security (User ID checks)     │
│ 10. PDPA Compliance                        │
└─────────────────────────────────────────────┘
```

## API Design

### REST API Structure

```
/api/
├── auth/
│   ├── signin (POST)
│   ├── signup (POST)
│   ├── signout (POST)
│   └── verify-2fa (POST)
├── transactions/
│   ├── GET    → List transactions (paginated)
│   ├── POST   → Create transaction
│   ├── [id]/
│   │   ├── GET    → Get single transaction
│   │   ├── PATCH  → Update transaction
│   │   └── DELETE → Delete transaction
│   └── import (POST) → Bulk import
├── categories/
│   ├── GET    → List categories
│   ├── POST   → Create category
│   └── [id]/
│       ├── PATCH  → Update category
│       └── DELETE → Delete category
├── subscriptions/
│   ├── GET    → List subscriptions
│   ├── POST   → Create subscription
│   └── [id]/
│       ├── PATCH  → Update subscription
│       └── DELETE → Delete subscription
├── goals/
│   ├── GET    → List goals
│   ├── POST   → Create goal
│   └── [id]/
│       ├── PATCH  → Update goal
│       └── DELETE → Delete goal
├── budgets/
│   ├── GET    → List budgets
│   ├── POST   → Create budget
│   └── [id]/
│       ├── PATCH  → Update budget
│       └── DELETE → Delete budget
├── documents/
│   ├── GET     → List documents
│   ├── POST    → Upload document
│   ├── [id]/
│   │   ├── GET    → Get document
│   │   └── DELETE → Delete document
│   └── ocr (POST) → Process with OCR
├── tax/
│   ├── deductions (GET) → Get tax deductions
│   └── summary (GET) → Get tax summary
└── analytics/
    ├── dashboard (GET) → Dashboard stats
    ├── spending (GET) → Spending analysis
    └── trends (GET) → Trend data
```

### Response Format

All API responses follow this format:

```typescript
{
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

Paginated responses:

```typescript
{
  success: true;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

## Performance Optimizations

### 1. Database Level
- **Connection Pooling**: Neon's built-in pooling
- **Read Replicas**: For scaling read operations
- **Indexes**: On foreign keys and frequently queried columns
- **Query Optimization**: Select only needed columns

### 2. Application Level
- **Server Components**: Default in Next.js App Router
- **Streaming**: For large data sets
- **Parallel Data Fetching**: Multiple queries in parallel
- **React Suspense**: For progressive loading

### 3. Client Level
- **TanStack Query Caching**: Automatic background refetching
- **Code Splitting**: Automatic with Next.js
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: Regular checks for bundle size

### 4. Network Level
- **CDN**: Static assets served via CDN
- **Compression**: gzip/brotli compression
- **HTTP/2**: Multiplexed connections

## Scalability Considerations

### Horizontal Scaling
```
┌─────────────────────────────────────────────┐
│         Load Balancer (Vercel Edge)         │
└──────────┬──────────┬──────────┬────────────┘
           │          │          │
     ┌─────▼────┐ ┌──▼─────┐ ┌──▼─────┐
     │ Instance │ │Instance│ │Instance│
     │    1     │ │   2    │ │   3    │
     └──────────┘ └────────┘ └────────┘
           │          │          │
           └──────────┴──────────┘
                      │
              ┌───────▼────────┐
              │   Neon DB      │
              │ (Auto-scaling) │
              └────────────────┘
```

### Vertical Scaling
- **Neon DB**: Automatic compute scaling
- **Serverless Functions**: Scale to zero when idle
- **Edge Computing**: Vercel Edge Functions for global distribution

## Monitoring & Observability

### Metrics to Track
1. **Performance**
   - Page load times
   - API response times
   - Database query times

2. **Errors**
   - Error rates
   - Error types
   - Stack traces (Sentry)

3. **Business Metrics**
   - User signups
   - Transaction volume
   - Feature usage

4. **Infrastructure**
   - Database connections
   - Memory usage
   - CPU usage

## Deployment Architecture

### Development
```
Local Machine
    ↓
npm run dev
    ↓
Next.js Dev Server (localhost:3000)
    ↓
Neon DB (Development Branch)
```

### Production
```
GitHub Repository
    ↓
Vercel (CI/CD)
    ↓
Build & Deploy
    ↓
Edge Network (Global CDN)
    ↓
Neon DB (Production)
```

## Future Enhancements

### Short Term (3-6 months)
- [ ] Redis caching layer
- [ ] WebSocket for real-time updates
- [ ] GraphQL API option
- [ ] Mobile app (React Native)

### Medium Term (6-12 months)
- [ ] Machine learning for expense categorization
- [ ] Predictive analytics for spending
- [ ] Integration with more Malaysian banks
- [ ] Advanced reporting engine

### Long Term (12+ months)
- [ ] Multi-tenant architecture
- [ ] Micro-services architecture
- [ ] Kubernetes deployment
- [ ] Advanced fraud detection

## Development Guidelines

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended rules
- **Prettier**: Consistent formatting
- **File Naming**: kebab-case for files, PascalCase for components

### Component Guidelines
1. Keep components small and focused
2. Use composition over inheritance
3. Implement proper error boundaries
4. Write accessible components (ARIA)

### Database Guidelines
1. Always use transactions for related operations
2. Use prepared statements (Drizzle handles this)
3. Validate data before database operations
4. Keep queries simple and optimized

### Security Guidelines
1. Never trust user input
2. Validate all data with Zod
3. Use parameterized queries
4. Implement rate limiting
5. Log security events

## Testing Strategy (Future)

### Unit Tests
- Utility functions
- Helper functions
- Validation schemas

### Integration Tests
- API routes
- Database operations
- Authentication flows

### E2E Tests
- Critical user journeys
- Payment flows
- Signup/signin flows

---

**Version**: 1.0.0
**Last Updated**: 2024-11-24
**Maintained By**: Prismo Finance Team
