# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

CampusCare Lost & Found is used by people at Mansoura National University (MNU). Four roles stay, and each person only does their own job:

- Students report lost or found items, browse reported items, and follow their own reports and pickup claims.
- Employees have exactly the same abilities as students: report, browse, and follow their own reports and claims.
- The Lost & Found Manager reviews match suggestions, checks claims against private identification details, records handovers, and manages all reports.
- The Super Admin does everything the Manager does, and also creates accounts, manages locations, and reads the activity log. The Super Admin does not report items. Nobody can sign themselves up; accounts are created by the Super Admin.

Most students and employees use the product on their phones, in the moment they lose or find something. On mobile the product behaves like an app: a bottom navigation bar with reporting as the central action. Managers and the admin also work from desktop, where a sidebar replaces the bottom bar.

## Product Purpose

CampusCare Lost & Found is Mansoura National University's tool for one job: getting a lost item back to its owner. It exists so that job moves through a recorded path instead of informal messages. Success means a person can sign in, report or find an item in under a minute, and carry it through matching, claim, and a recorded handover.

The committed institution is Mansoura National University (MNU).

## Positioning

It is the university's own lost-and-found system, not a public listings board. A lost-and-found match is a suggestion, not proof of ownership: the Manager checks a claim against private identification details before anything is handed over. Those private details stay hidden from everyone except the reporter, the Manager, and the admin. The matching engine is deterministic scoring (category, title, location, date, keywords, colour, brand), not AI; AI appears only in the Lost & Found insights summaries.

## Operating Context

People use it in a browser while signed in, mostly on mobile. Places are shared records of building, floor, and room.

Lost and found runs from a lost or found report, through a suggested match, a claim, the Manager's check against private details, and a recorded handover. The matching engine is built for messy human input: different titles for the same item, synonyms, dialect, typos, and missing model names must still match, while conflicting model numbers, colours, or brands must not.

Notifications stay inside the product. The admin keeps users, locations, and an activity log. The product is Arabic only, laid out right to left, set in the Cairo typeface. There is no English interface and no language toggle.

The current product behavior is specified in `specs/001-campuscare-platform/spec.md` as amended by `specs/002-hard-matching/` (matching engine v2) and `specs/003-mobile-app-shell/` (mobile app shell, admin report removal). `MASTER_SPEC.md` is the historical spec of the retired two-module CampusCare platform and no longer describes this product.

## Capabilities and Constraints

Keep the Lost & Found module only, all four roles, admin-created accounts (no self-registration), the privacy rule for lost-and-found details, Arabic-only RTL, and the deterministic matching engine. The Super Admin never sees the report-an-item option.

The current visual design (Mansoura navy and gold, Cairo, modern-but-official refresh with rich dashboards and photo-first item cards) is the committed design language, recorded in `client/DESIGN.md`.

The committed institution is Mansoura National University (MNU). No separate accessibility standard was chosen beyond large touch targets and readable type on mobile.

## Brand Commitments

The product name is CampusCare Lost & Found for Mansoura National University (MNU). The committed brand assets are `client/public/Mansoura National University Emblem.png` and `client/public/Mansoura National University Entrance.png` (`client/public/favicon.svg` remains as the browser favicon).

## Evidence on Hand

- `specs/001-campuscare-platform/spec.md`, `specs/002-hard-matching/spec.md`, and `specs/003-mobile-app-shell/spec.md` — the written product behavior.
- `client/src/i18n/locales/ar.ts` — the Arabic copy (the only locale).
- `client/public/Mansoura National University Emblem.png`, `client/public/Mansoura National University Entrance.png`, and `client/public/favicon.svg` — the MNU emblem, entrance photograph, and favicon.
- Demo accounts for the four roles can be created by the project's seed script. They are demo data, not evidence of a live campus.

Do not invent testimonials, unverified campus photography, usage numbers, or press.

## Product Principles

- Lost & Found is the whole product; there is no maintenance module.
- Each person only reaches the work their role allows; the Super Admin manages but does not report items.
- Private identification details are shown only to the reporter, the Lost & Found Manager, and the admin.
- Arabic only, right to left, Cairo — on every screen, with no language toggle.
- Mobile is the primary surface for students and employees: app-like bottom navigation, reporting one tap away.
- Matching must survive messy human titles and must refuse confident matches when model, colour, or brand conflict.

## Accessibility & Inclusion

The product must work in Arabic, laid out right to left, with touch targets of at least 44px on mobile and form text large enough to avoid focus zoom on phones. No further accessibility standard was set.
