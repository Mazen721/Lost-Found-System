# Plan 012 — Posting Moderation

## Server
1. `config/constants.ts`: `PUBLICATION_STATUSES` +
   `PublicationStatus` type.
2. `lostFoundItem.model.ts`: `publicationStatus` (enum, default
   `PUBLISHED`), `publicationReviewedBy` (ref User, nullable),
   `publicationReviewedAt` (nullable); index
   `{ publicationStatus: 1, createdAt: -1 }`.
3. New module `server/src/modules/moderation/`:
   - `postingSettings.model.ts` — singleton (`key: 'posting'` unique),
     `autoPublishStudentReports: boolean = true`.
   - `moderation.service.ts` — `getPostingSettings`,
     `updatePostingSettings` (upsert + ActivityLog
     `POSTING_MODERATION_SETTING_UPDATED`), `listPendingItems`
     (oldest first, populated location/reporter, private serializer),
     `approveItem` / `rejectItem` (conflict unless `PENDING_APPROVAL`;
     set reviewer fields; `notify` reporter with
     `ITEM_PUBLICATION_APPROVED` / `ITEM_PUBLICATION_REJECTED`;
     ActivityLog `ITEM_PUBLICATION_APPROVED` / `ITEM_PUBLICATION_REJECTED`;
     approve also fires background matching).
   - `moderation.controller.ts`, `moderation.validation.ts`,
     `moderation.routes.ts` — every route behind
     `authorizeRoles('SUPER_ADMIN')`. Mounted at `/moderation` in
     `routes.ts`.
4. `item.projection.ts`: `publicationStatus` joins `PublicItem`
   (defaults to `PUBLISHED` when absent — legacy docs).
   `item.service.ts`:
   - `createItem`: STUDENT/EMPLOYEE + setting OFF → `PENDING_APPROVAL`;
     everyone else → `PUBLISHED`. Background matching only when
     published. ActivityLog metadata gains `publicationStatus`.
   - `listItems`: non-`mine` lists filter
     `publicationStatus: { $nin: ['PENDING_APPROVAL','REJECTED'] }`
     (the `$nin` form keeps legacy field-less documents visible).
   - `getItem` / `updateItem`: unpublished item + actor who is neither
     reporter nor SUPER_ADMIN → 404.
5. Leak surfaces:
   - `matching.runner.ts`: unpublished source returns empty result;
     candidates filtered to published-only.
   - `claim.service.ts`: claim target and linked lost item must be
     published, else the existing not-found/conflict errors.
   - `dashboard.service.ts` / `dashboard.report.ts`: staff aggregates,
     counts, board extras, stale list, recovery/value stats and the
     monthly report exclude `PENDING_APPROVAL`/`REJECTED`
     (`$nin` filter / `$match` stage). Student overview stays
     reporter-scoped (own items, by design).
6. i18n (server notification/activity keys): `notif.itemPublicationApproved`,
   `notif.itemPublicationRejected`, `activity.itemPublicationApproved`,
   `activity.itemPublicationRejected`,
   `activity.postingModerationSettingUpdated` in `client/src/i18n/locales/ar.ts`
   (the client renders notification/log keys), mirroring existing key style.

## Client
1. `types/lostFound.ts`: `PUBLICATION_STATUSES`, `PublicationStatus`,
   `LostFoundItem.publicationStatus`, reviewer fields optional.
2. `features/moderation/moderationApi.ts` + `types/moderation.ts`:
   settings get/patch, pending list, approve, reject.
3. `features/moderation/PostingModerationPage.tsx`: PageHeader + toggle
   card (switch button `role="switch"`, status line) + pending queue
   (ItemImage thumbnail, ReportTypeBadge, reporter, date, location,
   approve/reject buttons with mutations + toasts, row click → detail),
   EmptyState/LoadingState/ErrorState reuse.
4. `navigation.ts`: ADMIN governance group gains
   `{ labelKey: 'nav.postingModeration', to: '/posting-moderation', icon: ClipboardCheck }`.
   Router: route inside the existing SUPER_ADMIN group.
5. `ReportsTable.tsx`: optional publication chip column content — in the
   status cell, when `publicationStatus` is `PENDING_APPROVAL`/`REJECTED`
   render the publication chip instead of / next to the lifecycle badge
   (only reachable in My Reports, since staff lists never receive them).
6. `ReportItemForm.tsx`: success toast branches on
   `result.item.publicationStatus`; pending → toast + navigate to
   `/lost-found/my-reports`; published → existing behaviour.
7. i18n `ar.ts`: `nav.postingModeration`, a `moderation` section
   (title, toggle label, both mode explanations, queue title, empty
   state, approve/reject, success toasts), `lostFound` additions
   (pending chip, rejected chip, report-pending success message).

## Tests
- Server integration `posting-moderation.test.ts` (in-memory replset,
  seed, supertest — same harness as `public-items.test.ts`):
  default ON publish; OFF → student pending + hidden from browse list,
  detail (other student/manager → 404), dashboard counts unchanged;
  manager publishes with OFF; manager/student 403 on settings + approve;
  approve publishes + notification exists; reject → REJECTED +
  notification + still hidden; pending survives toggle back ON in queue.
- Client: navigation test addition (admin drawer contains
  `/posting-moderation`; other roles do not).
- Full server + client suites, typecheck both sides.
- Live smoke: local server + seeded DB, Chrome screenshots to
  `~/workspace/lf-moderation-photos/`.
