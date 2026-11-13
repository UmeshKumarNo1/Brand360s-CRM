# BRAND 360s CRM — COMPLETE FEATURE & MODULE DOCUMENTATION

This document provides a complete, exhaustive breakdown of every page, tab, section, form field, button, modal, and data flow implemented across BRAND 360s CRM.

---

## 1. Global Shell & Navigation Architecture

### Top Navbar (`src/components/layout/TopNavbar.tsx`)
- **Breadcrumb Navigation:** Shows the current module path dynamically.
- **Smart Notification Bell (`NotificationBellDropdown.tsx`):**
  - Displays unread notification count badge in vivid red.
  - Clicking opens the slide-over notification panel.
  - Contains category filters: *All*, *Alerts*, *Updates*.
  - Action buttons: "Mark all as read", "Clear read", "View all notifications" (navigates to `/notifications`).
  - Auto-checks scheduled triggers every 15 minutes in the background.
- **User Profile Pill:**
  - Displays user avatar initials, user full name, and role badge (`Administrator` vs `Employee`).
  - Dropdown menu allows one-click Logout (calling `logoutAction`).

### Collapsible Sidebar (`src/components/layout/AppSidebar.tsx`)
- **Header:**
  - Expanded: Full brand logo (`/brand360s-darkmodelogo.svg`).
  - Collapsed: Robot mascot avatar (`/avatar.webp`) and expand chevron (`>`) arranged side-by-side.
- **Navigation Links:**
  - Core Navigation: Dashboard, Clients, Payments, Renewals, Follow-ups, Reports.
  - Admin Only Navigation: Employees, Settings.
- **Footer:** Pinned user account summary with role tag.

---

## 2. Dashboard (`/dashboard`)

### Purpose & Access
- **Purpose:** Executive command center aggregating real-time financial metrics, client acquisition pace, pending operational tasks, and urgent collection alerts.
- **Access:** Administrator and Employee (Salesperson). Employees only see data related to their assigned clients.

### UI Structure & Metric Cards
1. **Total Clients:** Total count of active clients in the CRM.
2. **Total Revenue:** Sum of all recorded and verified payments received to date.
3. **Pending Follow-ups:** Count of open follow-up tasks due today or overdue.
4. **Active Contracts:** Number of active client service contracts currently in delivery.

### Dashboard Sections
- **Revenue & Collections Bar Chart:** Monthly breakdown of revenue generated versus pending collections.
- **Recent Clients Table (`RecentClientsTable.tsx`):** Displays the last 5 registered clients with Company Name, Primary Service, Salesperson, Date of Creation, and Payment Status badge.
- **Urgent Action Center:** Highlights overdue invoices, upcoming service renewals (within 30 days), and unallocated payment balances.
- **Quick Action Buttons:** Direct shortcuts to "Add Client", "Record Payment", and "Create Follow-up".

---

## 3. Client Management (`/clients`, `/clients/new`, `/clients/[clientId]`)

### 3.1 Clients Directory Page (`/clients`)
- **Summary Metric Cards:**
  - *Total Clients:* Overall active portfolio count.
  - *Active Clients:* Clients with active ongoing contracts.
  - *Pending Follow-ups:* Open tasks across the client portfolio.
  - *Total Revenue:* Total payments received across all visible clients.
- **Portfolio Tabs:**
  - *Active Clients Tab:* Shows active, non-archived clients.
  - *Archived Clients Tab:* Shows clients archived for financial/historical preservation.
- **Search & Filtering Bar (`ClientFilters.tsx`):**
  - Search Input: Real-time search by company name, client code, or contact person.
  - Salesperson Dropdown: Filter by assigned employee (Admin only; Employees default to self).
  - Service Category Dropdown: Filter by services purchased (e.g., Annual Compliance, Web Development, Branding).
  - Payment Status Dropdown: Filter by `Paid in full`, `Partially paid`, or `Unpaid`.
  - Reset Filters Button: Restores default search parameters.
