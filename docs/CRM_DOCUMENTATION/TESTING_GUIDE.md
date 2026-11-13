# BRAND 360s CRM — MANUAL TESTING & VERIFICATION GUIDE

This document provides a complete, structured manual testing checklist with concrete steps, inputs, expected database assertions, and console verification points across every module of BRAND 360s CRM.

---

## Test Execution Matrix

| Test ID | Module | Scenario | Prerequisites | Steps | Expected Result | Verification Check | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | Auth | Admin Login Success | Active admin credentials | 1. Go to `/login`<br>2. Enter admin email and password<br>3. Click Sign In | Redirects to `/dashboard`; sidebar shows all admin items (Employees, Settings). | Check `auth.users` session cookie set. | PASS |
| **AUTH-02** | Auth | Employee Restricted Access | Active employee account | 1. Go to `/login` with employee credentials<br>2. Navigate manually to `/employees` or `/settings` | Middleware catches access attempt and redirects back to `/dashboard`. | Browser URL stays on `/dashboard`. | PASS |
| **AUTH-03** | Auth | Deactivated Account Access | Account with `is_active=false` | 1. Attempt login with deactivated credentials | Login is blocked, session cleared, user redirected to `/login?error=account-deactivated`. | Notice banner shown on login screen. | PASS |
| **CLI-01** | Clients | Create Client with Duplicate Company | Existing client "Brand 360s" | 1. Go to `/clients/new`<br>2. Type "Brand 360s" in Company Name | Duplicate warning banner appears with matched record. | Inspect `checkClientDuplicatesAction` output. | PASS |
| **CLI-02** | Clients | Create New Client Success | Valid new details | 1. Fill all required fields<br>2. Select service "Annual Compliance"<br>3. Enter contract value 50000<br>4. Click Create Client | Client created; redirects to `/clients`; shows `CLI-2026-XXXX`. | Verify row in `clients` and `client_services`. | PASS |
| **CLI-03** | Clients | Financial Column Alignment & Tabular Font | Existing clients with varied amounts | 1. Go to `/clients`<br>2. Inspect Contract Value, Payment Received, Balance Receivable, Next Payment Due | Headers and cells are strictly right-aligned; currency values use tabular numbers. | Verify `text-right font-sans font-number`. | PASS |
| **CLI-04** | Clients | Reassign Salesperson | Admin account | 1. On Clients table, click Reassign (User icon)<br>2. Select another salesperson<br>3. Submit | Salesperson name updates in table without full page refresh; audit log recorded. | Verify `salesperson_id` in `clients` table. | PASS |
| **CLI-05** | Clients | Block Deletion of Client with Financials | Client has an invoice/payment | 1. Click Delete (Trash icon) on client with invoices | Delete modal blocks deletion, displays financial warning, and offers "Archive Client". | Permanent delete button is disabled. | PASS |
| **CLI-06** | Clients | Archive & Restore Client | Active client | 1. Click Archive Client<br>2. Go to "Archived Clients" tab<br>3. Verify client present<br>4. Click Restore | Client moves to Archived tab, then returns to Active tab with all data intact. | Check `client_status` toggles `Archived` / `Active`. | PASS |
| **PAY-01** | Payments | Record Incoming Payment | Existing client | 1. Go to `/payments`<br>2. Click Record Payment<br>3. Enter Amount 50000, UTR "UTR123456", Date, Method<br>4. Save | Payment appears in Transactions table with status `Unallocated`. | Row created in `payments`. | PASS |
| **PAY-02** | Payments | Payment Allocation to Open Invoice | Payment ₹50,000, Invoice ₹80,000 | 1. Click Allocate on payment<br>2. Verify open invoice listed with ₹80,000 balance<br>3. Allocate ₹50,000<br>4. Confirm | Invoice balance becomes ₹30,000 (`Partially Paid`); payment status becomes `Fully Allocated`. | Check `invoice_payment_allocations` row added. | PASS |
| **PAY-03** | Payments | Allocation Exceeding Balance Blocked | Invoice balance ₹30,000 | 1. Attempt to enter ₹40,000 in allocation input | Input validation blocks submission with error message. | No database mutation occurs. | PASS |
| **PAY-04** | Payments | Installment Milestone Creation | Client exists | 1. Go to Payments > Installment Schedules<br>2. Click Create Schedule<br>3. Milestone "Phase 1 Launch", ₹25,000, due in 15 days<br>4. Submit | Schedule card/table displays milestone with `Pending` status. | Row inserted in `payment_schedules`. | PASS |
| **INV-01** | Invoices | Create Tax Invoice with GST | Client exists | 1. Go to `/invoices`<br>2. Click Create Invoice<br>3. Add item: "Web Development", Qty 1, Rate 100000, GST 18%<br>4. Submit | Invoice generated with Subtotal ₹1,00,000, Tax ₹18,000, Total ₹1,18,000, Status `Unpaid`. | Check `invoices` and `invoice_items` in Supabase. | PASS |
| **INV-02** | Invoices | Invoice PDF & Print Preview | Existing invoice | 1. In Invoices table, click Print Preview icon | Clean commercial invoice printable preview renders with brand logo, GST breakdown, and client details. | No layout clipping or overlapping. | PASS |
| **REN-01** | Renewals | Expiring Service Detection | Service expiring within 30 days | 1. Navigate to `/renewals`<br>2. Review upcoming renewals table | Expiring service listed with previous expiry date, client name, and days remaining. | Verify data fetched from `client_services`. | PASS |
| **REN-02** | Renewals | Execute Service Renewal | Expiring service | 1. Click "Renew Service"<br>2. Set new expiry date (1 year later), enter amount ₹60,000<br>3. Confirm | Service expiry extended in `client_services`; permanent renewal record added to `renewals` table. | Inspect `renewals` history table. | PASS |
| **FOL-01** | Follow-ups | Schedule & Complete Follow-up | Active client | 1. Go to `/follow-ups`<br>2. Click Create Follow-up<br>3. Set title "Payment reminder", High priority<br>4. Mark as Completed | Follow-up appears in list, then moves to completed status upon checkmark click. | Check `status='Completed'` in `follow_ups`. | PASS |
| **NOT-01** | Notifications | Scheduled Alert Trigger | Overdue invoice exists | 1. Call scheduled check via `/api/cron/notifications` or background trigger<br>2. Open notification bell | Overdue alert appears in notification dropdown with direct link to invoice. | Check row inserted in `notifications`. | PASS |
| **NOT-02** | Notifications | Mark All As Read | Unread notifications exist | 1. Click Notification Bell<br>2. Click "Mark all as read" | Red badge clears, notification cards update to read state. | Check `is_read=true` in `notifications`. | PASS |

---

## Pre-flight Static Checks
Before executing test scenarios in a local or staging environment:
1. Run `npx tsc --noEmit` — verify zero TypeScript compile errors.
2. Run `npm run build` — verify Next.js production build succeeds with all 21 routes generated.
3. Check browser console — verify no unhandled promise rejections or hydration mismatches.

