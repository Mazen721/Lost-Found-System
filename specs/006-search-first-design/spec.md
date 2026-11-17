# Feature Spec: Search-First Design «دوّر الأول» for Students & Employees (006)

## Problem
The user found the student experience "hard, not attractive, not easy for a
first-time student". Three design directions were mocked up with real content
(`~/workspace/design-concepts/`); the user picked **Concept 1 — «دوّر الأول»
(Search-First Bold)** and gave the go-ahead with two explicit defaults:
**pure Concept 1** (nothing borrowed from Concepts 2/3) and scope limited to
the **Student/Employee experience** this round.

## Requirements
- Student and Employee home (they share one dashboard — role parity is a
  locked rule): the current greeting header is replaced by the Concept 1
  navy hero —
  - headline «ضاع منك حاجة؟ دوّر عليها هنا» (second half in gold),
  - one huge white pill search (64px) with a gold «دوّر» button inside;
    submitting routes to Browse with the query applied,
  - gold «أبلغ عن غرض» CTA + ghost «تصفح أحدث البلاغات» button,
  - a white floating category card overlapping the hero's bottom edge;
    chips route to Browse filtered by that category,
  - the existing dashboard content (summary cards, tracker, updates rail,
    recent reports) stays below, restyled only where it meets the hero.
- Browse page: navy hero header with the same big search bound to the
  page's existing search state, the floating category card bound to the
  category filter, and all existing filters (report type, advanced
  filters, active-filter chips, reset) preserved and reachable.
- Browse honours `?q=` and `?category=` URL parameters on first load so
  the home hero's search and chips land on a filtered list. An unknown
  category value falls back to "all categories".
- ItemCard adopts the concept card: 16px radius, soft navy-tinted shadow,
  concept body layout (title, location, time, footer with category chip
  and a «التفاصيل» affordance). On photos, the report-type pill is solid —
  gold with navy text for «معثور عليه», navy with white text for
  «مفقود» — while the status pill keeps the spec 004 navy overlay.
- Mobile (<lg): hero compresses (smaller headline, search stays
  prominent), category chips become a horizontally swipeable row, the
  spec 003 bottom bar and its clearance stay as they are, no horizontal
  overflow, search input keeps a ≥16px font (iOS zoom rule from 003).
- All new copy goes through `client/src/i18n/locales/ar.ts`.

## Out of scope
- Admin/Manager page layouts and dashboards: untouched. ItemCard is used
  only by Browse, so the card restyle reaches staff only through Browse
  itself (accepted in the brief).
- Report form, item-detail page and the «ده الغرض بتاعك؟» claim card:
  unchanged this round.
- No route, query, permission, or claim-flow changes. No server changes.
  No seed changes.
