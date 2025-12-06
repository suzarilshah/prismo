# 🧠 Prismo AI - Advanced RAG Financial Assistant

## Executive Summary

An AI-powered financial advisor that leverages **Agentic Corrective RAG (CRAG)** to provide personalized money-saving suggestions, tax optimization strategies, and spending insights based on user's actual financial data from Neon DB.

**Status:** Beta Feature (Disabled by Default)
**Target:** 100 Billion USD Quality Standards

---

## 🏗️ Architecture Overview

### Advanced RAG Pipeline (Not Naive RAG)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AGENTIC CORRECTIVE RAG PIPELINE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌────────────────┐  │
│  │  User    │───▶│   Query      │───▶│  Intent     │───▶│   Router       │  │
│  │  Query   │    │  Analyzer    │    │  Classifier │    │   Agent        │  │
│  └──────────┘    └──────────────┘    └─────────────┘    └────────────────┘  │
│                                                                │             │
│                         ┌─────────────────────────────────────┘             │
│                         ▼                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      MULTI-SOURCE RETRIEVAL                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ Transaction │  │   Budget    │  │    Tax      │  │   Goals     │  │   │
│  │  │    Data     │  │    Data     │  │    Data     │  │    Data     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │Subscriptions│  │Credit Cards │  │   Income    │  │  Forecasts  │  │   │
│  │  │    Data     │  │    Data     │  │    Data     │  │    Data     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                         │                                                    │
│                         ▼                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    CORRECTIVE RAG (CRAG) LAYER                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  Relevance  │  │  Knowledge  │  │   Query     │  │  Fallback   │  │   │
│  │  │   Grader    │──▶│  Refinement │──▶│  Rewriter  │──▶│   Search    │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                         │                                                    │
│                         ▼                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    GENERATION & VALIDATION                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │   Context   │  │    LLM      │  │ Hallucin.   │  │  Response   │  │   │
│  │  │  Assembler  │──▶│  Generation │──▶│  Checker    │──▶│  Formatter  │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What Makes This "Advanced" (Not Naive)

| Naive RAG | Our Advanced RAG |
|-----------|------------------|
| Single retrieval pass | Multi-stage retrieval with relevance grading |
| No validation | Self-correcting with hallucination detection |
| Static queries | Dynamic query rewriting and expansion |
| Single data source | Multi-source aggregation (8+ data types) |
| Generic context | Intent-aware context assembly |
| No feedback loop | Iterative refinement with CRAG |
| Simple prompts | Agentic reasoning with tool use |

---

## 📊 Database Schema Changes

### New Tables

