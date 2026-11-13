# BRAND 360s CRM — WORKFLOW DIAGRAMS

This document illustrates the primary operational workflows of BRAND 360s CRM using Mermaid sequence and state diagrams.

---

## 1. Client Onboarding & Duplicate Prevention Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Salesperson
    participant UI as Client Onboarding Form
    participant Action as duplicate-detection.ts
    participant DB as Supabase PostgreSQL
    participant Audit as audit_logs

    Salesperson->>UI: Enter Company Name & Phone
    UI->>Action: checkClientDuplicatesAction(query)
    Action->>DB: Query normalized_company_name & phone
    alt Matching Record Exists
        DB-->>UI: Return existing client details
        UI-->>Salesperson: Display duplicate warning banner
    else No Duplicate Found
        DB-->>UI: Return clean check
    end

    Salesperson->>UI: Fill Services, Contract Value & Submit
    UI->>Action: createClientAction(formData)
    Action->>DB: INSERT INTO clients (auto generate client_code)
    Action->>DB: INSERT INTO client_services
    Action->>Audit: INSERT INTO audit_logs (Action: CREATE_CLIENT)
    DB-->>UI: Return Client Record
    UI-->>Salesperson: Redirect to /clients with Success Toast
```

---

## 2. Payment Collection & Invoice Allocation Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Payments Ledger
    participant RPC as allocate_payment_to_invoice()
    participant DB as Supabase PostgreSQL

    Admin->>UI: Record Payment (₹50,000, UTR, Client)
    UI->>DB: INSERT INTO payments (status='Completed', allocation_status='Unallocated')
    DB-->>UI: Payment Saved

    Admin->>UI: Click "Allocate Payment"
    UI->>DB: Fetch Open Invoices for Client UUID
    DB-->>UI: Returns Invoices (e.g. INV-001 with ₹80,000 balance)
    
    Admin->>UI: Allocate ₹50,000 to INV-001
    UI->>RPC: CALL allocate_payment_to_invoice(payment_id, invoice_id, 50000)
    
    rect rgb(240, 248, 255)
        Note over RPC,DB: Atomic Database Transaction
        RPC->>DB: INSERT INTO invoice_payment_allocations
        RPC->>DB: UPDATE invoices SET paid_amount += 50000, balance_amount -= 50000
        RPC->>DB: UPDATE payments SET allocated_amount += 50000, allocation_status='Fully Allocated'
        RPC->>DB: UPDATE clients SET balance_receivable -= 50000
    end
    
    RPC-->>UI: Transaction Committed Successfully
    UI-->>Admin: Table updates with Emerald Paid Badges
```

---

## 3. Service Renewal Management Workflow

```mermaid
stateDiagram-v2
    [*] --> ActiveService: Client Contract Started
    ActiveService --> ExpiringSoon: Expiry Date within 30 Days
    
    state ExpiringSoon {
        [*] --> NotificationTriggered: System Alert Created
        NotificationTriggered --> SalespersonContact: Assigned Salesperson Follow-up
    }
    
    ExpiringSoon --> ProcessRenewal: Client Agrees to Renew
    ExpiringSoon --> Overdue: Expiry Passes without Renewal
    
    state ProcessRenewal {
        [*] --> UpdateServiceExpiry: Extend End Date in client_services
        UpdateServiceExpiry --> LogRenewalHistory: Insert Record in renewals Table
        LogRenewalHistory --> GenerateRenewalInvoice: Optional Tax Invoice
    }
    
    ProcessRenewal --> ActiveService: New Contract Period Begins
    Overdue --> ProcessRenewal: Late Renewal Executed
    Overdue --> Cancelled: Contract Terminated
    Cancelled --> [*]
```

---

## 4. Client Financial Protection & Archival Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as Admin or Salesperson
    participant UI as Clients Table
    participant Guard as checkClientDependenciesAction()
    participant DB as Supabase PostgreSQL

    User->>UI: Click Delete (Trash Icon)
    UI->>Guard: checkClientDependenciesAction(clientId)
    Guard->>DB: COUNT(invoices) + COUNT(payments)
    
    alt Client Has Invoices or Payments (Count > 0)
        Guard-->>UI: canDelete: false (Financial Protection Active)
        UI-->>User: Display "Archive Client" (Permanent Delete Disabled)
        User->>UI: Click "Archive Client"
        UI->>DB: UPDATE clients SET client_status='Archived'
        UI-->>User: Client moved to "Archived Clients" tab
    else Client Has Zero Financial Records (Count == 0)
        Guard-->>UI: canDelete: true
        UI-->>User: Allow Permanent Deletion (Requires Company Name Confirmation)
        User->>UI: Confirm Permanent Deletion
        UI->>DB: DELETE FROM clients WHERE id=clientId
        UI-->>User: Client permanently purged
    end
```

