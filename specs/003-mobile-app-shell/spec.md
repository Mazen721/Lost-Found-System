# Feature Spec: Mobile App Shell + Admin Report Removal (003)

## Problem
The product's primary users — students and employees at Mansoura National
University — reach for it on a phone, in the moment, when they have just lost
or found something on campus. The current mobile experience is the desktop
portal squeezed down: navigation hides behind a hamburger drawer, the primary
action (report an item) is two taps deep, and nothing about the shell feels
like the apps students already use. Separately, the Super Admin still sees
«الإبلاغ عن غرض» (Report item) affordances even though reporting is a
student/employee/manager job, not an admin one.

## Requirements
- On mobile (< lg), the authenticated shell gains a fixed bottom navigation
  bar in the native-app pattern: icon + short Arabic label per tab, active
  route highlighting, safe-area inset padding, ≥48px touch targets. The
  desktop shell (≥ lg: sidebar, top bar) is unchanged.
- Tabs reuse the existing sidebar navigation model (`navigation.ts`) as the
  source of truth for routes, icons, and role permissions — no new routes,
  no new permissions, no data changes.
  - STUDENT / EMPLOYEE: dashboard · browse · **report as a prominent raised
    center action** · my reports · my claims.
  - LOST_FOUND_MANAGER: dashboard · all reports · matches · claims queue ·
    notifications (bottom sheet, unread badge from the existing bell query).
  - SUPER_ADMIN: dashboard · all reports · matches · claims · «المزيد»
    (More) opening the existing full navigation drawer.
- Main content gains bottom clearance on mobile so the bar never covers
  content; the bar sits below dialogs/sheets in z-order and hides while the
  on-screen keyboard is open so it never fights the report form.
- Mobile forms must not trigger iOS focus zoom: text inputs, textareas, and
  selects render at 16px on mobile.
- SUPER_ADMIN no longer sees «الإبلاغ عن غرض» anywhere: sidebar + fast nav,
  mobile bottom bar (no report action), mobile drawer, Browse page CTAs, and
  any dashboard CTA. Direct client navigation to `/lost-found/report` as
  SUPER_ADMIN redirects to `/dashboard`. Server API permissions are NOT
  changed (admin keeps full-control API access); this is a product/UX
  removal. All other roles keep the report option exactly as before.
- Design language stays the locked one: Mansoura navy/gold, Cairo, Arabic
  RTL, modern-but-official (DESIGN.md incl. the 2026-11 Lost & Found
  refresh). The gold center action follows the shipped hero primary-CTA
  precedent (gold fill, navy ink) documented in DESIGN.md.

## Acceptance
- Typecheck 0 errors; client build passes; full server suite green.
- Client nav-model tests cover the visibility rules (admin: no report item
  in sidebar nav and no report/prominent tab in mobile tabs; student AND
  employee: prominent report tab present; manager: notifications action
  tab present; keeper roles' sidebar navs still contain report; every
  mobile link route exists in the same role's sidebar nav — parity).
- Headless-Chromium mobile pass (390×844 and 360×640, touch) for all 4
  roles: dashboard + browse screenshots with the bar visible, every bottom
  tab tapped through, report form reached as Student via the center action
  and as Manager via the drawer, the manager notifications badge cleared
  via the sheet, and as SUPER_ADMIN no report affordance anywhere
  (including the forced Browse empty state) + direct report-URL
  navigation lands on /dashboard. Landscape 844×390 and the 1023/1024px
  boundary are spot-checked. Desktop (1440px) spot-check: sidebar and
  layout unchanged, admin report option gone there too.
- clean-code-guard and test-guard passes over the changes are clean.
