# Feature Spec: Dedicated Statistics Page for Staff (009)

## Background
Spec 008 put two estimated-value KPI cards directly on the Admin and
Manager dashboards. The user's feedback: the cards are "in his face"
(«مش عاوزهم في الوش كده»). His chosen direction: move the value stats
off the dashboards into a **dedicated Statistics page** that also holds
the time-series activity chart (spec 005) and similar analytics — one
place staff open when they want the numbers, while the dashboards go
back to being operational boards.

## Requirements

### 1. Dashboards give the value cards back
- `AdminDashboard` and `ManagerDashboard` no longer render
  `ValueStatsCards`. Everything else on both dashboards stays exactly
  as-is — **including the spec-005 `ActivityChart`**, which remains on
  the dashboards as well as appearing on the new page.
- The server payloads keep carrying `valueStats` (the Statistics page
  consumes the same `GET /dashboard` response).

### 2. New staff-only page «الإحصائيات»
- Route `/statistics` (top-level, like `/users` and `/activity-logs`),
  guarded to `LOST_FOUND_MANAGER` + `SUPER_ADMIN` exactly like the
  other staff routes. Students/employees get no navigation entry and
  the route does not render for them.
- Page blocks, top to bottom:
  1. The spec-005 activity chart (existing `ActivityChart` component,
     week/month/year tabs, `GET /dashboard/activity-series`).
  2. The spec-008 value stats (existing `ValueStatsCards`): this-month
     lost/returned + all-time totals, labelled «تقديرية».
  3. Breakdowns (new, see §3): items by category, items by status,
     top locations — rendered as clean Arabic bar rows with the
     existing dashboard card styling; no new chart library.

### 3. Breakdowns in the staff dashboard payload (server)
`GET /dashboard` gains a `breakdowns` block on the **Admin and Manager
payloads only** (same staff-only gating as `valueStats`; the
student/employee payload must not contain it):
- `itemsByCategory`: every category in `LOST_FOUND_CATEGORIES`,
  zero-filled, as `{ category, lost, found, total }`, sorted by total
  descending.
- `itemsByStatus`: every status in `ITEM_STATUSES`, zero-filled, as
  `{ status, count }`.
- `locationsTop`: the top 5 locations by item count, as
  `{ locationId, name, nameAr?, count }` with the location's building +
  room names, ordered by count descending.
- All-time figures (like `valueStats`, they ignore the dashboard
  period parameter), aggregated in the existing dashboard service.

### 4. Navigation
- «الإحصائيات» (`/statistics`) joins the Admin + Manager **top links**
  and **drawer menu**, immediately after «لوحة التحكم» (`/dashboard`).
- Student/Employee navigation is untouched on every surface.

## Out of scope
- No new endpoints; the page reuses `GET /dashboard` and
  `GET /dashboard/activity-series`.
- No changes to the mobile bottom bar.
- No AI-insights changes (breakdowns are not fed to the insights
  pipeline).
