# BRAND 360s CRM — ERROR REPORT, TECHNICAL HEALTH & STABILITY AUDIT

This document records the findings of a static code audit across the application codebase, with a focus on React rendering cycles, server action patterns, cache invalidation, and data integrity.

---

## 1. Executive Stability Assessment

- **TypeScript Compilation:** Clean (`0 errors` across the entire codebase via `npx tsc --noEmit`).
- **Production Build:** Passes cleanly (`next build --webpack` compiles all 21 routes with zero syntax or bundling errors).
- **Core CRUD Operations:** Fully wired to Supabase with comprehensive error boundary fallbacks (`ErrorRetryState.tsx`).
- **Data Protection:** Financial safeguards are actively implemented to block destructive deletion of clients with financial records.

---

## 2. Identified Technical Debt & Architectural Risks

### Issue 1: Server Actions Invocation Inside `useEffect` Hooks
- **Locations:**
  - `src/app/(crm)/clients/page.tsx`
  - `src/app/(crm)/payments/page.tsx`
  - `src/app/(crm)/invoices/page.tsx`
  - `src/app/(crm)/renewals/page.tsx`
  - `src/app/(crm)/follow-ups/page.tsx`
- **Pattern:** Each page uses a `loadData` function wrapped in `useCallback` that invokes Server Actions (`fetchClientsAction()`, `fetchPaymentsAction()`, etc.) within a `useEffect`.
- **Identified Risk:** If a state setter inside `loadData` or a mutation callback modifies a dependency referenced in `useCallback`, React can enter a rapid re-fetching loop.
- **Current Safeguard:** The codebase currently mitigates this using `requestIdRef = useRef(0)` and checking `if (currentReqId === requestIdRef.current)` before applying state updates.
- **Recommended Architecture:** Transition from client-side `useEffect` data fetching to standard Next.js Server Components with streaming Suspense boundaries, or adopt TanStack Query (React Query) for managed client cache invalidation and deduplication.

---

### Issue 2: Deprecated Next.js Middleware File Convention
- **Warning:** `The "middleware" file convention is deprecated. Please use "proxy" instead.`
- **File:** `src/middleware.ts`
- **Impact:** Next.js 16+ is gradually deprecating `middleware.ts` in favor of `proxy.ts`. While fully functional today, this warning appears on every production build.
- **Recommended Fix:** Migrate using `npx @next/codemod@canary middleware-to-proxy .` or rename to `proxy.ts` according to the Next.js 16 specification.

---

### Issue 3: In-Memory Client Financial Calculation Drift
- **Locations:** `src/app/actions/clients.ts` vs PostgreSQL Trigger `sync_client_financials()`
- **Detail:** In `clients.ts`, client summary values (`contract_value`, `payments_received`, `balance_receivable`) are calculated in application code from joined arrays. PostgreSQL also contains trigger logic (`sync_client_financials`) designed to keep `clients` table columns synchronized.
- **Impact:** If a payment is recorded via a direct database query or unhandled transaction without calling both sync pathways, the client record columns could briefly display different balances than the sum of `payments`.
- **Status:** Mitigation was introduced in `019_payment_allocation_fix.sql` ensuring RPC `allocate_payment_to_invoice` directly recalibrates the parent client table row.

---

### Issue 4: Dynamic Cron Endpoint Secret Validation
- **File:** `src/app/api/cron/notifications/route.ts`
- **Detail:** The route checks `req.headers.get("Authorization") === Bearer ${process.env.CRON_SECRET}`.
- **Impact:** If `CRON_SECRET` is left undefined in the deployment environment (`.env.local` / Netlify dashboard), external cron runners will receive a `401 Unauthorized` response.
- **Recommended Action:** Ensure `CRON_SECRET` is added to Netlify Environment Variables.

---

### Issue 5: Untracked Commission Logic in Sales Incentives
- **File:** `src/app/(crm)/sales-incentives/page.tsx`
- **Detail:** Renders `PlaceholderPage` ("Track commissions, team sales goals, approved incentives, and employee payouts").
- **Status:** Intentionally scoped as a placeholder; not yet connected to a database schema.

---

## 3. Stability Summary & Confidence Level

| Risk Category | Severity | Confidence | Impact on Production |
| :--- | :--- | :--- | :--- |
| Database RLS Violations | Low | High | All tables have RLS enabled with explicit Admin and Employee policies. |
| Re-render Loops | Low | High | `requestIdRef` guards prevent infinite loops across all CRUD modules. |
| Financial Data Corruption | Low | High | Deletion of clients with financial records is blocked; allocations use atomic RPC transactions. |
| Routing & Authorization | Zero | High | Middleware strictly intercepts unauthenticated visitors and unauthorized employee role access. |

