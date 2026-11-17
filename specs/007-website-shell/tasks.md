# Tasks: Website Shell + Dedicated Home Page (007)

- [x] T1 spec.md + plan.md + tasks.md (Goldfish skipped — design approved interactively via mockups)
- [x] T2 i18n strings (brand subline, nav.home/topBrowse/groupMyAccount, home.latestItems)
- [x] T3 Nav model: student drawer arrangement, top links + isTopLinkActive, landingPathForRole, student home tab → /home
- [x] T4 UserMenu extraction (navy chip) + NotificationBell tone prop
- [x] T5 TopNavbar (sticky + flush variants) + NavDrawer (replaces Sidebar)
- [x] T6 HomeHero (flush) + HomePage (chips overlap + latest items grid)
- [x] T7 AppShell rewrite (navbar, home navy zone, drawer state; sidebar/headers removed)
- [x] T8 DashboardPage hero removal + router (/home, LandingRedirect) + LoginPage landing redirects
- [x] T9 Delete Sidebar.tsx + SearchFirstHero.tsx; evolve navigation tests
- [x] T10 Verify: root typecheck, client build, full client suite, full server suite
- [x] T11 Browser pass: every role/page, drawer flows, admin report guard, design007 screenshots
- [x] T12 Design audit vs approved home-concept renders (deviations fixed or justified)
- [x] T13 Guard passes (clean-code-guard + test-guard) over the diff
- [x] T14 Commits + regenerate delivery bundle (HEAD included) + clone-verify

## Verification record (2026-11-17)

- Root typecheck: 0 errors. Client build: passes (pre-existing >500 kB chunk warning only).
- Client tests: 95/95 (navigation suite evolved 22 → 43: drawer arrangement, top links per
  role, admin no-report on all surfaces, isTopLinkActive, landingPathForRole, /home tab).
- Server tests: 179/179 (16 files), untouched — no server changes in this spec.
- Browser pass: 27/27 checks, 0 console errors, 0 page errors, 0 failed app requests.
  Covered: student + employee land on /home (desktop + mobile), no sidebar anywhere,
  drawer open/close/navigate for student + admin, student dashboard back to its greeting
  header, browse hero retained, report form, employee claim card, manager dashboard +
  claims queue, admin dashboard + users page, admin /lost-found/report guard. The only
  failed requests were 3 loads of one external seed photo (Movistar host blocked by the
  sandbox proxy, same as spec 006) — not app errors. Screenshots in
  test-artifacts/design007-*.png.
- Design audit vs home-concept renders: navbar (brand, gold-pill active link, «القائمة»,
  bell, user chip), flush hero in the same navy zone (measured gap = 0), overlapping
  category card (measured overlap 32px), «أحدث البلاغات» grid, drawer composition and the
  mobile top/bottom bars all match. Justified deviations: (1) 12 real categories vs the
  mockup's 8 — the card scrolls horizontally, as in the mockup's own mobile row;
  (2) real ItemCards keep the spec 004/006 report number + status overlay; (3) on the
  home route the navbar is part of the navy zone and scrolls away with it (sticky on all
  other pages) — the price of a seam-free continuous navy block; (4) content container is
  1280px (mockup: 1240px content / 1280px navbar) so navbar and content edges align;
  (5) Browse keeps its rounded spec-006 hero card under the navbar — it reads as the
  page-header card pattern the staff dashboards also use.
- Guards: clean-code-guard — one fix applied (the unused `icon` field was dropped from
  the top-link model; YAGNI), the route-matching core is shared between the bottom bar
  and the top links instead of duplicated, UserMenu extracted rather than duplicated.
  test-guard — all new behaviour (top links, drawer model, landing paths, active-route
  mapping) has unit tests; no existing test was weakened or deleted (expectations were
  updated only where spec 007 deliberately changed the model: student home tab route,
  full-menu naming); end-to-end flows are covered by the live pass.
