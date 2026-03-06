# CLAUDE.md — n8n Hosting App

## Project Overview

A SaaS platform for deploying and managing self-hosted n8n instances. Users can provision n8n instances on AWS (EC2/ECS) or locally via Docker, manage workflows, API keys, billing, and monitor instance health. Includes RBAC (role-based access control) with global and per-instance permissions, admin panel, email notifications, and Stripe-based billing.

## Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19
- **Language**: TypeScript
- **Database**: MongoDB via Prisma ORM
- **Auth**: NextAuth v4 (credentials + Google + GitHub OAuth)
- **Queue**: BullMQ + ioredis (Redis)
- **Payments**: Stripe (subscriptions + webhooks + payment methods)
- **Infrastructure**: AWS SDK (EC2, CloudFormation, S3, DynamoDB), Docker, Terraform
- **AI**: OpenAI (workflow generation)
- **i18n**: next-intl (en + pt-BR)
- **UI**: Radix UI + Tailwind CSS v4 + shadcn/ui patterns
- **Email**: @react-email/components
- **Testing**: Vitest + Testing Library

## Project Structure

```
app/
  api/                        # API routes (Next.js Route Handlers)
    auth/                     # NextAuth [...nextauth] + registration
    admin/
      clear-queue/            # Queue management
      users/                  # User listing + per-user permissions
        [userId]/
          global-permissions/ # Assign global RBAC permissions
          instance-permissions/ # Assign per-instance permissions
    instances/
      create/                 # Instance creation
      [id]/                   # Instance CRUD (GET/PUT/DELETE)
        api-keys/             # API key management + [keyId] delete
        backup/               # Backup operations
        delete/               # Instance deletion
        executions/           # Workflow execution history
        generate-workflow/    # AI-powered workflow generation
        health/               # Health check endpoint
        logs/                 # Instance logs + stream/ (SSE)
        metrics/              # Instance metrics
        provision/            # Provisioning trigger
        restart/              # Restart instance
        start/                # Start instance
        stop/                 # Stop instance
        workflows/            # Workflow CRUD + [workflowId]
    billing/                  # Billing info + invoices/
    cron/
      process-queue/          # Cron-based queue processing
    stripe/
      checkout/               # Create checkout session
      payment-method/         # Payment method management
      portal/                 # Customer portal redirect
      setup-intent/           # Stripe setup intent creation
      webhook/                # Stripe webhook handler
    user/                     # User profile, password, settings
      profile/
      password/
      settings/
  [locale]/                   # Localized pages (en, pt-BR)
    (auth)/                   # Login, register (public)
    (dashboard)/              # Dashboard layout with sidebar (protected)
      admin/                  # Admin panel (RBAC management)
      billing/                # Billing & subscription management
      dashboard/              # Main dashboard
      profile/                # User profile
      settings/               # User settings
    instances/[id]/           # Instance detail page with tabs
      workflows/              # Workflow management page
    pricing/                  # Pricing page
    page.tsx                  # Landing/home page
lib/
  auth/                       # NextAuth options, session provider, permissions helpers
    permissions.ts            # RBAC permission checks
  database/                   # Prisma client singleton
  docker/                     # Docker provisioner + compose templates
  ec2/                        # AWS EC2 provisioner + size config
  email/                      # Email templates and sending (react-email)
  queue/                      # BullMQ client, jobs, workers
  security/                   # Instance isolation
  stripe/                     # Stripe server + subscription manager
  terraform/                  # Terraform executor + state manager
  utils.ts                    # Shared utilities
  workflow-templates.ts       # Predefined workflow templates
components/                   # Shared UI components
  admin/                      # Admin panel components
    admin-panel.tsx
  billing/                    # Billing components
    subscription-card.tsx
  ui/                         # shadcn/ui primitives
  create-instance-dialog.tsx
  instance-card.tsx
  payment-method-required.tsx
  providers.tsx               # App-level providers wrapper
  user-avatar.tsx
messages/                     # i18n translation files (en.json, pt-BR.json)
types/                        # TypeScript type definitions
  infrastructure.ts
  n8n.ts
  next-auth.d.ts              # NextAuth session type augmentation
i18n/                         # i18n configuration
  config.ts
  navigation.ts
  request.ts
cloudformation/               # AWS CloudFormation templates
  n8n-apprunner.yml
  n8n-ec2-docker.yml
  n8n-infrastructure.yml
prisma/
  schema.prisma               # MongoDB schema
scripts/                      # Admin/utility scripts
  cleanup-orphaned-accounts.ts
  list-users.js
  make-admin.js
  localstack-init.sh
middleware.ts                 # Next.js middleware (i18n routing)
```

