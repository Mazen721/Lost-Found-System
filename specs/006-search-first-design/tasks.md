# Tasks: Search-First Design (006)

- [x] T1 spec.md + plan.md + tasks.md
- [x] T2 Theme: `bg-hero-concept` utility + `shadow-item` / `shadow-float` tokens; ar.ts hero strings
- [x] T3 browseFilters.ts (state move + URL initialisation + path builders) + ItemFilters props
- [x] T4 Shared BigSearchPill + CategoryChipsCard components
- [x] T5 SearchFirstHero + DashboardPage conditional header (Student/Employee only)
- [x] T6 BrowseItemsPage hero + chips + URL-initialised filters
- [x] T7 ReportTypeBadge overlay split (FOUND gold / LOST navy) + ItemCard concept body
- [x] T8 Client tests for browseFilters (URL init + path builders)
- [x] T9 Verify: root typecheck, client build, full client suite, full server suite
- [x] T10 Browser pass: student/employee/admin screenshots + hero search & chip flows + adjacent-surface regression
- [x] T11 Design audit vs concept1 screenshots (element-by-element, deviations fixed or justified)
- [x] T12 Guard passes (clean-code-guard + test-guard) over the diff
- [x] T13 Commits + regenerate delivery bundle (HEAD included) + clone-verify

## Verification record (2026-11-17)

- Root typecheck: 0 errors. Client build: passes (pre-existing >500 kB chunk warning only).
- Client tests: 74/74 (59 pre-006 + 15 new browseFilters). Server tests: 179/179, untouched.
- Browser pass: 18/18 checks, 0 console errors, 0 page errors. Screenshots in test-artifacts/design006-*.png.
- Design audit vs concept1-desktop/mobile: deviations are the app shell framing the hero,
  12 real categories vs the mockup's 8 (card scrolls), report number kept on cards,
  theme --mnu-gold token vs the mockup's sampled hex. Mobile pill raised 56px -> 64px during the audit.
- Guards: clean-code-guard prompted extracting shared SearchHero + HeroReportLink (hero chrome
  was duplicated across the two hero surfaces); test-guard: new URL/filter behavior covered by
  unit tests, end-to-end flows covered by the live pass; no existing test weakened.
