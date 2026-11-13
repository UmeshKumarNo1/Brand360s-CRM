# BRAND 360s CRM — ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS MATRIX

This matrix details the exact privileges granted to **Administrators** versus **Employees (Salespersons)** based on the Next.js middleware, server actions, and Supabase Row Level Security (RLS) policies.

---

## Permission Comparison Matrix

| Functional Capability | Administrator | Employee (Salesperson) | Enforcement Layer | Notes |
| :--- | :---: | :---: | :--- | :--- |
| **Authentication & Profile** |
| Login to CRM | ✅ Full | ✅ Full | Middleware / Supabase Auth | Account must have `is_active=true`. |
| Access Password Reset | ✅ Full | ✅ Full | Supabase Auth | Handled via recovery email tokens. |
| View Own Profile | ✅ Full | ✅ Full | Server Action `getCurrentUserProfileAction` | Accessible to all active users. |
| **Client Management** |
| View All Clients in CRM | ✅ Full | ❌ Restricted | Server Action / RLS | Employees only view clients where `salesperson_id == user.id`. |
| Create New Client | ✅ Full | ✅ Full | Server Action `createClientAction` | Defaults assigned salesperson to logged-in employee. |
| Edit Client Information | ✅ Full | ✅ Assigned Only | Server Action `updateClientAction` | Salespersons can only modify their assigned clients. |
| Reassign Client to Another Employee | ✅ Full | ❌ Blocked | Server Action `reassignClientAction` | Only Admins can transfer client ownership. |
| Archive Client | ✅ Full | ✅ Assigned Only | Server Action `archiveClientAction` | Preserves financial ledger entries. |
| Restore Archived Client | ✅ Full | ✅ Assigned Only | Server Action `restoreClientAction` | Returns client to the active directory. |
| Permanent Delete Client | ✅ Full (No financials) | ❌ Blocked | Server Action `deleteClientAction` | Strictly blocked if client has invoices/payments. |
| Scan Portfolio for Duplicates | ✅ Full | ❌ Blocked | Server Action `scanDatabaseDuplicatesAction` | Admin-only duplicate audit tool. |
| **Services & Vendors** |
| View Services Catalog | ✅ Full | ✅ Full | Server Action `fetchServicesCatalogAction` | Read-only for standard employees. |
| Add/Modify Services Catalog Items | ✅ Full | ❌ Blocked | Server Action `createCatalogServiceAction` | Admin-only catalog curation. |
| Attach Services to Client | ✅ Full | ✅ Assigned Only | Server Action `assignClientServiceAction` | Creates rows in `client_services`. |
| Manage Outsourcing Vendors | ✅ Full | ❌ Blocked | Route Middleware (`/vendors`) | Vendors directory is restricted to Admins. |
| Assign Vendor to Client Deliverable | ✅ Full | ❌ Blocked | Server Action `assignVendorToClientServiceAction` | Admin-only cost and vendor contracting. |
| **Payments & Invoicing** |
| View All Payments | ✅ Full | ❌ Assigned Only | Server Action `fetchPaymentsAction` | Employees only see payments for their clients. |
| Record Incoming Payment | ✅ Full | ✅ Assigned Only | Server Action `recordPaymentAction` | Records receipt into unallocated pool. |
| Allocate Payment to Invoices | ✅ Full | ✅ Assigned Only | RPC `allocate_payment_to_invoice` | Decrements invoice balance atomically. |
| Create Installment Schedules | ✅ Full | ✅ Assigned Only | Server Action `createInstallmentAction` | Sets up milestone payment deadlines. |
| Create Commercial Tax Invoices | ✅ Full | ✅ Assigned Only | Server Action `createInvoiceAction` | Generates sequential invoice numbering. |
| Cancel Unpaid Invoices | ✅ Full | ❌ Blocked | Server Action `cancelInvoiceAction` | Admin-only cancellation with audit reason. |
| Preview & Download Invoice PDF | ✅ Full | ✅ Full | Client Component | Available for all accessible invoices. |
| **Renewals & Follow-ups** |
| View Renewal Pipeline | ✅ Full | ❌ Assigned Only | Server Action `fetchRenewalsAction` | Filtered by assigned salesperson. |
| Execute Service Renewal | ✅ Full | ✅ Assigned Only | Server Action `processServiceRenewalAction` | Updates expiry and logs renewal history. |
| Create & Complete Follow-up Tasks | ✅ Full | ✅ Full | Server Action `followups.ts` | Employees manage their own scheduled tasks. |
| **System Administration** |
| View & Manage Employees (`/employees`) | ✅ Full | ❌ Blocked | Middleware (`src/middleware.ts`) | Direct access redirects employee to `/dashboard`. |
| Create New Employee Account | ✅ Full | ❌ Blocked | Server Action `createEmployeeAction` | Admin provisions user credentials in Supabase. |
| Deactivate Employee Account | ✅ Full | ❌ Blocked | Server Action `toggleEmployeeStatusAction` | Instantly denies login access. |
| View Immutable Audit Logs | ✅ Full | ❌ Blocked | Server Action `fetchClientActivityHistoryAction` | Admin-only security oversight. |
| Modify CRM Global Settings (`/settings`)| ✅ Full | ❌ Blocked | Middleware (`src/middleware.ts`) | Admin-only GST, currency, and company settings. |

