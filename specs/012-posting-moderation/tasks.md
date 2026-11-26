# Tasks 012 — Posting Moderation

## Spec
- [x] T1. spec.md + plan.md + tasks.md (confirmed user decisions pinned).

## Server
- [ ] S1. Constants + item model fields/index for `publicationStatus`.
- [ ] S2. `PostingSettings` singleton model + moderation module
      (service/controller/validation/routes), mounted at `/moderation`,
      SUPER_ADMIN-only, ActivityLog + Notification wiring.
- [ ] S3. `createItem` applies the setting by reporter role; matching
      only for published items; projection carries `publicationStatus`.
- [ ] S4. Visibility filters: item list/detail/update, matching runner,
      claim create/link, dashboard + monthly-report aggregates.
- [ ] S5. Server integration tests `posting-moderation.test.ts`.

## Client
- [ ] C1. Types + `moderationApi`.
- [ ] C2. «اعتماد النشر» page (toggle card + pending queue) + route +
      admin navigation entry + i18n strings.
- [ ] C3. My Reports publication chips; report-form success feedback
      branches on publication status.
- [ ] C4. Client navigation test for the new admin-only route.

## Verification
- [ ] V1. Server tests + client tests pass; typecheck 0/0.
- [ ] V2. Live run with seed data; screenshots in
      `~/workspace/lf-moderation-photos/` (admin page OFF + queue,
      admin page ON, student My Reports pending chip; mobile 390×844).
- [ ] V3. Local commits on branch `012-posting-moderation` + git bundle
      in `~/workspace/`. No push.
