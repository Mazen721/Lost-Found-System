# Spec 012 — Posting Moderation (اعتماد النشر)

## Problem
Every student/employee lost & found report currently publishes the moment it
is submitted. The university wants a switch: the Super Admin can require
manual approval before student/employee reports become visible.

## Confirmed decisions (user, 2026-11-26 — do not re-litigate)
1. The toggle and the approve/reject decisions belong to the **SUPER_ADMIN
   only**. The Lost & Found Manager has no moderation powers.
2. Reports created by the **LOST_FOUND_MANAGER always publish immediately**,
   in both modes. (SUPER_ADMIN still cannot create reports — spec 003.)
3. Default mode is **auto-publish ON**, preserving today's behaviour.

## Behaviour
- Setting `autoPublishStudentReports` (singleton `PostingSettings` doc):
  - **ON**: STUDENT/EMPLOYEE reports are created `publicationStatus =
    PUBLISHED` and behave exactly as today.
  - **OFF**: STUDENT/EMPLOYEE reports are created `publicationStatus =
    PENDING_APPROVAL`.
- `publicationStatus` is a new field on `LostFoundItem`, **separate** from
  the lifecycle `status`: `PUBLISHED | PENDING_APPROVAL | REJECTED`,
  default `PUBLISHED` (existing/seed/legacy documents without the field are
  treated as published).
- A `PENDING_APPROVAL` or `REJECTED` item is invisible to everyone except:
  - its reporter, in **My Reports**, with a «بانتظار الموافقة» /
    «مرفوض» chip;
  - the SUPER_ADMIN, in the moderation queue and the item detail.
  It must not appear in browse/search, home, match suggestions, claim
  flows, All Reports / Archived (staff lists), or dashboard/statistics/
  report aggregates.
- SUPER_ADMIN approves → `PUBLISHED` (+ `publicationReviewedBy/At`),
  background matching runs, reporter gets an in-site Notification.
- SUPER_ADMIN rejects → `REJECTED` (+ reviewer fields), reporter gets an
  in-site Notification. Rejected items stay visible to the reporter in
  My Reports only.
- Setting changes, approvals and rejections are written to `ActivityLog`.
- Pending items left over from an earlier manual period still appear in
  the moderation queue while the toggle is ON.

## UI (Arabic, navy/gold/Cairo RTL identity)
- New SUPER_ADMIN-only page «اعتماد النشر» at `/posting-moderation`, in the
  admin navigation governance group («الحوكمة والدليل»), guarded by
  `ProtectedRoute allowedRoles=['SUPER_ADMIN']`.
  - Top card: toggle switch «النشر التلقائي لبلاغات الطلاب والموظفين» +
    a plain-Arabic status line explaining the current mode and who it
    applies to (students/employees only; manager reports always publish).
  - Below: pending queue «بانتظار الموافقة» — photo thumbnail, title,
    مفقود/معثور badge, reporter name, date, location, «موافقة» / «رفض»
    buttons; clicking a row opens the item detail. Empty state when the
    queue is empty.
- Report form success feedback reflects the mode: published immediately
  vs «أُرسل للمراجعة وبانتظار موافقة مدير النظام».
- My Reports shows publication chips for pending/rejected items;
  published items keep their normal lifecycle chips only.

## API (all SUPER_ADMIN-only, server-enforced 403 otherwise)
- `GET   /api/v1/moderation/settings`
- `PATCH /api/v1/moderation/settings` `{ autoPublishStudentReports: boolean }`
- `GET   /api/v1/moderation/pending?page&limit`
- `POST  /api/v1/moderation/items/:id/approve`
- `POST  /api/v1/moderation/items/:id/reject`

## Out of scope
- Rejection reasons (one-tap reject, like the confirmed UX).
- Manager moderation powers; email notifications; editing a rejected
  report back into the queue.
