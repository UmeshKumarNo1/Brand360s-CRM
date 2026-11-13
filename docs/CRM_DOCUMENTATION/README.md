# BRAND 360s CRM — SYSTEM ARCHITECTURE & DOCUMENTATION INDEX

## 1. Executive Summary

**BRAND 360s CRM** is a cloud-based client relationship, billing, operations, and renewal management platform built specifically for Brand 360s. The application provides comprehensive client lifecycle tracking—from initial lead intake and service catalog delivery to milestone-based installment billing, automated invoice allocation, service renewal management, and role-based salesperson operations.

- **Frontend & Framework:** Next.js 16.4.6 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend & Database:** Supabase PostgreSQL with Row Level Security (RLS), Supabase Auth (SSR Cookies), Server Actions
- **Icons & UI:** Lucide React, Custom Dark Navy Brand Theme (`#16284F`, `#243E76`, `#0481A2`)
- **Deployment Platform:** Netlify (`https://brand360scrm.netlify.app/`)

---

## 2. Documentation Package Directory

This documentation package contains exhaustive, verified details across every architectural and functional layer of BRAND 360s CRM.

| File | Purpose | Target Audience |
| :--- | :--- | :--- |
| [README.md](./README.md) | High-level system overview, setup instructions, technology stack, and route index. | All Engineers & Administrators |
| [COMPLETE_FEATURE_DOCUMENTATION.md](./COMPLETE_FEATURE_DOCUMENTATION.md) | Exhaustive, section-by-section breakdown of every page, tab, button, modal, form, and data flow. | Product Managers, QA, Engineers |
| [DATABASE_SCHEMA_DOCUMENTATION.md](./DATABASE_SCHEMA_DOCUMENTATION.md) | Complete database reference: 15 tables, schemas, foreign keys, indexes, RLS policies, and RPC functions. | Database Engineers & Backend Developers |
| [USER_GUIDE.md](./USER_GUIDE.md) | Practical, step-by-step operating guide for daily Admin and Salesperson workflows. | End Users, Sales Team, Operations |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Manual test matrix containing 40+ end-to-end test scenarios with prerequisites and expected database assertions. | QA Testers, Lead Developers |
| [ERROR_AND_BUG_REPORT.md](./ERROR_AND_BUG_REPORT.md) | Static code audit, identified bugs, edge-case hazards, stale state risks, and architectural technical debt. | Core Engineering Team |
| [FUTURE_IMPROVEMENTS_ROADMAP.md](./FUTURE_IMPROVEMENTS_ROADMAP.md) | Prioritized feature roadmap categorizing improvements into P0 (Critical), P1 (Important), P2 (Enhancement), and P3 (Advanced). | Engineering & Executive Stakeholders |
| [WORKFLOW_DIAGRAMS.md](./WORKFLOW_DIAGRAMS.md) | Mermaid workflow sequence and state diagrams for Onboarding, Billing, Allocation, Renewals, and Deletion. | System Architects & Developers |
| [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md) | Granular Role-Based Access Control (RBAC) matrix comparing Administrator vs Employee/Salesperson permissions. | Security, Compliance, & HR |
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | Module-by-module feature status matrix classified into Verified, Partially Implemented, and Placeholders. | Project Managers & Stakeholders |
| [TEST_DATA_GUIDE.md](./TEST_DATA_GUIDE.md) | Non-destructive test data kits and manual testing records for clients, payments, invoices, and schedules. | QA Testers & New Developers |

---

## 3. Technology Stack & Environment

### Core Stack
- **Framework:** Next.js 16.4.6 using React 19 and App Router (`src/app/(crm)/*`)
- **Language:** TypeScript 5 with strict compiler settings (`noEmit` verification)
- **Styling:** Tailwind CSS with custom fonts (`font-sans`, `font-number` for tabular figures)
- **Database Engine:** Supabase PostgreSQL 15+
- **Security:** Supabase Row Level Security (RLS) enabled on all public schema tables
- **Authentication:** Supabase Auth via SSR Cookie Session Middleware (`@supabase/ssr`)
- **State Management:** React Server Actions with optimistic UI updates and custom hooks/toasts

### Environment Configuration (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<optional-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-for-admin-operations>
CRON_SECRET=<secret-for-scheduled-notification-endpoint>
```

---

## 4. Application Route Index

### Authentication Routes (Public / Guest)
- `/login` — User authentication portal with email/password and session establishment.
- `/forgot-password` — Password reset request dispatching Supabase recovery links.
- `/reset-password` — Password update form handling token-based credential renewal.
- `/auth/callback` — Server-side OAuth and recovery token exchange endpoint.

### CRM Protected Routes (`src/app/(crm)/*`)
- `/dashboard` — High-level CRM metrics, executive revenue cards, pending tasks, and recent client activity.
- `/clients` — Comprehensive client directory, search, advanced multi-attribute filtering, pagination, and archive/restore tools.
- `/clients/new` — 7-step client onboarding wizard with real-time duplicate checking.
- `/clients/[clientId]` — 5-tab client dossier: Overview, Services & Scope, Payments & Invoices, Follow-ups, and Audit History.
- `/clients/[clientId]/edit` — Full profile modification form for company details, addresses, contacts, and tax info.
- `/payments` — Financial ledger containing Transactions, Installment Schedules, and Invoice Allocations.
- `/invoices` — Official tax invoice ledger, PDF generation preview, manual invoice creation, and payment linking.
- `/renewals` — Contract expiry tracker, renewal fee management, renewal invoicing, and historical audit logs.
- `/follow-ups` — Task and reminder center supporting lead nurturing, overdue payment calls, and contract renewals.
- `/reports` — Analytical reporting suite aggregating financial, employee, client, and renewal metrics.
- `/employees` — *(Admin Only)* User directory, role assignment (`admin` vs `employee`), status toggles, and client assignments.
- `/employees/[employeeId]` — Individual employee performance profile and assigned client roster.
- `/vendors` — Third-party vendor directory managing outsourced service partners.
- `/services` — Master service catalog defining standard offerings and baseline pricing.
- `/notifications` — Central alert inbox categorizing automated system warnings, reminders, and updates.
- `/settings` — *(Admin Only)* Global business configuration, GST percentages, currency formats, and notification triggers.
- `/sales-incentives` — *(UI Placeholder)* Commission and team sales incentive tracking.

---

## 5. Local Setup & Verification

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd brand360s-crm
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Verify Environment Variables:**
   Ensure `.env.local` contains valid Supabase API credentials.
4. **Run Typecheck & Build:**
   ```bash
   npx tsc --noEmit
   npm run build
   ```
5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

