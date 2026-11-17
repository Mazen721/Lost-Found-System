# Plan: Mobile App Shell + Admin Report Removal (003)

Mode: **Operate** (task completion surface) + Impeccable `adapt` playbook
(desktop → mobile web). Incumbent world is preserved and extended, not
replaced: navy sidebar language becomes the bottom bar's language.

## Impeccable context — questions asked and how they were answered
1. **Target selection** — `impeccable context` at repo root returned
   `TARGET_SELECTION_REQUIRED` listing one UI app. Answered from the repo
   layout: `client` is the only UI workspace (server is non-UI, skipped by
   the tool itself). Reran from `client/`.
2. **Stale PRODUCT.md** — the context loader inlines `client/PRODUCT.md`,
   which still describes the retired two-module / five-role / bilingual
   product. Answered from the locked project decisions and `DESIGN.md`'s
   "Lost & Found refresh (2026-11)" section, which are the current truth:
   Lost & Found only, 4 roles (STUDENT, EMPLOYEE, LOST_FOUND_MANAGER,
   SUPER_ADMIN), Arabic-only RTL, Cairo. PRODUCT.md was NOT rewritten:
   Impeccable's own rule is to never repair drift as a side effect of a
   design task. Flagged as an open follow-up for the user.
3. **Adapt playbook context** ("target platforms/devices and usage
   contexts") — answered from the user's brief: students/employees on
   phones (360–430px, iOS Safari + Android Chrome), in-the-moment
   lost/found reporting; staff roles also mobile-checked; desktop
   unchanged.
4. **CONTEXT_STALE: hook-not-installed** (`.codex/hooks.json`) — reported,
   not repaired (skill rule). The mechanical detector is run manually over
   the changed files at the end instead (`impeccable detect --changed`).
5. **Interview probe substitution** — Impeccable's autonomy check expects
   live user questions; this build runs from a written brief as a subagent,
   so questions were answered from the brief + project files and recorded
   here (the directive sanctions this substitution for subagents).
6. **Gold center action vs the Crest Gold Restraint Rule** — DESIGN.md
   reserves bright gold for small signals, but the shipped 2026-11 refresh
   already establishes gold fill + navy ink as the primary-action treatment
   (dashboard hero CTA). The center report action follows that precedent;
   it is the single primary action of the student shell, not decoration.

## Design decisions
- **Bar surface**: Deep Navy `#04153E` (`bg-sidebar`), the same ground as
  the desktop sidebar, so the shell reads as one system. Inactive tabs use
  Sidebar Muted Ink `#AFBAD4`; the active tab gets a 3px Crest Gold top
  indicator (the sidebar's start-edge bar, rotated), gold icon, and white
  semibold label. Elevation declared once: an offset soft navy shadow
  (`0 -6px 24px -6px rgba(4,21,62,.25)`), no border (craft-floor rule).
- **Geometry**: bar content height 64px; `padding-bottom:
  env(safe-area-inset-bottom)`; `index.html` gains `viewport-fit=cover` so
  the inset is real on iOS. Every tab slot is a full-height link/button
  (≥48px targets; slots are ~64px wide at 360px across 5 slots).
- **Center action (student/employee)**: 54px circular gold button, navy
  PackagePlus icon, raised `-top-5`, `ring-4 ring-background` separation,
  offset soft shadow; label «إبلاغ» beneath inside the bar flow. Active
  route state deepens the ring to navy.
- **Labels**: short tab labels added to `ar.ts` (`nav.tabHome` الرئيسية,
  `nav.tabBrowse` تصفح, `nav.tabReport` إبلاغ, `nav.tabMyClaims` طلباتي,
  `nav.tabMatches` المطابقات, `nav.tabClaims` الطلبات, `nav.tabMore`
  المزيد; the staff all-reports tab reuses the existing `nav.items`
  الأغراض so it cannot be confused with الطلبات/المطابقات at a glance).
  Labels render at 11px semibold, `whitespace-nowrap`, tight leading;
  slots are 72px wide at 360px. Fit is proven by 360px screenshots + a DOM
  no-truncation assertion, not by glyph counting. Existing long labels
  stay for the sidebar. In short landscape viewports (landscape,
  max-height 500px) labels hide and the bar becomes icons-only.
- **Z-order**: bar `z-30` (same tier as the sticky header). Radix dialogs,
  the nav drawer, and the notifications sheet are `z-50` and cover it.
- **Keyboard**: one primary signal — focus inside a form control
  (`input`/`textarea`/`select`/`[contenteditable]`, tracked with
  focusin/focusout + relatedTarget so moving between fields does not
  flicker) — plus a secondary signal: `visualViewport` height dropping
  >120px below the window height (debounced, restores when it recovers).
  While either holds, the bar hides (translate-y-full,
  pointer-events-none) **and the content spacer collapses**, so the bar
  never overlaps the report form's submit area. The state lives in
  AppShell (`useMobileKeyboardOpen`) and is passed to the bar. Headless
  Chromium has no software keyboard: acceptance proves the focus signal
  only; real-device keyboard behaviour is a documented manual check.
- **Content clearance**: AppShell renders a mobile-only spacer after
  `<main>` sized `calc(5.25rem + env(safe-area-inset-bottom))` — bar
  height + safe area + clearance for the raised centre button's 20px
  protrusion at page end (mid-scroll the opaque, ring-separated button
  overlapping content is the intended FAB pattern).
- **Active states on non-tab routes**: tabs carry `activePrefixes` in the
  nav model. Item detail (`/lost-found/items/:id`) lights تصفح for
  students/employees and الأغراض for staff; claim detail lights the claims
  tab (subtree matching); `/lost-found/archived` lights الأغراض for staff;
  for SUPER_ADMIN the drawer-only routes (`/users`, `/locations`,
  `/activity-logs`, `/lost-found/handovers`, `/profile`) light المزيد.
  Manager handovers/archived light الأغراض/الطلبات as documented above
  (archived → الأغراض; handovers → الطلبات, its triage sibling).
- **Notification badge on the bar**: gold fill `#F9B301`, navy text,
  ≥18px, ringed in the bar's navy — the bell's navy badge would vanish on
  the navy bar, so the bar badge is specified independently.

## Nav model (`navigation.ts`)
New pure model next to the sidebar definitions (same routes/icons/`end`
flags — no new permissions):
```ts
export interface MobileTabItem {
  labelKey: string;
  icon: LucideIcon;
  to?: string;                        // link tab
  action?: 'notifications' | 'more';  // button tab
  end?: boolean;
  prominent?: boolean;                // raised center action
  activePrefixes?: string[];          // extra routes that light this tab
}
export function getMobileTabs(role: Role): MobileTabItem[]
```
- STUDENT/EMPLOYEE: dashboard · browse · report(prominent) · my-reports ·
  my-claims.
- LOST_FOUND_MANAGER: dashboard · all-reports · matches · claims ·
  notifications(action).
- SUPER_ADMIN: dashboard · all-reports · matches · claims · more(action).

## Notifications tab (manager)
No notifications route exists and routes must not change, so the tab opens
a **bottom sheet** (Radix Dialog, bottom-anchored, following the AppShell
drawer pattern) listing notifications from `notificationsApi` under the
bell's existing query key `['notifications','bell']` **and the bell's
exact queryFn** (`list({ limit: 10 })`), so the cache — and therefore the
tab badge and the bell badge — is literally one source. Mark-read and
mark-all-read mutations in the sheet invalidate that key, updating both
badges. Rows are 48px+ Links to `linkUrl ?? '/dashboard'` (the bell's own
fallback, so bell and sheet behave identically); tapping marks read and
closes the sheet; mark-all-read (≥48px) and a 48px close control sit in
the sheet header. The sheet reuses the bell's loading (skeleton), empty,
and error/retry states. The bell component is untouched; the sheet's row
markup mirrors the bell's visual language (deliberate, documented
duplication: dropdown-item vs sheet-link container semantics differ).

## Admin report removal — surfaces
1. `navigation.ts`: drop `reportItem` from `ADMIN_NAVIGATION` (removes it
   from sidebar, collapsed-sidebar fast nav, and the mobile drawer at
   once).
2. `BrowseItemsPage`: hide the header CTA and the empty-state CTA when
   `user.role === 'SUPER_ADMIN'`.
3. Router: `ProtectedRoute` gains an optional `redirectTo` prop (default
   `/forbidden`); the `/lost-found/report` route moves to its own guard
   with `allowedRoles = [STUDENT, EMPLOYEE, LOST_FOUND_MANAGER]` and
   `redirectTo="/dashboard"`.
4. Bottom bar: admin layout has no report tab by construction.
5. Already clean (verified by grep): `ItemsReportListPage` shows its
   report CTA only for `isMine` (student/employee); the admin dashboard
   hero primary CTA is `/users`; `StudentSummaryGrid` is student-only.
   Server API untouched.
6. Manager mobile report path (Goldfish fix): the top hamburger drawer
   remains available to every role on mobile and keeps the manager's
   report item; additionally `ItemsReportListPage` shows its header
   report CTA to LOST_FOUND_MANAGER as well as `isMine` (never to
   SUPER_ADMIN), giving the manager a one-tap path from the registry.

## iOS zoom prevention
The shell's mobile range is `< lg`, so the fix uses the same breakpoint:
`ui/input.tsx` and `ui/textarea.tsx`: `text-sm` → `text-base lg:text-sm`.
Every native `<select>` and raw `<input>` in the client is audited by grep
(ReportItemForm, ClaimForm, ItemFilters, LocationFormDialog, DataTable —
the complete list) and gets the same `text-base lg:text-sm` treatment.
Acceptance asserts computed font-size ≥16px at 390px and at 844×390.

## Files
- `client/index.html` — viewport-fit=cover.
- `client/src/components/shared/navigation.ts` — mobile tab model; admin
  nav loses reportItem.
- `client/src/components/shared/MobileBottomNav.tsx` — new bar component
  (tabs, center action, keyboard hiding, badge).
- `client/src/components/shared/MobileNotificationsSheet.tsx` — new sheet.
- `client/src/components/shared/AppShell.tsx` — render bar + spacer, wire
  More → existing drawer state, wire notifications sheet state; mobile
  menu button grows to 44px.
- `client/src/routes/ProtectedRoute.tsx` — `redirectTo` prop.
- `client/src/routes/router.tsx` — report route guard change.
- `client/src/features/lost-found/items/BrowseItemsPage.tsx` — CTA role
  gate.
- `client/src/components/ui/input.tsx`, `ui/textarea.tsx`, form selects —
  16px mobile font.
- `client/src/i18n/locales/ar.ts` + `locales/types.ts` — short tab labels.
- `client/tests/navigation.test.ts` + `client/vitest.config.ts` +
  client `test` script — nav visibility coverage (vitest is already in
  the workspace lockfile via the server workspace; no new dependency).

## Goldfish review — findings and dispositions
Two fresh zero-context reviewers (mobile-UX lens "A"; edge-case/role lens
"B") read spec.md + plan.md + DESIGN.md only. Dispositions:

**Adopted (plan changed):**
- A1/B10 Label-fit claim was false (labels are 6–9 glyphs; slots are
  72px at 360px): corrected; explicit 11px/nowrap label spec; 360px
  proof by screenshot + DOM truncation assertion. Staff reports tab
  renamed to الأغراض (existing `nav.items`) to kill the
  البلاغات/الطلبات look-alike pair (A2).
- A3 Centre button capped at 52px; equal-flex slots keep neighbours at
  full 72px hit width; 360×640 hit-test added to verification.
- A4/B3/B6 Manager report path: hamburger drawer explicitly retained
  for all roles; report CTA added to the registry header for
  LOST_FOUND_MANAGER; manager drawer→report step added to the pass.
- A6/B9 Bar badge specified independently: gold fill, navy text (the
  bell's navy badge would vanish on the navy bar). Sheet uses the bell's
  exact queryFn; sheet mutations invalidate the shared key; badge
  mark-all flow verified in the browser pass.
- A7/B11 Verification widened: 360×640 Android pass, landscape 844×390,
  1023/1024px boundary checks; labels hide in short landscape.
- A9/B8 Keyboard: single primary signal (form-control focus) +
  thresholded visualViewport secondary; spacer collapses while hidden;
  state lifted to AppShell; acceptance honestly scoped to the focus
  signal in headless.
- A11 Spacer raised to 5.25rem + inset; sheet gains skeleton/empty/
  error-retry states (mirroring the bell).
- A12/B7 Zoom fix moved to the `lg` breakpoint and extended to a
  complete grep audit of native selects/inputs, with computed-size
  assertions at 390px and 844×390.
- B1 Parity test: every mobile link tab's route must exist in the same
  role's sidebar nav (drift-proofing the hand-written tab model).
- B2 EMPLOYEE mirrored in every nav test (it is a distinct Role value).
- B3 Keeper-role tests: STUDENT/EMPLOYEE/MANAGER sidebar navs still
  contain the report item.
- B4 Admin proof strengthened: full `/lost-found/report` grep inventory
  (below); browser pass forces the Browse empty state as admin and
  checks all-reports + item-detail DOMs for any report link.
- B5 Route→tab active mapping specified (see Design decisions) and
  checked in the pass (item detail, claim detail, admin /users).
- B12 Sheet rows use the bell's `linkUrl ?? '/dashboard'` fallback;
  bell and sheet share data and behaviour by construction.

**Rejected (with reason):**
- A5 Student notifications tab: the user's brief fixes the student tab
  set (dashboard/browse/report/my reports/my claims); the sticky mobile
  header keeps the bell — with its unread badge — visible on every
  screen. No slot exists without dropping a brief-mandated tab.
- A8 Gold overload: the bar's active treatment (gold icon + 3px gold
  indicator) is DESIGN.md's documented sidebar active state, mirrored
  deliberately; the centre action is the user-mandated primary action
  following the hero-CTA precedent. The two signals differ in shape,
  position, and label, and the centre button is raised/circular.
- A10 (partially) Header menu button goes to 44px, not 48px: DESIGN.md
  documents a 40px mobile menu button; 44px meets the platform HIG
  minimum while keeping the documented header proportions. All new
  components (bar slots, sheet controls, sheet rows) are ≥48px.
- B13 Spacer dead gap: kept at 5.25rem — the extra clearance is what
  keeps page-end content clear of the raised button; 12px of air at
  page end is cheaper than covered content.

**Report-route grep inventory** (every client reference to
`/lost-found/report`, audited for admin exposure): `navigation.ts`
(student/manager navs keep it; admin nav loses it), `DashboardPage`
(student/employee hero specs only), `StudentSummaryGrid` (student
dashboard only), `BrowseItemsPage` (role-gated by this feature),
`ItemsReportListPage` (`isMine`/manager only), `AppShell` ROUTE_KEYS
(page-title map only, not a link), `router.tsx` (guard changed by this
feature).

## Verification
Root typecheck; client build; root server suite; client nav tests
(incl. parity + EMPLOYEE + keeper-role assertions); seeded app + headless
Chromium: 390×844 and 360×640 and landscape 844×390 (touch, all 4 roles),
1023/1024px boundary spot-checks, 1440px desktop spot-check; Impeccable
detector over changed files; guard passes.
