# Plan: Search-First Design (006)

## Diagnosis (verified in code)
- `DashboardPage` renders one shared header (greeting card) for all four
  roles, then a role dashboard. STUDENT and EMPLOYEE both render
  `StudentDashboard`, so parity is structural: replacing the header only
  for those two roles keeps Admin/Manager byte-identical.
- `BrowseItemsPage` keeps filters in local state and never reads the URL,
  so the home hero's search/chips need the page to initialise its filter
  state from `?q=` / `?category=`. URL input is a trust boundary: the
  category value is validated against `LOST_FOUND_CATEGORIES`.
- `ItemFilters` is used only by `BrowseItemsPage` (grep-verified), so
  hiding its search input and category select behind props is safe; the
  report-type segmented control and the advanced-filters UI stay.
- `ItemCard` is used only by `BrowseItemsPage` (grep-verified).
  `RecentItemsStrip` has its own markup and is shared with Admin/Manager —
  not touched.
- Spec 004 gave `ReportTypeBadge`/`StatusBadge` a shared navy `overlay`
  shell (`BADGE_OVERLAY_CLASSNAME`). Concept 1 splits the report-type
  overlay by type: FOUND = solid gold, LOST = the existing navy shell.
  The status overlay stays exactly as 004 shipped it.
- Theme: the app's MNU tokens (`--mnu-navy`, `--mnu-gold`) are the brand
  source of truth; the mockup's sampled hexes (#081C3A / #C9A227) map to
  them. `bg-hero-navy` exists for the old header; the concept hero gets a
  sibling utility `bg-hero-concept` (radial highlight + deep-navy
  gradient) in `index.css`, plus `shadow-item` / `shadow-float` tokens in
  `tailwind.config.ts` carrying the concept's exact shadow values.

## Changes
1. `client/src/i18n/locales/ar.ts`: `lostFound.heroHeadlineStart`,
   `lostFound.heroHeadlineAccent`, `lostFound.heroSubtitle`,
   `lostFound.heroBrowseCta`, `lostFound.heroSearchPlaceholder`,
   `lostFound.heroSearchButton` — all copy taken from the concept, owned
   by the lostFound namespace since both hero surfaces are L&F search.
2. `client/src/features/lost-found/items/browseFilters.ts` (new, pure):
   `ItemFilterState` + `EMPTY_ITEM_FILTERS` move here from
   `ItemFilters.tsx`; `initialBrowseFilters(searchParams)` builds the
   initial state from the URL (validated category); `browsePathForQuery`,
   `browsePathForCategory` build the home hero's navigation targets.
3. `client/src/components/shared/BigSearchPill.tsx` (new): the 64px white
   pill form — search icon, input (16px on mobile), gold submit button.
   Controlled via `value` / `onValueChange` / `onSubmit` so the home hero
   (submit-to-navigate) and the browse hero (live filter binding) share
   one implementation.
4. `client/src/components/shared/CategoryChipsCard.tsx` (new): white
   floating card, `الكل` + one chip per category with its
   `categoryStyle` icon; active chip is navy with a gold icon; the row
   scrolls horizontally on small screens.
5. `client/src/features/dashboard/SearchFirstHero.tsx` (new): navy hero
   (headline, subline, pill, gold report CTA + ghost browse link) with
   the chips card overlapping its bottom edge; local query state,
   navigation on submit/chip select.
6. `client/src/features/dashboard/DashboardPage.tsx`: STUDENT/EMPLOYEE
   render `SearchFirstHero` instead of the greeting header; other roles
   keep the existing header untouched.
7. `client/src/features/lost-found/items/BrowseItemsPage.tsx`: hero
   header (headline, browse subtitle, pill bound to `filters.q`, report
   CTA when allowed, ghost anchor to `#browse-results`), chips card
   bound to `filters.category`, filters initialised from the URL,
   `ItemFilters` rendered with `hideSearch` + `hideCategory`.
8. `client/src/features/lost-found/items/ItemFilters.tsx`: state type +
   empty state imported from `browseFilters.ts` (re-exported for
   compatibility); optional `hideSearch` / `hideCategory` props.
9. `client/src/features/lost-found/items/ReportTypeBadge.tsx`: overlay
   variant — FOUND uses a solid gold shell (MNU gold bg, navy text),
   LOST keeps the 004 navy shell. Default variant unchanged.
10. `client/src/features/lost-found/items/ItemCard.tsx`: concept body —
    report number, title, location meta, time meta, footer (category
    chip + «التفاصيل» affordance); `shadow-item`; photo treatment and
    badge placement unchanged.
11. `client/src/index.css` + `client/tailwind.config.ts`: hero gradient
    utility and the two shadow tokens.
12. Tests: `client/tests/browseFilters.test.ts` — URL initialisation
    (query applied, valid category applied, unknown category falls back
    to ALL, unrelated params ignored) and the two path builders,
    data-driven where variants share one scenario.

## Verification
- Root typecheck, client production build, full client suite, full
  server suite (untouched — must stay 179/179).
- Live browser pass (seeded app, demo logins): student desktop + mobile
  home and browse, employee home, admin dashboard regression shot; hero
  search typed on home lands on filtered browse results; category chip
  lands filtered; adjacent surfaces regression-checked (browse filters
  end-to-end, item detail + claim card, Admin/Manager dashboards).
- Design audit: live shots compared element-by-element against
  `concept1-desktop.png` / `concept1-mobile.png`; every deviation fixed
  or justified in the delivery report.
- clean-code-guard + test-guard over the full 006 diff.
