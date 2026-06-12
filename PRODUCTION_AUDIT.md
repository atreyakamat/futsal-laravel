# FutsalGoa Production Readiness Audit Report

**Date:** June 11, 2026
**Status:** 🚨 CRITICAL FAILURES DETECTED
**Recommendation:** DO NOT DEPLOY. Immediate remediation required.

## Executive Summary
This audit confirms the severe mismatch between the previously documented "Production Ready" status and the actual state of the codebase. Several critical vulnerabilities and structural missing pieces have been identified, particularly around Authentication, Route Protection, and Booking concurrency.

---

## 1. Architecture Overview
- **Framework:** Next.js 15 App Router
- **Database:** PostgreSQL accessed via raw SQL queries in `lib/domain.ts` and `lib/admin.ts`.
- **Auth:** Home-grown cookie-based authentication (`fg_auth_user`, `fg_auth_role`, `fg_arena_id`).
- **Protection Layer:** Missing. There is **no Next.js Middleware** (`middleware.ts`). Protection is haphazardly applied per-page.

---

## 2. Authentication Audit Report (Priority 1)
**Status:** 🚨 CRITICAL (IDOR / Privilege Escalation)

There are multiple, fragmented authentication entry points:
- `/api/auth/super-admin/login`
- `/api/auth/arena-admin/login`
- `/api/arena-admin/login` (Duplicate endpoint)
- `/api/auth/admin/verify-otp`

**The Vulnerability:**
When logging in via the OTP endpoint (`verify-otp`), the system sets `fg_auth_user` but **fails to set `fg_auth_role`**. 
Inside `lib/admin.ts` (`getAdminContext`), if `fg_auth_role` is missing, the system defaults to checking the `super_admins` table first. If an Arena Admin or Security Staff with `ID=1` logs in via OTP, the system checks if `ID=1` exists in `super_admins`. If it does, the user is **granted Super Admin privileges**.

**Recommended Fix:**
- Consolidate all admin logins into a single secure flow.
- Always explicitly set the role in the session payload/cookie.
- Never fallback to checking `super_admins` if the role cookie is missing.

---

## 3. Middleware & Route Audit Report (Priority 6)
**Status:** 🚨 CRITICAL (Missing Protection)

**The Vulnerability:**
There is no `middleware.ts` in the project. Route protection is currently handled manually inside page components (e.g., `app/admin/super-admin/page.tsx`). If any page or API route forgets to call `getAdminContext()` and check the role, that route is completely exposed to the public. 

**Recommended Fix:**
- Implement a global `middleware.ts` to intercept all `/admin/*`, `/api/admin/*`, and `/api/super-admin/*` requests.
- Verify JWT/Cookies at the edge before the request ever hits the page/route handler.

---

## 4. Booking Engine Audit (Priority 5)
**Status:** 🚨 HIGH (Denial of Service)

**The Vulnerability:**
While the database uses `SELECT ... FOR UPDATE` (which is good for preventing immediate race conditions), the business logic in `createBookingBatch` has a fatal flaw. It creates a `bookings` record with `payment_status = 'pending'`. 
The query that checks availability rejects any slot that has a `'pending'` or `'confirmed'` booking. If a user starts checkout but never pays (closes the browser), the booking remains `pending` forever. This permanently blocks the slot, leading to an easy Denial of Service attack on the arena.

**Recommended Fix:**
- Implement a cleanup cron job or database trigger that automatically deletes or marks `pending` bookings as `failed` after 10-15 minutes.
- Alternatively, modify the availability query to ignore `pending` bookings that are older than 15 minutes.

---

## 5. Payment Audit (Priority 4)
**Status:** ⚠️ MEDIUM (Incomplete)

- The `payment/callback/route.ts` exists and verifies hashes, but relies on the flawed booking engine logic above.
- Duplicate callbacks are somewhat mitigated by `confirmPayment`, but need rigorous testing.

---

## 6. Arena Admin Dashboard (Priority 3)
**Status:** ⚠️ MEDIUM (Incomplete)

- The UI for Arena Admins is severely lacking compared to the Super Admin dashboard.
- Features claimed as "Ready for Implementation" in the docs are missing from the codebase.

---

## 7. Prioritized Fix List & Action Plan

### 🔴 CRITICAL (Fix Immediately)
1. **Fix the Auth IDOR Vulnerability:** Rewrite `getAdminContext` in `lib/admin.ts` to strictly require and validate `fg_auth_role`.
2. **Implement `middleware.ts`:** Create a robust Edge middleware to protect `/admin`, `/security`, and `/api` routes globally.
3. **Fix Booking DOS:** Update the slot availability query in `lib/domain.ts` to ignore `pending` bookings older than 15 minutes.

### 🟠 HIGH (Fix Before Launch)
4. **Consolidate Login Routes:** Remove duplicate API routes for Arena Admin login.
5. **Implement Missing Arena Admin Features:** Build the dashboard components specifically scoped to `arena_admin`.

### 🟡 MEDIUM
6. **Payment Cleanup:** Ensure failed/abandoned payments are properly released.
7. **User Dashboard:** Expand user profile and booking history functionality.

---
**End of Report**