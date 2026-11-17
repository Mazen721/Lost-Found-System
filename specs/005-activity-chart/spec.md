# Feature Spec: Time-Series Activity Chart for Admin & Manager Dashboards (005)

## Problem
The Admin and Manager dashboards show totals and distributions, but no sense
of *movement over time*. The user asked for "a chart over the past
week/month/year where hovering shows how many items were lost, found, and
returned in each period" — the operational heartbeat of the Lost & Found
office.

## Requirements
- A new dashboard endpoint returns a zero-filled time series with three
  counts per bucket: **lost**, **found**, **returned**.
- Ranges: `week` (last 7 days, daily buckets), `month` (last 30 days, daily
  buckets), `year` (last 12 months, monthly buckets). Buckets are ordered,
  contiguous, and always present — days/months with no activity return 0.
- Counting semantics (see plan.md for rationale):
  - lost / found = items with `reportType` LOST / FOUND, bucketed by item
    `createdAt` (the dashboard module's established date semantic).
  - returned = completed handovers (`ClaimRequest.status = COMPLETED`),
    bucketed by `handover.handedOverAt`, falling back to the claim's
    `updatedAt` for legacy completed claims without a handover timestamp.
    One completed handover = one item physically returned to its owner.
- Authorization: SUPER_ADMIN and LOST_FOUND_MANAGER only. Students and
  employees get 403 — this is a campus-wide operational view.
- Both dashboards render the same `ActivityChart` card: range tabs
  (أسبوع | شهر | سنة), three overlapping areas (lost = rose, found =
  gold/amber, returned = emerald), a custom Arabic hover tooltip with the
  bucket date and the three labelled counts, a legend, and the selected
  range's totals in the card header. All copy via `ar.ts`.
- The demo seed gains a clearly separated historical block (~36 items over
  the past 12 months, most RETURNED with completed claim+handover trails,
  the rest CLOSED) so the year view shows believable activity. The 26 story
  items, their matches, and their claims are untouched.

## Out of scope
- No changes to existing dashboard payloads or KPI definitions (totals now
  honestly include the historical records, as they are real seeded data).
- No per-building / per-category series breakdowns.
- The approximate item-value impact idea remains a separate future spec.
