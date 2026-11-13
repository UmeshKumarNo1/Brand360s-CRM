# BRAND 360s CRM — FUTURE IMPROVEMENTS & STRATEGIC ROADMAP

This roadmap outlines recommended enhancements, architectural evolutions, and new capabilities categorized by priority.

---

## 1. Priority P0 — Critical (Data Integrity & Production Security)

### 1.1 Complete Next.js 16 Proxy Migration
- **Need:** Deprecation warning on `src/middleware.ts`.
- **Solution:** Migrate `src/middleware.ts` to `src/proxy.ts` using the official Next.js codemod.
- **Benefit:** Ensures forward compatibility with future Next.js major releases.

### 1.2 Automated Invoice Generation on Client Onboarding & Service Additions
- **Need:** In the current workflow, invoices must be manually created after onboarding a client unless explicitly selected.
- **Solution:** Wire `autoGenerateInvoiceForClientAction` as a default option during client creation whenever contract value > 0, generating an initial invoice linked directly to the selected service.
- **Benefit:** Eliminates missed billing and unbilled contract delivery.

---

## 2. Priority P1 — Important (Core Workflow & Usability)

### 2.1 Native Server-Side PDF Invoicing via Puppeteer / React-PDF
- **Need:** The current invoice print relies on browser print stylesheets.
- **Solution:** Integrate `@react-pdf/renderer` or server-side headless Chrome generation to produce pixel-perfect, downloadable commercial tax PDFs with digital signature watermarks.
- **Benefit:** Provides professional, standardized tax invoices for clients.

### 2.2 Automated WhatsApp & Email Dispatch for Invoices & Payment Reminders
- **Need:** Salespersons currently copy-paste invoice details manually to send to clients.
- **Solution:** Connect Resend / SendGrid for transactional invoice emailing and WhatsApp Business Cloud API for automated payment milestone reminders 3 days before due dates.
- **Benefit:** Increases collection speed and reduces overdue milestones by 40%.

### 2.3 Sales Incentives & Commission Engine
- **Need:** The `/sales-incentives` page is currently a placeholder.
- **Solution:** Create `sales_commissions` table linking employees to collected payments. Implement configurable commission tiers (e.g., 5% on compliance services, 10% on web development) calculated automatically upon payment allocation.
- **Benefit:** Automates monthly employee payout reporting.

---

## 3. Priority P2 — Enhancement (Operational Productivity)

### 3.1 Global Omnibar Search (`Cmd + K` / `Ctrl + K`)
- **Need:** Users must navigate to specific pages to find clients, invoices, or payments.
- **Solution:** Implement a global command palette modal allowing instant searching across Clients, Invoices, Payments, Employees, and Actions.
- **Benefit:** Accelerates navigation across the CRM.

### 3.2 Bulk Operations Suite
- **Need:** Reassigning or archiving multiple clients currently requires one-by-one actions.
- **Solution:** Add multi-select checkboxes to the Clients table allowing bulk salesperson reassignment, bulk status updates, and bulk reminder scheduling.
- **Benefit:** Saves significant administrative time for managing large client portfolios.

### 3.3 Enhanced Financial Reporting & Cash Flow Forecasting
- **Need:** Executive leadership requires projected cash-inflow forecasts.
- **Solution:** Enhance `/reports` with 30-day, 60-day, and 90-day cash flow projections based on scheduled installment due dates and recurring service renewal expirations.
- **Benefit:** Gives management actionable cash flow visibility.

---

## 4. Priority P3 — Advanced Features (Enterprise Expansion)

### 4.1 Client Self-Service Portal
- **Need:** Clients frequently request invoice copies, payment receipts, and deliverable status updates.
- **Solution:** Add an external client portal (`/portal`) where clients can log in using magic links to view their invoices, download GST receipts, and review renewal schedules.

### 4.2 Multi-Currency & International Tax Handling
- **Need:** Brand 360s operates internationally (e.g., Switzerland, Middle East).
- **Solution:** Support multi-currency billing (INR, USD, EUR, CHF) with real-time exchange rates and international VAT / GST invoice templates.