- **Client Table (`ClientsTable.tsx`):**
  - **No.:** Serial number (`text-center font-bold`).
  - **Company Name:** Left-aligned company title linking directly to `/clients/[clientId]`. Displays an `Archived` badge if archived.
  - **Date of Creation:** Left-aligned formatted date (`DD MMM YYYY`).
  - **Salesperson:** Left-aligned assigned employee name.
  - **Services Purchased:** Formatted across two lines if multiple services are assigned, retaining punctuation.
  - **Contract Value:** Right-aligned INR currency (`font-number`).
  - **Payment Received:** Right-aligned INR currency (`font-number`).
  - **Balance Receivable:** Right-aligned INR currency (`font-number`).
  - **Next Payment Due:** Right-aligned amount and due date. Displays emerald `Paid in full` badge when balance is 0.
  - **Actions Column:** Center-aligned toolbar with 4 distinct action buttons:
    1. *View (Eye Icon):* Navigates to `/clients/[clientId]`.
    2. *Edit (Pencil Icon):* Navigates to `/clients/[clientId]/edit`.
    3. *Reassign (User Icon):* Opens `ReassignClientModal` to transfer ownership.
    4. *Archive / Delete (Trash Icon):* Opens `DeleteConfirmationModal`. If client has recorded invoices or payments, the system blocks deletion and prompts for archival.

---

### 3.2 Add Client Onboarding Workflow (`/clients/new`)
A comprehensive multi-section form that prevents duplicate client creation:
1. **Company & Primary Contact:** Company name, brand name, primary email, primary phone, secondary phone, website.
2. **Duplicate Detection Engine:** As the user types the Company Name, Phone, or Email, the client triggers `checkClientDuplicatesAction`. If an existing client matches, an alert banner displays the matching record to prevent duplicates.
3. **Address & Tax Details:** Registered business address, city, state, postal code, GSTIN / PAN number.
4. **Salesperson Assignment:** Assigned employee dropdown (defaults to logged-in salesperson).
5. **Initial Services & Contract Terms:** Select from Services Catalog, define custom contract value, billing frequency (one-time, monthly, quarterly, annual), and contract start/end dates.
6. **Automatic Invoice Option:** Checkbox to immediately generate an initial unpaid tax invoice upon creation.
7. **Database Insertion:** Dispatches `createClientAction`, generates unique `client_code` (e.g., `CLI-2026-0001`), inserts `client_services`, and logs creation into `audit_logs`.

---

### 3.3 Client Details Dossier (`/clients/[clientId]`)

#### Tab 1: Overview
- **Financial Status Summary:** Displays Contract Value, Payments Received, Balance Receivable, and Next Due Date in high-contrast stat cards.
- **Company Information Card:** Brand Name, Legal Company Name, Client Code, Date Onboarded, Website, and Client Status.
- **Primary Contact Card:** Contact Person, Email, Mobile Number, and Alternate Phone.
- **Billing & GST Details Card:** Registered Address, State/City, GSTIN, PAN, and Tax Residency status.
- **Ownership & Timeline:** Assigned Salesperson, Last Interaction Date, and Account Created timestamp.

#### Tab 2: Services & Scope (`ClientServicesTab.tsx`)
- Displays all purchased services for the client.
- **Service Attributes:** Service Name, Category, Contract Value, Delivery Status (`Active`, `Completed`, `Pending`, `Cancelled`), Start Date, Expiry Date, and Days Until Renewal.
- **Actions:**
  - *Add Service Modal:* Allows attaching additional services from the catalog or creating ad-hoc custom scopes.
  - *Manage Vendors Modal (`ManageVendorsModal.tsx`):* Assign external outsourcing partners to specific deliverables, tracking vendor payout cost and vendor delivery progress.
  - *Remove Service:* Removes an unbilled service after confirmation.

#### Tab 3: Payments & Invoices (`ClientPaymentsTab.tsx`)
- **Client Ledger Summary:** Displays Total Invoiced, Total Collected, Unallocated Pool, and Balance Due.
- **Client Invoices Sub-table:** Displays all issued tax invoices with Invoice #, Issue Date, Due Date, Total Amount, Paid Amount, Balance, Status, and Action to Allocate or Download PDF.
- **Client Payment Transactions Sub-table:** Lists all recorded payments with Payment Date, Amount, Payment Method, UTR/Reference, Allocation Status, and Allocation actions.
- **Installment Milestones:** Displays planned future installment milestones for this specific client.

#### Tab 4: Follow-ups (`ClientFollowupsTab.tsx`)
- Centralized log of all client touchpoints.
- Lists Pending, In-Progress, and Completed follow-up tasks.
- Quick button to schedule a new call, meeting, payment reminder, or contract renewal discussion.

#### Tab 5: Activity & Audit History (`ClientAuditHistoryTab.tsx`)
- Immutable log of all administrative and operational modifications performed on this client.
- Shows Action Type (Create, Update, Payment Recorded, Service Added, Reassigned, Archived), User Email/Name, IP/User Agent, Timestamp, and Old vs New Value JSON diffs.

