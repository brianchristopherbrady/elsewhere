# Elsewhere Verification

## Separate Library And Settings Update

Current navigation is Discover, Saved items, Create a Day and My Calendar. Discover is search/collection only. Saved items owns browser-local notes, tags, filtering and removal. The day builder consumes independent snapshots through a condensed searchable/category/tag/date-filtered list; timing, ordering and See my day remain intact. Settings replaces both the top theme toolbar and code icon, with appearance, accessibility preferences, profile name, password recovery and sign-out. The six existing visual themes and Seattle identity are preserved.

Final verification on Windows, Node 24.19 and Playwright Chromium:

- `npm test`: 36 tests across 9 files passed.
- `npm run test:e2e`: all 49 tests passed in one clean run without snapshot updates. Coverage includes independent library annotations/removal, copied-note isolation, calendar snapshots, combined filters, inclusive date availability, profile failure/retry, persisted preferences, password-recovery handoff, modal focus restoration, keyboard/pointer ordering and existing account/source workflows.
- Six-theme WCAG-tagged axe checks passed for the new library and Settings, alongside existing discovery, builder, calendar, map and feed scans. Responsive coverage includes 320-1536 CSS pixels, enlarged root text, text spacing, reduced motion and forced colors. Settings replaces the old theme-toolbar screenshot contract; the filter-dialog contract still passes.
- `npm run build`: TypeScript and Vite passed. JavaScript 676.77 kB (203.98 kB gzip); CSS 73.33 kB (17.88 kB gzip). The existing greater-than-500-kB bundle warning remains.
- Editor diagnostics: no errors. Preview http://127.0.0.1:5178/ returned HTTP 200. Browser tests use a separate server/database on port 5179.
- Screenshots visually inspected include the Discover desktop composition, builder desktop, Settings 320px baseline, mobile saved library/compact picker, Nocturne dark library and Civic Modern light Settings. Generated evidence is under `test-results/saved-items-saved-library--c0184-r-reflow-with-long-metadata/`, `test-results/design-system-toolbar-and-dialog-visual-contracts/` and `tests/design-system.spec.ts-snapshots/settings-320-win32.png`.

Testing found and corrected focus restoration when conditionally mounted dialogs close, React Strict Mode native close-event timing, and account-heavy test fixtures hitting production signup limits. Rate limits remain unchanged. Contrast scans wait for dialog opening animations to settle.

Limits: saved items/preferences are browser-local; calendar days are account-backed. Real password-reset delivery still requires configured mail credentials and was not exercised here. Physical devices, real screen readers and actual browser zoom remain unverified. Source/map and sharing limits below still apply. Earlier sections are historical verification records.

## Collect And Create Update

Current workflow: Discover collects browser-local activity ideas; Create my day is date-first with inline discovery, optional arrival/departure and notes; See my day provides mapped locations and uncertain totals where necessary; account Saved days supports calendar rescheduling and same-record editing. See [Workspace workflows](workspace-views.md).

The design retains Elsewhere's editorial Seattle identity and all six existing lens/mode combinations. The previous competing discovery/itinerary panels are separated into collecting and organizing routes. Desktop uses a main editor with adjacent activity options; mobile stacks these sections. The saved calendar has bounded horizontal scrolling and separate accessible date/action alternatives.

Verified on Windows, Node 24.19, Chromium/Playwright:

- `npm test`: 34 tests passed across 9 files, including safe activity snapshots, nullable timing, conflict-aware totals, owner-isolated saved-day updates and preserved account recovery behavior.
- `npm run test:e2e`: all 45 tests passed in one clean run. Coverage includes independent ideas, reload persistence, date-picker keyboard selection, inline city/music discovery, optional timing/metadata, button/keyboard/pointer ordering, calendar drag/date-input moves, failed-move retry, same-ID editing after reload, deletion without draft loss, account flows and legacy storage.
- Six-theme representative axe scans passed for discovery, builder, map review, saved calendar, live feeds and dialogs. Reflow covers 320-1536 CSS pixels; enlarged root text, spacing overrides, reduced motion, forced colors and existing toolbar/dialog screenshot baselines also passed. These are emulations, not real assistive-technology certification.
- `npm run build`: TypeScript and production build passed. JS 671.36 kB (202.80 kB gzip), CSS 71.72 kB (17.63 kB gzip). Vite still reports the greater-than-500-kB chunk warning; route-level lazy loading remains a performance follow-up.
- Editor diagnostics: no errors reported. Final screenshots visually inspected: `test-results/date-picker-mobile.png`, `day-builder-mobile.png`, `day-review-desktop.png`, `planned-calendar-desktop.png` and `saved-days-mobile.png` (all under `test-results/`). Map tiles and clustered markers rendered; missing source coordinates remain explicit instead of generating false routes.
- Development preview: http://127.0.0.1:5178/. Browser tests use their own server/database on port 5179.

Testing corrected JSON fixture dates, accessible names, keyboard-drag activation timing, modal focus/scroll timing, selected mobile view styling, modal error placement, and stale editing identity after deletion. Overlapping schedules now leave remaining time undetermined.