## Key Models (Prisma / MongoDB)

- `User` — auth, subscription (embedded), preferences, globalPermissions (RBAC)
- `UserInstancePermission` — per-instance RBAC permissions
- `Instance` — n8n instance with config, AWS resources, access details, monitoring, billing
- `Workflow` — cached n8n workflows (manual, AI-generated, imported, template)
- `ApiKey` — per-instance API keys
- `Deployment`, `Backup`, `Metric`, `InstanceLog`, `Payment`, `ActivityLog`
- `Account`, `Session`, `VerificationToken` — NextAuth models

### Key Enums

- `UserRole` — USER, ADMIN
- `Permission` — RBAC permissions for fine-grained access control
- `InstanceStatus`, `InstanceSize`, `PlanType`, `SubscriptionStatus`
- `DeploymentStatus`, `DeploymentType`, `BackupStatus`, `BackupType`
- `WorkflowSource`, `LogLevel`, `PaymentStatus`

## Development Commands

```bash
npm run dev           # Next.js + BullMQ worker concurrently
npm run dev:local     # Same but with USE_LOCAL_DOCKER=true
npm run build         # Production build
npm run start         # Production server
npm run lint          # ESLint
npm run worker        # Run BullMQ worker standalone

# Database
npm run db:migrate    # prisma migrate dev
npm run db:migrate:prod # prisma migrate deploy (production)
npm run db:push       # prisma db push (schema push, no migration)
npm run db:studio     # Prisma Studio GUI
npm run db:seed       # Seed database
npm run db:generate   # Regenerate Prisma client

# Testing
npm run test                  # Vitest unit tests
npm run test:watch            # Watch mode
npm run test:coverage         # Coverage report
npm run test:integration      # Spin up Docker, run integration tests, tear down
npm run test:all              # Unit + integration

# Docker (n8n instances)
npm run docker:list           # List running n8n containers
npm run docker:cleanup        # Remove all n8n containers and volumes
```

## Environment Variables

Required env vars (set in `.env`):

```
DATABASE_URL               # MongoDB connection string
NEXTAUTH_URL
NEXTAUTH_SECRET

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET

STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

OPENAI_API_KEY             # For AI workflow generation

AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION

REDIS_URL                  # For BullMQ queue

USE_LOCAL_DOCKER           # Set to "true" to provision via Docker instead of AWS
```

## Architecture Patterns

- **Provisioning**: Instances can be provisioned via Docker (local/dev) or AWS EC2/ECS. Controlled by `USE_LOCAL_DOCKER` env var.
- **Queue**: BullMQ workers handle async provisioning jobs (terraform, docker). Worker runs as a separate process alongside Next.js.
- **i18n**: All pages under `app/[locale]/`. Translations in `messages/en.json` and `messages/pt-BR.json`. Default locale: `pt-BR`. Middleware handles locale routing.
- **Auth**: JWT session strategy, 30-day sessions. Session includes `id`, `email`, `name`, `image`, `role`.
- **RBAC**: Two-level permission system — global permissions on User model + per-instance permissions via UserInstancePermission. Permission checks in `lib/auth/permissions.ts`.
- **Billing**: Stripe subscriptions determine instance limits per plan (FREE, STARTER, PROFESSIONAL, ENTERPRISE). Subscription data embedded in `User` model for fast queries. Payment method management via setup intents.
- **Email**: React Email templates for transactional emails (in `lib/email/`).
- **Cron**: Queue processing can be triggered via cron endpoint (`/api/cron/process-queue`).

## Testing Notes

- Unit tests colocated as `__tests__/` subdirectories or `*.test.ts` files alongside source
- Integration tests require Docker Compose (`docker-compose.test.yml`)
- Test config: `vitest.config.ts` (unit), `vitest.config.integration.ts` (integration)

## Important Conventions

- API routes live in `app/api/`, not in `pages/api/`
- All protected pages are under `app/[locale]/(dashboard)/` layout
- Auth pages are under `app/[locale]/(auth)/` layout
- Prisma client is a singleton exported from `lib/database/index.ts`
- Use `lib/auth/index.ts` for auth helpers (e.g., `getServerSession`)
- Queue jobs defined in `lib/queue/jobs.ts`, worker entry at `lib/queue/workers/index.ts`
- Type definitions in `types/` directory, including NextAuth session augmentation
- Admin scripts in `scripts/` for user management (make-admin, list-users, cleanup)