---

## 4. Payments, Installments & Allocations (`/payments`)

### 4.1 Executive Financial Cards
1. **Verified Receipts:** Total sum of all verified incoming payments.
2. **Allocated to Invoices:** Amount of collected funds successfully tied to issued invoices.
3. **Unallocated Pool:** Funds collected from clients that have not yet been tied to an invoice.
4. **Total Installments:** Total scheduled milestone receivables.
5. **Upcoming / Due:** Milestone payments due within the next 30 days.
6. **Overdue Milestones:** Milestone payments past their due date without full collection.
7. **Outstanding Balance:** Total accounts receivable across the entire CRM.
8. **Total Transactions:** Count of all payment receipts recorded.

---

### 4.2 Tab 1: Payment Transactions (`PaymentTransactionsTable.tsx`)
- **Record Payment Modal (`RecordPaymentModal.tsx`):**
  - Client selection dropdown.
  - Payment Amount (INR).
  - Payment Date.
  - Payment Method (Bank Transfer / NEFT / RTGS, UPI, Cheque, Cash, Credit Card).
  - Reference / UTR Number (mandatory for electronic transfers).
  - Payment Proof attachment (optional).
  - Internal Notes.
  - Submission invokes `recordPaymentAction` and creates a transaction record.
- **Allocate Payment Modal (`AllocatePaymentModal.tsx`):**
  - Opens when clicking "Allocate" on a payment with unallocated funds.
  - Fetches outstanding invoices matching the client UUID via `fetchClientInvoicesForAllocationAction`.
  - Displays outstanding balance per invoice.
  - Allows distributing payment amount across one or more invoices.
  - Calls PostgreSQL RPC `allocate_payment_to_invoice` which automatically decrements invoice balance, updates invoice status (`Paid` or `Partially Paid`), and updates the payment's allocated status.

---

### 4.3 Tab 2: Installment Schedules (`InstallmentSchedulesTable.tsx`)
- **Purpose:** Manages milestone-based payment plans (e.g., 50% advance, 25% on design approval, 25% on launch).
- **Create Installment Schedule Modal:**
  - Select Client and optionally link an Invoice.
  - Milestone Title (e.g., "Advance Deposit", "Milestone 2 - Development").
  - Due Date.
  - Expected Amount.
- **Collection Workflow:**
  - Displays Expected Amount, Received Amount, Outstanding Balance, and Milestone Status (`Pending`, `Partially Paid`, `Paid`, `Overdue`).
  - Allows collecting or linking payments directly against specific milestones via `reconcile_and_allocate_payment`.

---

### 4.4 Tab 3: Invoice Allocations (`InvoiceAllocationsTable.tsx`)
- Audit ledger of all completed allocation events.
- Shows Invoice Number, Client Name, Payment Reference, Allocation Date, Allocated Amount, and the user who approved the allocation.

---

## 5. Invoice Management (`/invoices`)

### Purpose & Structure
- Complete ledger of all commercial tax invoices issued by Brand 360s.
- **Summary Metrics:** Total Invoiced, Collected Revenue, Pending Collections, Overdue Invoices.
- **Create Invoice Modal (`CreateInvoiceModal.tsx`):**
  - Select Client.
  - Issue Date & Payment Due Date.
  - Invoice Item Rows: Description, Quantity, Unit Price, GST Rate (0%, 5%, 12%, 18%, 28%).
  - Real-time Subtotal, GST Calculation (CGST/SGST or IGST based on client state), and Total Invoice Value.
  - Submits via `createInvoiceAction`, automatically assigning sequential invoice numbering (e.g., `INV-2026-0001`).
- **Invoice Actions:**
  - *Preview / Print:* Generates clean, branded printable invoice sheet.
  - *Download PDF:* Client-ready commercial tax invoice export.
  - *Cancel Invoice:* Cancels an unpaid invoice with mandatory audit cancellation reason.

---

## 6. Service Renewals Management (`/renewals`)

