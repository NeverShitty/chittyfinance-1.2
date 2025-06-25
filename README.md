# ChittyFinance 1.2

AI-powered financial management platform powered by ChittyServices.com

## Features

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express + TypeScript + Drizzle ORM + Neon PostgreSQL
- **Authentication**: Clerk
- **Payments**: Stripe integration
- **AI**: OpenAI GPT-4o for financial advice
- **Deployment**: Cloudflare Pages + Workers

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Neon PostgreSQL database
- Clerk account
- Stripe account
- OpenAI API key

### Installation

1. Clone and install dependencies:
```bash
git clone <repo-url>
cd chittyfinance_1.2
npm install
```

2. Set up environment variables:

**Backend** (copy `backend/.env.example` to `backend/.env`):
```env
PORT=3001
FRONTEND_URL=http://localhost:5173
CLERK_SECRET_KEY=your_clerk_secret_key
DATABASE_URL=your_neon_database_url
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
OPENAI_API_KEY=your_openai_api_key
```

**Frontend** (copy `frontend/.env.example` to `frontend/.env`):
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_URL=http://localhost:3001
```

3. Set up database:
```bash
npm run db:push
```

4. Start development servers:
```bash
npm run dev
```

## Deployment

### Cloudflare Deployment

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Deploy backend to Workers:
```bash
npm run deploy:backend
```

4. Deploy frontend to Pages:
```bash
npm run deploy:frontend
```

5. Or deploy everything:
```bash
npm run deploy
```

### Environment Setup

Configure environment variables in Cloudflare dashboard:
- **Workers**: Add secrets for backend API keys
- **Pages**: Add environment variables for frontend

## Architecture

```
chittyfinance_1.2/
├── frontend/          # React + Vite + Tailwind
├── backend/           # Express + TypeScript + Drizzle
├── shared/            # Shared types and utilities
├── wrangler.toml      # Cloudflare Workers config
├── _headers           # Cloudflare Pages headers
└── _redirects         # Cloudflare Pages routing
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/stripe/create-checkout-session` - Create Stripe checkout
- `POST /api/stripe/create-portal-session` - Create billing portal
- `POST /api/stripe/webhook` - Stripe webhooks
- `POST /api/ai/financial-advice` - Get AI financial advice
- `GET /api/ai/chat-history` - Get chat history
- `POST /api/ai/analyze-transaction` - Analyze transactions

## Database Schema

- **users** - User profiles linked to Clerk
- **financial_summaries** - Aggregated financial data
- **transactions** - Financial transactions
- **integrations** - Third-party service connections
- **ai_messages** - AI chat history
- **subscriptions** - Stripe subscription data

## Development

### Database Management

```bash
# Push schema changes
npm run db:push

# Open Drizzle Studio
npm run db:studio
```

### Building

```bash
# Build both frontend and backend
npm run build

# Build individually
npm run build:frontend
npm run build:backend
```

## ChittyServices Integration

This platform is part of the ChittyServices ecosystem, providing AI-powered financial management capabilities. The branding and architecture align with ChittyServices.com standards.

## Support

For support, contact the ChittyServices team or create an issue in the repository.