```sql
-- AI Configuration per user
CREATE TABLE ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Feature Toggle
  ai_enabled BOOLEAN DEFAULT FALSE,
  
  -- AI Foundry Configuration
  provider VARCHAR(50) DEFAULT 'azure_foundry', -- 'azure_foundry', 'openai', 'anthropic'
  model_endpoint TEXT,
  model_name VARCHAR(100),
  api_key_encrypted TEXT, -- AES-256 encrypted
  
  -- Model Settings
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2048,
  
  -- RAG Settings
  enable_crag BOOLEAN DEFAULT TRUE,
  relevance_threshold DECIMAL(3,2) DEFAULT 0.7,
  max_retrieval_docs INTEGER DEFAULT 10,
  enable_web_search_fallback BOOLEAN DEFAULT FALSE,
  
  -- Data Access Permissions
  data_access JSONB DEFAULT '{
    "transactions": true,
    "budgets": true,
    "goals": true,
    "subscriptions": true,
    "creditCards": true,
    "taxData": true,
    "income": true,
    "forecasts": true
  }',
  
  -- Privacy Settings
  anonymize_vendors BOOLEAN DEFAULT FALSE,
  exclude_sensitive_categories JSONB DEFAULT '[]',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- AI Conversation History
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  title VARCHAR(255),
  
  -- Metadata
  total_messages INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Messages
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  
  -- RAG Metadata (for transparency)
  retrieved_data JSONB, -- What data was retrieved
  data_sources JSONB,   -- Which tables were queried
  confidence_score DECIMAL(3,2),
  
  -- Token tracking
  tokens_used INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Insights Cache (precomputed insights)
CREATE TABLE ai_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  insight_type VARCHAR(50) NOT NULL, -- 'tax_savings', 'spending_pattern', 'budget_alert', 'goal_progress'
  insight_data JSONB NOT NULL,
  
  -- Validity
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 UI/UX Design

### 1. Settings Page - AI Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Settings                                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Account] [Preferences] [Notifications] [🤖 AI Assistant (Beta)]           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🧠 AI Financial Assistant                                    BETA   │    │
│  │                                                                      │    │
│  │ Get personalized financial insights, tax optimization tips,         │    │
│  │ and spending recommendations powered by advanced AI.                │    │
│  │                                                                      │    │
│  │ ┌──────────────────────────────────────────────────────────────┐   │    │
│  │ │  Enable AI Assistant                              [  OFF  ]  │   │    │
│  │ └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🔧 AI Model Configuration                                           │    │
│  │                                                                      │    │
│  │ Provider        ┌────────────────────────────────────────────────┐ │    │
│  │                 │ Azure AI Foundry                           ▼   │ │    │
│  │                 └────────────────────────────────────────────────┘ │    │
│  │                                                                      │    │
│  │ Model Endpoint  ┌────────────────────────────────────────────────┐ │    │
│  │                 │ https://your-resource.openai.azure.com/        │ │    │
│  │                 └────────────────────────────────────────────────┘ │    │
│  │                                                                      │    │
│  │ Model Name      ┌────────────────────────────────────────────────┐ │    │
│  │                 │ gpt-4o                                         │ │    │
│  │                 └────────────────────────────────────────────────┘ │    │
│  │                                                                      │    │
│  │ API Key         ┌────────────────────────────────────────────────┐ │    │
│  │                 │ ••••••••••••••••••••••••••              [👁️]   │ │    │
│  │                 └────────────────────────────────────────────────┘ │    │
│  │                                                                      │    │
│  │                              [ Test Connection ]  [ Save ]          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🛡️ Data Privacy                                                     │    │
│  │                                                                      │    │
│  │ The AI can access your financial data to provide personalized       │    │
│  │ insights. Choose what data the AI can analyze:                      │    │
│  │                                                                      │    │
│  │ ☑️ Transactions         ☑️ Budgets           ☑️ Goals               │    │
│  │ ☑️ Subscriptions        ☑️ Credit Cards      ☑️ Tax Data            │    │
│  │ ☑️ Income               ☑️ Forecasts                                │    │
│  │                                                                      │    │
│  │ ☐ Anonymize vendor names in AI responses                            │    │
│  │ ☐ Exclude sensitive categories                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. AI Chat Interface (Floating Panel)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dashboard                                                     [💬 AI]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ... Dashboard content ...                                                   │
│                                                                              │
│                                           ┌─────────────────────────────────┐
│                                           │ 🧠 Prismo AI            [─] [×] │
│                                           ├─────────────────────────────────┤
│                                           │                                 │
│                                           │  ┌─────────────────────────┐   │
│                                           │  │ 🤖 Assistant            │   │
│                                           │  │                         │   │
│                                           │  │ Based on your November  │   │
│                                           │  │ transactions, I found   │   │
│                                           │  │ 3 ways to save money:   │   │
│                                           │  │                         │   │
│                                           │  │ 1. 🏥 Medical expenses  │   │
│                                           │  │    of RM 2,450 qualify  │   │
│                                           │  │    for tax relief       │   │
│                                           │  │                         │   │
│                                           │  │ 2. 📚 Education spend   │   │
│                                           │  │    can save RM 850 in   │   │
│                                           │  │    taxes                │   │
│                                           │  │                         │   │
│                                           │  │ 📊 Data analyzed:       │   │
│                                           │  │ • 47 transactions       │   │
│                                           │  │ • 3 tax categories      │   │
│                                           │  └─────────────────────────┘   │
│                                           │                                 │
│                                           │  ┌─────────────────────────┐   │
│                                           │  │ 👤 You                  │   │
│                                           │  │ How can I maximize my   │   │
│                                           │  │ tax savings this year?  │   │
│                                           │  └─────────────────────────┘   │
│                                           │                                 │
│                                           ├─────────────────────────────────┤
│                                           │ ┌─────────────────────────────┐│
│                                           │ │ Ask about your finances... ││
│                                           │ └─────────────────────────────┘│
│                                           │                          [📤]  │
│                                           └─────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. Suggested Prompts (Quick Actions)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 💡 Suggested Questions                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐     │
│ │ 💰 Tax Optimization │ │ 📊 Spending Review  │ │ 🎯 Goal Progress    │     │
│ │                     │ │                     │ │                     │     │
│ │ "How can I maximize │ │ "Where am I         │ │ "Am I on track for  │     │
│ │  my tax deductions  │ │  overspending this  │ │  my savings goals?" │     │
│ │  this year?"        │ │  month?"            │ │                     │     │
│ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘     │
│                                                                              │
│ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐     │
│ │ 💳 Credit Card      │ │ 🔄 Subscriptions    │ │ 📈 Income Analysis  │     │
│ │                     │ │                     │ │                     │     │
│ │ "Which credit card  │ │ "Which subscriptions│ │ "What's my income   │     │
│ │  should I use more?"│ │  can I cancel?"     │ │  trend looking like?"│    │
│ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Plan

### Phase 1: Foundation (Week 1-2)

#### 1.1 Database Schema
- [ ] Create `ai_settings` table
- [ ] Create `ai_conversations` table
- [ ] Create `ai_messages` table
- [ ] Create `ai_insights_cache` table
- [ ] Add encryption utilities for API keys

#### 1.2 Settings API
- [ ] `GET /api/ai/settings` - Fetch AI configuration
- [ ] `POST /api/ai/settings` - Save AI configuration
- [ ] `POST /api/ai/test-connection` - Test AI provider connection

#### 1.3 Settings UI
- [ ] AI Settings tab in Settings page
- [ ] AI enable/disable toggle
- [ ] Provider configuration form
- [ ] Data access permissions checkboxes
- [ ] Connection test button with feedback

### Phase 2: Data Retrieval Layer (Week 3-4) ✅ COMPLETED

#### 2.1 Data Retrievers ✅
Specialized retrievers created for each data type:

```typescript
// lib/ai/retrievers/index.ts - IMPLEMENTED
- TransactionRetriever    ✅ // Smart filtering by date, category, amount
- BudgetRetriever         ✅ // Current budgets and utilization  
- GoalRetriever           ✅ // Progress and projections
- SubscriptionRetriever   ✅ // Active subscriptions and costs
- CreditCardRetriever     ✅ // Cards, spending, utilization
- TaxRetriever            ✅ // LHDN deductions, PCB, tax relief optimization
- IncomeRetriever         ✅ // Income sources and trends
- ForecastRetriever       ✅ // Spending forecasts with predictions
```

#### 2.2 Query Intent Classification ✅
```typescript
// lib/ai/intent-classifier.ts - IMPLEMENTED
export type QueryIntent = 
  | 'tax_optimization'    // Tax savings, deductions, LHDN relief
  | 'spending_analysis'   // Spending patterns, overspending
  | 'budget_review'       // Budget status, utilization
  | 'goal_progress'       // Goal tracking, projections
  | 'subscription_review' // Subscription audit
  | 'credit_card_advice'  // Card usage, utilization
  | 'income_analysis'     // Income trends, sources
  | 'forecast_review'     // Spending predictions
  | 'comparison'          // Month-over-month, year-over-year
  | 'anomaly_detection'   // Unusual transactions
  | 'general_advice';     // General financial guidance