### Purpose & Workflow
- Monitors recurring contracts (e.g., Annual Compliance, Domain & Hosting, Retainers, Social Media Management) expiring within 30, 60, or 90 days.
- **Summary Metrics:** Total Renewals, Upcoming Renewals (Next 30 Days), Due Soon (Next 7 Days), Overdue Renewals, Renewed This Month.
- **Filters:** Status (`Pending`, `In Progress`, `Renewed`, `Cancelled`), Salesperson, Service Category.
- **Renewals Table (`RenewalsTable.tsx`):**
  - Client Name & Service Name.
  - Previous Expiry Date.
  - Renewal Period (Start & End Dates).
  - Renewal Contract Amount.
  - Payment Status & Renewal Status badge.
  - **Action Buttons:**
    - *Renew Service Modal:* Updates service expiry dates, records new renewal contract value, logs renewal history into `renewals` table, and optionally generates an invoice via `processServiceRenewalAction`.
    - *Schedule Renewal Follow-up:* Dispatches a priority follow-up task to the assigned salesperson.

---

## 7. Follow-up & Task Center (`/follow-ups`)

### Purpose & Features
- Centralized CRM task management ensuring timely client communications.
- **Metric Cards:** Total Open Follow-ups, Due Today, Overdue Follow-ups, Completed This Month.
- **Types of Follow-ups:** Payment Reminder, Contract Renewal, General Meeting, Service Review, Client Feedback.
- **Actions:**
  - *Create Follow-up Modal:* Assign client, date/time, priority (`Low`, `Medium`, `High`, `Urgent`), type, and notes.
  - *Complete Follow-up:* Records completion notes and archives task.
  - *Reschedule:* Extends task due date with audit reason.

---

## 8. Reports & Analytics (`/reports`)

### Available Analytical Views
- **Financial Reports:** Gross revenue, monthly billing trends, outstanding accounts receivable, and collection efficiency.
- **Salesperson Performance:** Invoiced value and collected revenue grouped by assigned employee.
- **Client Portfolio Analysis:** Client lifetime value (LTV), service category distribution, and churn risk indicators.
- **Renewal Pipeline:** Projected renewal revenue over the next 12 months.
- **Export Capabilities:** Export to CSV for financial reconciliation.

---

## 9. Employee Management (`/employees`, `/employees/[employeeId]`) — Admin Only

### Purpose & Access Control
- Manage internal CRM users, staff credentials, roles, and client portfolios.
- **Employee Roster Table:** Name, Email, Role (`admin` vs `employee`), Assigned Active Clients, Account Status (`Active` vs `Deactivated`).
- **Create Employee Modal:** Provisions Supabase auth user with auto-generated temporary password and profile record.
- **Status Toggle:** Instantly deactivates an employee account. Middleware blocks deactivated employees from logging in.
- **Employee Profile Page:** Deep-dive into an individual salesperson’s assigned clients, total closed deals, and pending follow-ups.

---

## 10. Vendor & Outsourcing Directory (`/vendors`)

### Purpose & Structure
- Directory of external contractors, white-label agencies, and vendors used for outsourced service fulfillment (e.g., printing vendors, legal compliance associates, freelance developers).
- **Vendor Table:** Vendor Name, Service Category, Contact Person, Phone, Email, Active Outsourced Deliverables count, and Status.
- **Add / Edit Vendor Modal:** Name, category, contact credentials, GST details, and default payment terms.

---

## 11. Master Services Catalog (`/services`)

### Purpose & Catalog Management
- Standard service repository used across Client Onboarding and Service Scope tabs.
- **Catalog Table:** Service Title, Category, Baseline Standard Fee, Description, and Active Status toggle.
- **Add Catalog Item Modal:** Creates new service offerings to streamline client quoting.

---

## 12. Smart Notification & Alert Center (`/notifications`)

### Purpose & Engine
- Full-page notification inbox displaying system-generated alerts.
- **Automated Triggers (via `runScheduledNotificationsCheck`):**
  - Overdue payment milestones and invoices.
  - Upcoming service contract expirations (30 days, 15 days, 7 days prior).
  - High-priority follow-up reminders.
- **Tabs:** All, Alerts, Updates, Read, Unread.
- **Actions:** Mark as Read, Mark All as Read, Delete Notification, Clear Read.

---

## 13. System Settings (`/settings`) — Admin Only

### Configuration Options
- **Company Profile:** Legal business name, business address, support email, phone, website URL.
- **Financial & Tax Settings:** Base currency (`INR - ₹`), Default GST Rate (`18%`), Invoice Number Prefix (`INV-`), Financial Year Format.
- **System Automation Settings:** Automated renewal alert thresholds (days before expiry), installment reminder frequency.
- **Save Configuration:** Updates `crm_settings` table via `updateCrmSettingsAction`.