Limits: ideas are browser-local, while saved days are account-backed. City/music snapshots do not refresh automatically and currently lack verified coordinates. Walks are approximate, not routed or accessibility-aware. Day-level metadata is not included in shared links. Physical devices, NVDA/JAWS/VoiceOver, other browser engines and actual browser zoom remain untested. No authenticated Ticketmaster or real email delivery was exercised. The older sections below are historical evidence, not claims about the current feature set or test counts.

## Seattle Update

The app now uses seven real Seattle places and one published SAM tour, with official source links and source review dates. See [Seattle data](seattle-data.md). The Lisbon results below are historical, not the current dataset description. Seattle checks include 13 unit tests, date-sensitive event workflows, unknown hours/access, isolated persistence, six-theme reflow and axe scans, and keyboard expansion/activation of clustered map venues. The mock weather has been removed; imagery remains explicitly illustrative.

The first Seattle browser run found overlapping map targets at co-located venues. Leaflet.markercluster resolved the spacing issue; focused six-theme axe checks then passed. A keyboard regression also caught missing individual marker activation, now explicitly handled and passing. Physical-device, real screen-reader, and actual browser-zoom limits still apply.

Date: 2026-09-17. Working portfolio prototype, not a formal WCAG conformance evaluation.

## Environment

- Windows, Node.js 24.19.0, React 19, Vite 6.4.3, TypeScript 5.7, Vitest 4.1.11.
- Chromium through Playwright and the VS Code integrated browser.
- Live app at http://127.0.0.1:5173/ during verification.
- Fictional Lisbon fixtures; no authentication, payment, booking, or real customer data.

## Passed Checks

- `npm test`: 10 domain tests, covering combined filters, saved independence, sorting, opening hours, duplicate prevention, travel scheduling, conflicts, post-midnight opening, generation, balance/share output, and corrupt persistence rejection.
- `npm run test:e2e`: 7 browser tests passed. The suite covers six lens/mode combinations, control focus, itinerary preservation, 320/375/768/1024/1440px reflow, search/autocomplete labeling, save, add, preview, reorder, remove, undo, reload persistence, filter modal, reverse tab wrap, Escape/focus return, schedule warnings, zero-result recovery, generation, share import, inspector, keyboard and pointer drag, mobile share, text spacing, reduced-motion/forced-colors emulation, tile failure, and loaded-app offline planning.
- Axe scans with WCAG 2 A/AA, 2.1 AA and 2.2 AA tags: zero reported violations in the six representative lens/mode screens and the tested detail dialog.
- TypeScript and production Vite builds passed. Approximate initial bundle: 480 kB JavaScript (147 kB gzip), 51 kB CSS (14 kB gzip). Map and drag libraries account for part of this cost; no additional chart framework was added.
- `npm audit` after the Vitest patch: zero known vulnerabilities reported.
- Live screenshots inspected for Field Journal desktop/mobile, Nocturne dark desktop, and Civic Modern light desktop. Map measured nonzero, all eight destination photos loaded, and no horizontal document overflow was observed in the checked viewports.

## Corrections Found Through Testing

- Replaced a map source that served API-key watermark imagery with attributed OpenStreetMap tiles.
- Replaced a failed gallery photograph and corrected garden/rooftop illustrative subjects.
- Added explicit modal tab wrapping and kept live status feedback inside active modal content.
- Excluded the planner parent drop zone from stop-sort collision candidates.
- Synchronized keyboard tests with dnd-kit activation rather than racing key events.
- Separated Vitest discovery from Playwright tests.
- Removed card animation fill behavior that could override drag transforms.
- Bound the map route to the active CSS accent token to avoid stale theme colors.

## Limits and Follow-Up

1. Actual NVDA/JAWS/VoiceOver, physical touch devices, Firefox/Safari, and actual 200%/400% browser zoom have not been tested. Viewport resizing, text-spacing overrides, and browser media emulation are not substitutes for those checks.
2. The six-mode axe sweep is representative, not exhaustive across every dialog, error, filter, or state combination. Manual contrast and reading-order review remains valuable.
3. Theme state and control focus are tested. Exact pixel scroll anchoring during large lens composition changes is not guaranteed; stable DOM/data identity is preserved.
4. Offline support is limited to an already loaded app. External images, fonts, and maps may fail; cold-start offline/service-worker caching is not implemented.
5. Travel lines and durations are illustrative, not street routing. Weather, opening times, access statements, recommendations, and cost estimates are fictional. Photography depicts the category/atmosphere, not actual named venues.
6. Inspector contrast is the solid text/canvas token pair only. Its palette preview is not a real OS forced-colors simulation. Component selection reports the first mounted instance.
7. Motion is deliberately restrained. Full shared-element transitions, destination-derived palette extraction, and parallax are not implemented.
8. For production traffic, review map-provider capacity/policy, local asset delivery, cross-browser support, and deployment URL handling. No backend or real external integrations are included.

## Artifacts

- Product brief: `plan.md` (preserved).
- Implementation scope: `docs/implementation-plan.md`.
- Source and run guide: `README.md`.
- In-app component, token, responsive, and accessibility documentation: `public/system.html`.
- Automated checks: `src/planner.test.ts` and `tests/app.spec.ts`.
- Playwright failure captures/traces are generated under ignored `test-results/` when checks fail; successful runs do not imply a permanent visual baseline.