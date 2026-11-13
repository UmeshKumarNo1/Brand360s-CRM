# BRAND 360s CRM — SAMPLE TEST DATA & MANUAL TESTING GUIDE

This document provides sample, non-destructive test records formatted for testing every module of BRAND 360s CRM without polluting production data.

---

## 1. Test Client Profiles

### Test Client A: High-Value Enterprise Client
- **Company Name:** `Apex Horizon Technologies Pvt Ltd`
- **Brand Name:** `Apex Horizon`
- **Primary Contact Person:** `Vikramaditya Sharma`
- **Primary Email:** `vikram@apexhorizon.example`
- **Primary Phone:** `+91 98765 43210`
- **Registered Address:** `Plot 42, Cyber City, Phase II`
- **City, State, Postal Code:** `Gurugram`, `Haryana`, `122002`
- **GSTIN:** `06AAAAA0000A1Z5`
- **PAN:** `AAAAA0000A`
- **Purchased Service:** `Annual Compliance, Web Development`
- **Contract Value:** `₹1,50,000`
- **Billing Frequency:** `Annual`
- **Contract Start Date:** `2026-01-01`
- **Contract Expiry Date:** `2026-12-31`
- **Purpose in Testing:** Use to verify multi-service formatting, invoice generation, and milestone allocation.

---

### Test Client B: Expiring Contract Client (For Renewal Testing)
- **Company Name:** `Zenith Crest Media LLP`
- **Brand Name:** `Zenith Media`
- **Primary Contact Person:** `Ananya Roy`
- **Primary Email:** `ananya@zenithcrest.example`
- **Primary Phone:** `+91 98111 22233`
- **Registered Address:** `802, Lotus Trade Tower, Sector 18`
- **City, State, Postal Code:** `Noida`, `Uttar Pradesh`, `201301`
- **Purchased Service:** `Website Development`
- **Contract Value:** `₹80,000`
- **Contract Start Date:** `2025-11-20`
- **Contract Expiry Date:** Set to **15 days from today** (e.g. `2026-11-28`)
- **Purpose in Testing:** Appears in `/renewals` as "Upcoming Renewal (Due Soon)". Test the **Renew Service** modal to verify contract extension.

---

### Test Client C: Clean Client for Deletion Testing
- **Company Name:** `Test Temporary Inactive Client`
- **Primary Contact Person:** `Test User`
- **Primary Email:** `temp.client@brand360test.example`
- **Primary Phone:** `+91 90000 00001`
- **Purchased Service:** None
- **Contract Value:** `₹0`
- **Invoices / Payments:** None
- **Purpose in Testing:** Use to verify that a client **without financial records** can be permanently deleted, while verifying the safety prompt requiring typing the exact company name.

---

## 2. Sample Invoices for Testing

### Test Invoice 1 (Linked to Apex Horizon)
- **Client:** `Apex Horizon Technologies Pvt Ltd`
- **Issue Date:** Today's Date
- **Due Date:** Today + 15 days
- **Item 1:** `Annual Corporate Secretarial & ROC Filing Compliance`
  - Quantity: `1`
  - Unit Price: `₹50,000`
  - GST Rate: `18%`
- **Item 2:** `Enterprise Portal UI Redesign`
  - Quantity: `1`
  - Unit Price: `₹1,00,000`
  - GST Rate: `18%`
- **Expected Subtotal:** `₹1,50,000`
- **Expected GST (18%):** `₹27,000`
- **Expected Total Amount:** `₹1,77,000`

---

## 3. Sample Payment Receipts for Testing

### Test Receipt A: Full Allocation Scenario
- **Client:** `Apex Horizon Technologies Pvt Ltd`
- **Amount:** `₹1,00,000`
- **Method:** `Bank Transfer (NEFT / RTGS)`
- **Reference / UTR:** `HDFC20261113009988`
- **Payment Date:** Today's Date
- **Test Objective:** Record the payment, then allocate ₹1,00,000 against Test Invoice 1. Verify invoice balance decreases to `₹77,000` with status `Partially Paid`.

### Test Receipt B: Excess Payment / Unallocated Pool Scenario
- **Client:** `Zenith Crest Media LLP`
- **Amount:** `₹50,000`
- **Method:** `UPI`
- **Reference / UTR:** `UPI61113889922`
- **Test Objective:** Do not allocate immediately. Verify that `Unallocated Pool` on `/payments` increments by ₹50,000.

---

## 4. Sample Follow-up Tasks for Testing

### Urgent Collection Call
- **Client:** `Apex Horizon Technologies Pvt Ltd`
- **Type:** `Payment Reminder`
- **Priority:** `Urgent`
- **Due Date:** Today at 4:00 PM
- **Notes:** "Call finance director regarding balance payment for Milestone 2."
- **Expected Result:** High-contrast urgent badge on `/dashboard` and `/follow-ups`.

---

## 5. Cleaning Up Test Data
To remove test records cleanly after completing your testing:
1. First, delete or cancel any test allocations made in `invoice_payment_allocations`.
2. Delete the test invoices created in `invoices`.
3. Delete the test payments created in `payments`.
4. Finally, permanently delete the test client from `/clients` (which is now permitted since all financial dependencies have been removed).