```

#### 2.3 Context Assembly ✅
```typescript
// lib/ai/context-assembler.ts - IMPLEMENTED
- Multi-retriever orchestration
- Token budget management
- Priority-based retrieval
- Summary generation for efficient LLM context
- Data deduplication and merging
```

### Phase 3: CRAG Pipeline (Week 5-6) ✅ COMPLETED

#### 3.1 Relevance Grader ✅
```typescript
// lib/ai/crag/relevance-grader.ts - IMPLEMENTED
- LLM-based semantic relevance scoring
- Quick heuristic mode for cost savings
- Aggregated grading with threshold detection
- Triggers query rewrite or web search based on scores
```

#### 3.2 Query Rewriter ✅
```typescript
// lib/ai/crag/query-rewriter.ts - IMPLEMENTED
- LLM-based semantic query improvement
- Heuristic fallback for simple queries
- Malaysian financial context expansion
- Query decomposition for complex questions
```

#### 3.3 Hallucination Checker ✅
```typescript
// lib/ai/crag/hallucination-checker.ts - IMPLEMENTED
- 8 hallucination types detected:
  - fabricated_data, wrong_calculation, unsupported_claim
  - temporal_error, entity_confusion, overgeneralization
  - false_comparison, missing_qualification
- Quick validation for obvious issues
- LLM validation for nuanced checking
- Correction suggestions generation
```

#### 3.4 CRAG Orchestrator ✅
```typescript
// lib/ai/crag/orchestrator.ts - IMPLEMENTED
Full pipeline with:
1. Intent Classification
2. Multi-source Data Retrieval
3. Relevance Grading (with retry)
4. Query Rewriting (if needed)
5. Context Assembly
6. Response Generation
7. Hallucination Validation
8. Response Regeneration (if needed)

