# Feature Spec: Website Shell + Dedicated Home Page (007)

## Problem
Spec 006 put the Concept 1 hero on top of the Student/Employee dashboard.
The user rejected that structure: the page a student or employee lands on
after login must be a **dedicated home page** («صفحة رئيسية») in the
Concept 1 style — hero search on top, latest lost & found items below —
and the dashboard (personal widgets) stays a **separate page**.

Iterating through mockups (`~/workspace/design-concepts/home-concept.html`
and its desktop / drawer / mobile renders, matching the user's own
Concept 1 reference screenshots), the user then went further:

- **No persistent sidebar at all.** The full menu lives in a drawer that is
  **closed by default** and opens only when the user asks for it.
- The navigation buttons sit **on top, on the navy**, «زي ديزاين الويبسايت
  العادي» — like a normal website's top navbar.
- The navy zone must extend **full-bleed to the very top** of the page so
  the home page is eye-catching, exactly like the first Concept 1 picture.

The user approved the final mockup («حلوه اوي دي اعملها») — the mockup is
the contract for this spec. Because the design was iterated and approved
interactively with the user via mockups, the Goldfish review step is
**skipped for this spec** (recorded here per the standing workflow).

## Requirements

### A. Website shell for ALL roles (replaces the persistent sidebar)
- Desktop (≥lg): a navy top navbar spanning the full width at the very
  top — brand (emblem + «المفقودات والمعثورات» + university line),
  horizontal role-based top links (active = gold text on a translucent
  gold pill), and on the other side: a «القائمة» button, the notifications
  bell (existing dropdown behaviour), and the user chip (name + role,
  existing account menu incl. profile + logout).
- The complete per-role menu lives in a slide-in drawer from the right,
  **closed by default**, opened via «القائمة» (desktop and mobile),
  closing on navigation, scrim click, ✕ and Escape. The drawer carries
  the complete existing per-role navigation plus the user block and
  logout. For Student/Employee the drawer follows the approved mockup:
  الرئيسية · تصفّح المفقودات والمعثورات · الإبلاغ عن غرض, then a «حسابي»
  group with بلاغاتي · طلبات الاستلام الخاصة بي · لوحة التحكم. Manager and
  Admin keep their existing sidebar items, order and grouping.
- No persistent sidebar remains for any role. Page content becomes
  full-width under the navbar (content max-width ≈1280px, aligned with
  the navbar; dashboards keep their existing internal layouts).
- Mobile (<lg): navy top bar (brand + «القائمة» + bell); the spec 003
  bottom bar stays — same tabs per role, raised gold centre «إبلاغ» for
  Student/Employee, Manager notifications sheet, Admin «المزيد» opening
  the (same) full-menu drawer. One evolution: the Student/Employee
  «الرئيسية» bottom tab now routes to the new home page `/home` (it
  previously routed to the dashboard, which is now «لوحة التحكم»).
- Top links per role are the most-used destinations from that role's
  menu; everything else is drawer-only. SUPER_ADMIN gets **no**
  «الإبلاغ عن غرض» entry anywhere (top links, drawer, bottom bar) and
  the `/lost-found/report` route guard stays as spec 003 shipped it.

### B. Dedicated home page for Student/Employee
- New route `/home`, STUDENT + EMPLOYEE only. After login they land
  **here**, not on the dashboard (login redirect and the app index route
  both become role-aware: Student/Employee → `/home`, staff → `/dashboard`).
- Composition exactly as the approved mockup: the navbar's navy zone
  continues flush into the hero (headline «ضاع منك حاجة؟ دوّر عليها هنا»,
  subtitle, big pill search routing to Browse with the query applied,
  gold «أبلغ عن غرض» CTA + ghost «تصفّح أحدث البلاغات»), the white
  category card overlapping the navy bottom edge (chips route to Browse
  filtered, as spec 006), then «أحدث البلاغات» — a grid of the latest
  items using the spec 006 ItemCard, with «عرض الكل» routing to Browse.
- The Student/Employee dashboard keeps its existing route and content,
  with the spec 006 hero **removed** (the pre-006 greeting header
  returns); it is reachable via the «لوحة التحكم» nav entry.
- Browse keeps its spec 006 search hero and behaviour.
- Manager and Super Admin landing stays their dashboards; no home page
  for staff this round.

## Out of scope
- No server changes, no seed changes, no permission changes (client
  routes/redirects only). Admin/Manager page **contents** are unchanged —
  shell only.
- Report form, item detail + claim card, claims/matches/users/locations
  pages: unchanged.
- All new copy goes through `client/src/i18n/locales/ar.ts`.
