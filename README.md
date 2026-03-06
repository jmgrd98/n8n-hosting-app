# n8n Hosting App

A SaaS platform for deploying and managing self-hosted [n8n](https://n8n.io) workflow automation instances. Provision n8n instances on AWS (EC2/ECS) or locally via Docker, manage workflows, API keys, billing, and monitor instance health.

## Features

- **Instance Management** — Create, start, stop, restart, and delete n8n instances
- **Dual Provisioning** — AWS EC2/ECS for production, Docker for local development
- **Workflow Management** — Import, create, and manage n8n workflows per instance
- **AI Workflow Generation** — Generate n8n workflows using OpenAI
- **API Key Management** — Create and manage API keys for each instance
- **Billing & Subscriptions** — Stripe-powered plans (Free, Starter, Professional, Enterprise)
- **RBAC** — Role-based access control with global and per-instance permissions
- **Admin Panel** — User management, permission assignment, queue management
- **Health Monitoring** — Instance health checks, metrics, and log streaming (SSE)
- **Internationalization** — English and Brazilian Portuguese (pt-BR)
- **OAuth** — Google and GitHub login alongside credentials auth

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript |
| Database | MongoDB via Prisma ORM |
| Auth | NextAuth v4 (credentials + OAuth) |
| Queue | BullMQ + Redis |
| Payments | Stripe |
| Infrastructure | AWS SDK, Docker, Terraform, CloudFormation |
| AI | OpenAI |
| i18n | next-intl |
| UI | Radix UI, Tailwind CSS v4, shadcn/ui |
| Email | React Email |
| Testing | Vitest, Testing Library |

## Prerequisites

- Node.js 18+
- MongoDB instance
- Redis instance (for BullMQ)
- Docker (for local instance provisioning)
- Stripe account (for billing)
- AWS account (for production provisioning, optional)

## Getting Started

1. **Clone the repository**

```bash
git clone https://github.com/jmgrd98/n8n-hosting-app.git
cd n8n-hosting-app
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy `.env.example` to `.env` and fill in the required values:

```
DATABASE_URL               # MongoDB connection string
NEXTAUTH_URL               # App URL (http://localhost:3000)
NEXTAUTH_SECRET            # Random secret for JWT signing

GOOGLE_CLIENT_ID           # Google OAuth
GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID           # GitHub OAuth
GITHUB_CLIENT_SECRET

STRIPE_SECRET_KEY          # Stripe billing
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

OPENAI_API_KEY             # AI workflow generation

AWS_ACCESS_KEY_ID          # AWS provisioning (optional)
AWS_SECRET_ACCESS_KEY
AWS_REGION

REDIS_URL                  # BullMQ queue

USE_LOCAL_DOCKER=true      # Use Docker instead of AWS
```

4. **Push the database schema**

```bash
npm run db:push
```

5. **Run the development server**

```bash
npm run dev          # Next.js + BullMQ worker
# or
npm run dev:local    # Same with USE_LOCAL_DOCKER=true
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

```bash
# Development
npm run dev               # Start dev server + worker
npm run dev:local         # Start with local Docker provisioning
npm run build             # Production build
npm run start             # Production server
npm run lint              # Run ESLint

# Database
npm run db:push           # Push schema to database
npm run db:migrate        # Run migrations (dev)
npm run db:migrate:prod   # Run migrations (production)
npm run db:studio         # Open Prisma Studio
npm run db:seed           # Seed database
npm run db:generate       # Regenerate Prisma client

# Testing
npm run test              # Run unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npm run test:integration  # Integration tests (requires Docker)
npm run test:all          # All tests

# Docker
npm run docker:list       # List running n8n containers
npm run docker:cleanup    # Remove all n8n containers/volumes
```

## Admin Utilities

```bash
node scripts/make-admin.js           # Promote a user to admin
node scripts/list-users.js           # List all users
npx tsx scripts/cleanup-orphaned-accounts.ts  # Clean up orphaned accounts
```

## Project Structure

```
app/
  api/          API routes (auth, instances, billing, stripe, admin, user)
  [locale]/     Localized pages (en, pt-BR)
lib/            Core logic (auth, database, docker, ec2, queue, stripe, terraform)
components/     Shared React components
messages/       i18n translation files
types/          TypeScript type definitions
prisma/         Database schema
cloudformation/ AWS CloudFormation templates
scripts/        Admin utility scripts
```

See [CLAUDE.md](CLAUDE.md) for detailed project structure and architecture documentation.

## License

Private