Metadata tracking: latency, tokens, confidence scores
```

### Phase 4: AI Provider Integration (Week 7) ✅ COMPLETED

#### 4.1 AI Client Abstraction ✅
```typescript
// lib/ai/clients/index.ts - IMPLEMENTED
Supported Providers:
- OpenAIClient (GPT-4, GPT-4o, GPT-3.5-turbo)
- AzureOpenAIClient (Azure AI Foundry deployments)
- AnthropicClient (Claude 3 Opus, Sonnet, Haiku)

Features:
- Streaming support
- Structured JSON output
- Token estimation
- Comprehensive error handling
```

#### 4.2 Secure API Key Storage ✅
```typescript
// lib/ai/security.ts - IMPLEMENTED (Phase 1)
- AES-256-GCM encryption
- Secure key derivation with scrypt
- API key masking for display
```

#### 4.3 System Prompts ✅
```typescript
// lib/ai/prompts/system-prompts.ts - IMPLEMENTED
Specialized prompts for:
- PRISMO_BASE_PROMPT: Core personality & guidelines
- TAX_ADVISOR_PROMPT: LHDN tax optimization
- SPENDING_ANALYST_PROMPT: Spending pattern analysis
- FINANCIAL_COACH_PROMPT: Goal & savings coaching
- CREDIT_CARD_ADVISOR_PROMPT: Card optimization
```

### Phase 5: Chat API (Week 8) ✅ COMPLETED

#### 5.1 Conversation Management ✅
```typescript
// app/api/ai/conversations/route.ts - IMPLEMENTED
POST /api/ai/conversations - Create new conversation
GET /api/ai/conversations - List conversations with pagination

// app/api/ai/conversations/[id]/route.ts - IMPLEMENTED  
GET /api/ai/conversations/[id] - Get conversation with messages
PATCH /api/ai/conversations/[id] - Update (title, archive)
DELETE /api/ai/conversations/[id] - Delete conversation
```

#### 5.2 Chat Endpoint ✅
```typescript
// app/api/ai/chat/route.ts - IMPLEMENTED
POST /api/ai/chat - Full CRAG pipeline with:
- SSE streaming support
- Rate limiting (20 req/min)
- Conversation history management
- Token usage tracking
- Message persistence with RAG metadata
```

#### 5.3 AI Service Layer ✅
```typescript
// lib/ai/service.ts - IMPLEMENTED
Frontend-friendly API service with:
- getAISettings(), updateAISettings()
- testAIConnection()
- getConversations(), createConversation()
- sendMessage(), sendMessageStream()
- SUGGESTED_PROMPTS with categories
```

### Phase 6: Chat UI (Week 9-10) ✅ COMPLETED

#### 6.1 Components ✅
```
components/ai/ - IMPLEMENTED
├── index.ts              # Central exports
├── AIProvider.tsx        # Context + hooks (useAI, useAIChat, etc.)
├── AIChatButton.tsx      # Floating FAB with ⌘K shortcut
├── AIChatPanel.tsx       # Slide-out panel with history sidebar
├── AIChatMessages.tsx    # Auto-scrolling message list
├── AIChatInput.tsx       # Auto-resize textarea + suggestions
├── AIMessageBubble.tsx   # Markdown + streaming + metadata
└── AISettingsForm.tsx    # Full settings configuration

