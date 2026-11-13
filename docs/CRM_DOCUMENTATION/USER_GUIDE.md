# BRAND 360s CRM — USER OPERATING GUIDE

This guide provides step-by-step instructions for everyday operations in BRAND 360s CRM for Administrators and Salespersons.

---

## 1. Authentication & Navigation

### Logging In
1. Navigate to `/login`.
2. Enter your work email and password.
3. Click **Sign In to Dashboard**.
4. If your credentials are valid and your account is active, you will be redirected to `/dashboard`.
5. *Note:* If an account is deactivated by an Administrator, login is blocked and an `account-deactivated` notice is displayed.

### Password Reset
1. From the login screen, click **Forgot password?**.
2. Enter your registered email address and submit.
3. A secure recovery link will be sent to your inbox.
4. Clicking the link takes you to `/reset-password` where you can set a new password.

---

## 2. Managing Clients

### 2.1 How to Onboard a New Client
1. From the sidebar, click **Clients** (`/clients`).
2. Click the blue **Add Client** button in the upper right.
3. Fill in the **Company Details**:
   - Company Name (as you type, the duplicate checker alerts you if this business already exists).
   - Brand Name (optional).
   - Primary Contact Person, Email, and Phone number.
4. Complete the **Address & Tax** section:
   - Registered business address, City, State, PIN code.
   - GSTIN and PAN (if registered for GST).
5. Set **Contract Terms & Services**:
   - Assign the Salesperson (Admin can assign any team member; Salespersons default to themselves).
   - Select services from the Services Catalog.
   - Enter Contract Value (INR).
   - Choose Billing Frequency (e.g., Annual, Monthly, One-Time).
   - Select Contract Start Date and End/Expiry Date.
6. *(Optional)* Check **Generate Initial Unpaid Invoice** if you want the system to prepare a tax invoice immediately upon creation.
7. Click **Create Client**. The client is created, assigned a permanent code (`CLI-2026-XXXX`), and appears in the Clients directory.

### 2.2 How to Search & Filter Clients
- Use the **Search bar** to find clients by company name or contact person.
- Filter by **Salesperson** (Admin only) to review individual employee portfolios.
- Filter by **Service Category** (e.g., Annual Compliance, Web Development).
- Filter by **Payment Status** (`Paid in full`, `Partially paid`, `Unpaid`).
- Click **Reset Filters** to clear all active search criteria.

### 2.3 How to Reassign a Client to Another Salesperson (Admin Only)
1. On the Clients table, locate the target client.
2. In the **Actions** column, click the **User Icon** (Reassign).
3. Select the new Salesperson from the dropdown list.
4. Click **Confirm Reassignment**.
5. The client’s ownership is transferred immediately, updating all dashboard metrics and logging an audit event.

### 2.4 How to Archive or Delete a Client
- Click the **Trash Icon** in the Actions column.
- **Financial Protection Rule:** If the client has recorded invoices or payment transactions, permanent deletion is **blocked** to protect financial records. The system will prompt you to **Archive** the client instead.
- Archived clients are moved to the **Archived Clients** tab, preserving all ledger entries while keeping the active directory clean.
- To reactivate an archived client, switch to the **Archived Clients** tab and click **Restore**.

---

## 3. Managing Payments & Invoices

### 3.1 How to Record an Incoming Payment
1. Navigate to **Payments** (`/payments`) from the sidebar.
2. In the Transactions tab, click **Record Payment**.
3. Select the **Client** from the dropdown.
4. Enter the **Payment Amount** (in ₹).
5. Select the **Payment Date** and **Payment Method** (NEFT/RTGS, UPI, Cheque, Cash, Credit Card).
6. Enter the **Reference / UTR Number** (essential for bank reconciliation).
7. Add optional internal notes or receipt memos.
8. Click **Save Payment**. The receipt is recorded, adding funds to the client's verified pool.

### 3.2 How to Allocate Funds to Invoices
1. In the **Payment Transactions** table, find a payment with status `Unallocated` or `Partially Allocated`.
2. Click the **Allocate** button in the Actions column.
3. The modal will list all open, unpaid, or partially paid invoices belonging to that client.
4. Enter the amount to allocate to each invoice (the total cannot exceed the available unallocated payment amount).
5. Click **Confirm Allocation**.
6. The system executes the `allocate_payment_to_invoice` database transaction:
   - The invoice balance is reduced.
   - The invoice status updates to `Paid` (if balance is zero) or `Partially Paid`.
   - The payment allocation status updates to `Fully Allocated`.

### 3.3 How to Create a Milestone Installment Schedule
1. In **Payments**, switch to the **Installment Schedules** tab.
2. Click **Create Schedule**.
3. Select the Client and enter:
   - Milestone Name (e.g., "50% Advance Upon Signing").
   - Expected Amount (₹).
   - Milestone Due Date.
4. Click **Create Installment**.
5. The milestone now tracks whether payment has been received, highlighting in yellow when due soon or red when overdue.

---

## 4. Managing Invoices

### 4.1 How to Create a Tax Invoice
1. Go to **Invoices** (`/invoices`) and click **Create Invoice**.
2. Select the **Client**.
3. Set the **Issue Date** and **Payment Due Date**.
4. Add line items:
   - Description (e.g., "Annual Corporate Secretarial Compliance").
   - Quantity and Unit Price.
   - GST Rate (default 18%).
5. The modal automatically calculates Subtotal, CGST/SGST or IGST, and Total Amount.
6. Click **Generate Invoice**. A unique invoice number (e.g., `INV-2026-0005`) is assigned.

### 4.2 Previewing and Downloading Invoices
- On the Invoices table, click the **Print / Preview Icon** to view the formatted tax invoice.
- Click **Download PDF** to export an official commercial invoice to send to the client.

---

## 5. Service Renewals Management

### 5.1 How to Process a Contract Renewal
1. Navigate to **Renewals** (`/renewals`).
2. Review the summary cards for contracts expiring soon.
3. Find the client and service in the Renewals table.
4. Click **Renew Service**:
   - Verify or modify the new Renewal Period (Start & End dates).
   - Set the Renewal Contract Value.
   - Optionally check **Generate Renewal Invoice**.
5. Click **Confirm Renewal**.
6. The system extends the service end date in `client_services`, logs a permanent record in the `renewals` history table, and resets the renewal counter.

---

## 6. Follow-up Tasks & Reminders

### 6.1 Creating and Managing Tasks
1. Go to **Follow-ups** (`/follow-ups`).
2. Click **Create Follow-up**.
3. Select the Client, Due Date & Time, Priority (`Low`, `Medium`, `High`, `Urgent`), and Type (`Payment Reminder`, `Renewal`, `Meeting`, `Call`).
4. Enter specific notes (e.g., "Call client regarding pending TDS certificate and invoice #004").
5. Click **Create Follow-up**.
6. When finished with a task, click the **Checkmark Icon** to mark it as `Completed`.

---

## 7. Notifications & Alerts

1. Look for the red badge on the **Notification Bell** in the top navigation bar.
2. Click the bell to view recent alerts (such as overdue invoices, contracts expiring in 7 days, or urgent follow-ups).
3. Click any notification to navigate directly to the relevant record.
4. Click **Mark all as read** to dismiss active alerts.

