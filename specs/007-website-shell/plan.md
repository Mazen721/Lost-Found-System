# Plan: Website Shell + Dedicated Home Page (007)

## Diagnosis (verified in code)
- `AppShell` owns all chrome today: a fixed desktop `SidebarContent`
  (with a collapse preference), a Radix `Dialog` drawer for mobile that
  reuses the same content, a light mobile header, a light desktop header
  (breadcrumb title, date chip, bell, user dropdown), and the spec 003
  bottom bar. `SidebarContent` is imported only by `AppShell`.
- `navigation.ts` is the single nav model: `getNavigation(role)` (grouped
  full menu), `getMobileTabs(role)` (bottom bar) and `isMobileTabActive`.
  The spec 003 tests assert parity between the two models.
- The seam problem: the mockup's navy zone is ONE continuous block
  (navbar + hero). Two adjacent elements with the `bg-hero-concept`
  gradient would restart the gradient and show a seam. Solution: on the
  home route, `AppShell` renders one `bg-hero-concept` wrapper containing
  the (transparent, non-sticky) navbar and the flush hero; on every other
  route the navbar is a sticky navy bar of its own. The hero therefore
  lives in `components/shared/HomeHero.tsx` (shell chrome, like
  `SearchHero`), and the route component renders only the below-fold
  content (chips card with the -mt-8 overlap + latest-items grid).
- `DashboardPage` renders `SearchFirstHero` only for STUDENT/EMPLOYEE;
  removing it restores the pre-006 greeting header for all roles (the
  header JSX is still there, behind the conditional).
- `LoginPage` hardcodes `/dashboard` in three places (already-signed-in
  redirect, form submit default, demo login). `login`/`demoLogin` return
  the `AuthUser`, so the redirect can be computed from the signed-in role
  via a new `landingPathForRole(role)` model helper.
- `NotificationBell`'s trigger is a ghost button styled for light
  surfaces; it gains a `tone` prop (`light` | `onDark`) — the dropdown
  panel is unchanged. `UserMenu` (currently private to `AppShell`) moves
  to its own file and its trigger is restyled as the mockup's navy chip
  (translucent white, gold avatar); the dropdown content is unchanged.

## Changes
1. `client/src/i18n/locales/ar.ts`: `meta.university`, `nav.home`,
   `nav.topBrowse`, `nav.groupMyAccount`, `home.latestItems`.
2. `client/src/components/shared/navigation.ts`:
   - `NavigationGroup.titleKey` becomes optional (the mockup drawer's
     first student group has no heading).
   - Student/Employee full menu becomes the mockup drawer arrangement
     (home, browse, report / «حسابي»: my reports, my claims, dashboard);
     Manager/Admin menus unchanged.
   - New `TopLinkItem` model + `getTopLinks(role)` +
     `isTopLinkActive(link, pathname)`; the route-matching core is
     shared with `isMobileTabActive` (one helper, two models).
   - New `landingPathForRole(role)`: STUDENT/EMPLOYEE → `/home`, staff →
     `/dashboard`.
   - Student/Employee bottom-bar home tab: route `/dashboard` → `/home`,
     icon LayoutDashboard → Home (matches the mockup's house icon).
3. `client/src/components/shared/UserMenu.tsx` (new): extracted from
   `AppShell`, trigger restyled for the navy navbar.
4. `client/src/components/shared/NotificationBell.tsx`: `tone` prop.
5. `client/src/components/shared/TopNavbar.tsx` (new): brand + top links
   + «القائمة» + bell + user chip; `flush` variant (transparent, static)
   for the home zone, sticky navy bar otherwise; responsive — top links
   and user chip hide below lg, «القائمة» and bell stay.
6. `client/src/components/shared/NavDrawer.tsx` (new): the Radix dialog
   drawer (302px, navy) with brand header, role chip, grouped nav from
   `getNavigation`, and the user block + logout for all roles. Replaces
   `Sidebar.tsx` (deleted) and the AppShell mobile dialog.
7. `client/src/components/shared/HomeHero.tsx` (new): flush hero content
   (headline, subtitle, `BigSearchPill` submit → Browse `?q=`, gold
   report CTA + ghost browse link). Replaces `SearchFirstHero.tsx`
   (deleted).
8. `client/src/features/home/HomePage.tsx` (new): overlapping
   `CategoryChipsCard` (select → Browse `?category=`) + «أحدث البلاغات»
   grid (`itemsApi.list` scope active, latest 8, spec 006 `ItemCard`),
   with loading / error / empty states.
9. `client/src/components/shared/AppShell.tsx` (rewrite): navbar +
   optional home navy zone, full-width main (≈1280px container; bare
   main on `/home` where the page owns its padding), drawer state, spec
   003 bottom bar + notifications sheet + keyboard handling retained.
   Sidebar collapse state, `DesktopFastNav`, breadcrumb/date header and
   the old mobile header are removed.
10. `client/src/features/dashboard/DashboardPage.tsx`: drop the
    `SearchFirstHero` conditional — all roles use the greeting header.
11. `client/src/routes/router.tsx`: `/home` route (STUDENT/EMPLOYEE,
    others redirect to `/dashboard`); index route becomes a role-aware
    `LandingRedirect`.
12. `client/src/features/auth/LoginPage.tsx`: all post-login redirects go
    through `landingPathForRole` (an explicit `from` destination is still
    honoured first).
13. `client/tests/navigation.test.ts`: evolved — full-menu (drawer)
    naming, student tab route set updated for `/home`, plus new coverage
    for top links (incl. the admin no-report rule on every surface),
    `isTopLinkActive`, drawer completeness and `landingPathForRole`.

## Verification
- Root typecheck 0 errors; client build passes; full client suite green;
  full server suite 179/179 untouched.
- Live browser pass over every role and page (shell changed globally):
  home (student + employee, desktop + mobile), drawer open/close,
  student dashboard, browse, item detail + claim card, report form,
  manager dashboard + claims queue, admin dashboard + users page,
  admin `/lost-found/report` guard. 0 console/page errors; screenshots
  `test-artifacts/design007-*.png`; element-by-element audit of the home
  screenshots against the approved mockup renders.
- clean-code-guard + test-guard over the diff.