Features:
- Framer Motion animations
- Auto-scroll on new messages
- Streaming cursor animation
- Data sources collapsible section
- Copy message functionality
- Conversation history sidebar
- Keyboard shortcut (⌘K)
- Mobile-responsive design
```

#### 6.2 Streaming Support ✅
```typescript
// SSE streaming implemented in app/api/ai/chat/route.ts
- Real-time token streaming
- Typing indicator before first chunk
- Metadata events (confidence, sources)
- Error handling with graceful fallback
```

---

## 🎯 Feature Capabilities

### 1. Tax Optimization
- Identify tax-deductible expenses
- Calculate potential tax savings
- Suggest LHDN relief categories
- Track PCB vs actual tax liability

### 2. Spending Analysis
- Identify spending patterns
- Find overspending categories
- Compare month-over-month trends
- Highlight unusual transactions

### 3. Budget Recommendations
- Suggest optimal budget allocations
- Alert on budget overruns
- Recommend adjustments based on history

### 4. Subscription Audit
- Identify unused subscriptions
- Calculate total subscription costs
- Suggest consolidation opportunities

### 5. Goal Tracking
- Progress towards financial goals
- Projected completion dates
- Savings rate recommendations

### 6. Credit Card Optimization
- Utilization analysis
- Best card for each category
- Payment due reminders

---

## 🔐 Security Considerations

### API Key Security
- AES-256 encryption at rest
- Keys never logged or exposed in errors
- Secure key rotation support

### Data Privacy
- User controls what data AI can access
- Option to anonymize vendor names
- Exclude sensitive categories
- No data sent to third parties (self-hosted option)

### Rate Limiting
- Per-user rate limits
- Token usage tracking
- Cost alerts for high usage

---

## 📁 File Structure

```
prismo/
├── app/
│   └── api/
│       └── ai/
│           ├── settings/
│           │   └── route.ts
│           ├── chat/
│           │   └── route.ts
│           ├── conversations/
│           │   ├── route.ts
│           │   └── [id]/
│           │       └── route.ts
│           └── test-connection/
│               └── route.ts
├── components/
│   └── ai/
│       ├── AIProvider.tsx
│       ├── AIChatButton.tsx
│       ├── AIChatPanel.tsx
│       ├── AIChatMessages.tsx
│       ├── AIChatInput.tsx
│       ├── AIMessageBubble.tsx
│       ├── AIDataSources.tsx
│       ├── AISuggestedPrompts.tsx
│       └── AISettingsForm.tsx
├── lib/
│   └── ai/
│       ├── clients/
│       │   ├── index.ts
│       │   ├── azure-foundry.ts
│       │   ├── openai.ts
│       │   └── anthropic.ts
│       ├── retrievers/
│       │   ├── index.ts
│       │   ├── transaction-retriever.ts
│       │   ├── budget-retriever.ts
│       │   ├── goal-retriever.ts
│       │   ├── subscription-retriever.ts
│       │   ├── credit-card-retriever.ts
│       │   ├── tax-retriever.ts
│       │   ├── income-retriever.ts
│       │   └── forecast-retriever.ts
│       ├── crag/
│       │   ├── orchestrator.ts
│       │   ├── intent-classifier.ts
│       │   ├── relevance-grader.ts
│       │   ├── query-rewriter.ts
│       │   ├── context-assembler.ts
│       │   └── hallucination-checker.ts
│       ├── prompts/
│       │   ├── system-prompts.ts
│       │   ├── tax-advisor.ts
│       │   ├── spending-analyst.ts
│       │   └── financial-coach.ts
│       └── security.ts
└── db/
    └── schema.ts (updated with AI tables)
```

---

## 🚀 Implementation Priority

### MVP (4 weeks)
1. ✅ Database schema
2. ✅ Settings UI with toggle
3. ✅ Basic chat API (no CRAG)
4. ✅ Chat UI panel
5. ✅ Transaction retriever only

### V1 (8 weeks)
1. ✅ Full CRAG pipeline
2. ✅ All data retrievers
3. ✅ Intent classification
4. ✅ Streaming responses
5. ✅ Conversation history

### V2 (12 weeks)
1. ✅ Proactive insights
2. ✅ Scheduled reports
3. ✅ Multi-language support
4. ✅ Voice input (optional)
5. ✅ Export insights as PDF

---

## 💰 Cost Estimation

| Component | Monthly Cost (Est.) |
|-----------|---------------------|
| Azure AI Foundry (GPT-4o) | $20-50/user |
| Neon DB (existing) | Included |
| Vercel (existing) | Included |

**Cost Controls:**
- Token limits per conversation
- Daily/monthly usage caps
- Caching for common queries

---

## ✅ Success Metrics

- **Response Quality:** >90% helpful ratings
- **Latency:** <3s for first token
- **Accuracy:** <5% hallucination rate
- **Adoption:** >30% of users enable AI
- **Engagement:** >5 queries/user/week

---

## 🎨 Design Tokens

```css
/* AI-specific design tokens */
--ai-gradient: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%);
--ai-bubble-user: var(--muted);
--ai-bubble-assistant: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1));
--ai-thinking-pulse: 0.8s ease-in-out infinite;
```

---

*Plan created: December 2024*
*Last updated: December 2024*
