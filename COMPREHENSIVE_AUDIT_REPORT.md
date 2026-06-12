# COMPREHENSIVE PRODUCTION-READINESS AUDIT: FutsalGoa Platform

**Date:** June 11, 2026  
**Auditor:** Gemini Principal Architect & Security Lead  
**Status:** 🚨 **CRITICAL FAILURES DETECTED - DO NOT DEPLOY**

---

## 1. Architecture Overview
- **Core Stack:** Next.js 15 (App Router), TypeScript, PostgreSQL, Prisma (schema definition only, raw SQL used in runtime).
- **Authentication:** Fragmented cookie-based system using `fg_auth_user` (ID) and `fg_auth_role`.
- **Authorization:** Decentralized; enforced per-page/route rather than globally.
- **Data Model:** Roles are split across `super_admins`, `arena_admins`, `security_staff`, and `users` tables, creating identity fragmentation and collision risks.

## 2. Route Audit Report
| Route Segment | Status | Protection | Issues |
|---|---|---|---|
| `/admin/super-admin` | Functional | Per-page check | Accessible to anyone if per-page check is removed. |
| `/admin/dashboard` | Functional | Per-page check | Fragmented; logic differs between super-admin and others. |
| `/security/*` | Functional | Per-page check | Minimal validation; role check relies on client-side hint. |
| `/api/super-admin/*`| Functional | Manual checks | Highly vulnerable to developer oversight. |
| `/api/admin/*` | Functional | Manual checks | Some endpoints missing role-level granularity. |

## 3. API Audit Report
- **Request Validation:** Zod is used (Good), but inconsistent across newer endpoints.
- **Error Handling:** Often returns 500 without specific error context; leaks stack traces in some dev modes.
- **Consistency:** Response formats vary between "Success/Data" objects and raw results.

## 4. Authentication Audit Report
**🚨 CRITICAL VULNERABILITY: IDOR & Privilege Escalation**
- **Root Cause:** `verify-otp` (app/api/auth/admin/verify-otp/route.ts) sets `fg_auth_user` but NOT `fg_auth_role`.
- **Impact:** `getAdminContext` defaults to checking `super_admins` if the role cookie is missing. An Arena Admin with ID `1` can log in via OTP and be treated as a Super Admin if ID `1` exists in that table.
- **Files:** `lib/admin.ts`, `app/api/auth/admin/verify-otp/route.ts`

## 5. Booking Engine Audit
**🚨 HIGH SEVERITY: Denial of Service (DOS)**
- **Root Cause:** `createBookingBatch` creates a `pending` booking that is never released if payment is abandoned.
- **Impact:** Any user can permanently block every slot in every arena by simply initiating checkout and closing the browser.
- **Files:** `lib/domain.ts`, `app/api/bookings/process/route.ts`

## 6. Payment Audit
- **Status:** Incomplete implementation.
- **Issues:** Payment callback handles success/failure but lacks protection against replayed webhooks or race conditions where multiple callbacks for one transaction arrive simultaneously.

## 7. Database Audit
- **Identity Fragmentation:** Identical IDs across `super_admins` and `arena_admins` lead to logic collisions.
- **Transactions:** `SELECT ... FOR UPDATE` is used (Good), but logic around `pending` timeouts is missing.
- **Constraints:** Missing cross-table unique constraints on email/mobile across all role tables.

## 8. Security Audit
- **Middleware:** Completely missing. Edge protection is non-existent.
- **SQL Injection Risk:** `toPgPlaceholders` in `lib/db.ts` uses a naive regex replace that fails on literal `?` in strings.
- **CSRF:** Reliance on standard forms without explicit CSRF tokens (Next.js provides some auto-protection, but needs explicit configuration).

## 9. Missing Features Report
- **Global Middleware:** Essential for route protection.
- **Cleanup Cron:** Required to release abandoned `pending` bookings.
- **Arena Admin Dashboard:** Documentation claims completion, but implementation is minimal/placeholder.
- **Centralized User Identity:** Single source of truth for all roles.

## 10. Broken Features Report
- **OTP Role Persistence:** OTP login loses role context.
- **Logout Consistency:** Multiple logout paths exist; some might not clear all cookies (`fg_arena_id` etc).

## 11. Dead Code Report
- **Duplicate Endpoints:** `/api/auth/arena-admin/login` and `/api/arena-admin/login` perform identical tasks with slightly different logic.

## 12. Production Readiness Report
**OVERALL SCORE: 3/10**
The platform is an "Advanced Prototype" rather than a production system. The lack of middleware and the critical auth escalation vulnerability make it unsafe for public deployment with real money.

## 13. Prioritized Fix List

### 🔴 CRITICAL (Fix within 24 hours)
1. **Patch `getAdminContext`:** Require an encrypted/signed role hint or verify against a unified session table.
2. **Implement `middleware.ts`:** Global protection for `/admin` and `/api` paths.
3. **Fix SQL Placeholder Parser:** Update `lib/db.ts` to properly parse SQL without breaking on literal question marks.

### 🟠 HIGH (Fix before Launch)
4. **Booking Cleanup:** Add a 15-minute expiry check for `pending` bookings in the availability query.
5. **Role Unification:** Consolidate `super_admins`, `arena_admins`, and `users` into one table with a `role` enum.
6. **Payment Validation:** Add signature/nonce verification to PayU callbacks.

---

## 🛠 CODE PATCH SUGGESTION: SQL Placeholder Fix
**File:** `lib/db.ts`
```typescript
// Replace naive regex with one that respects quotes
function toPgPlaceholders(sql: string) {
  let index = 0;
  // This is a simplified example; a real parser would handle escaped quotes
  return sql.replace(/'[^']*'|\?/g, (match) => {
    if (match === '?') return `$${++index}`;
    return match;
  });
}
```

---
**End of Audit Report**
