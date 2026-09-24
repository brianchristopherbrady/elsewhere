# Design System Upgrade

## Audit and Acceptance Plan

September 17, 2026. Single-engineer upgrade, not an independent accessibility audit.

Elsewhere supports Seattle discovery, saved places, dated planning, map exploration,
and a live municipal calendar. Preserve all routes, source links, filtering,
local persistence, sharing, event constraints, and pointer/keyboard drag behavior.
Preserve Field Journal's editorial typography, Nocturne's image-led cards, Civic
Modern's compact rows, and their independent light/dark palettes.

React 19, TypeScript, Vite, plain CSS, Lucide, native dialog, Leaflet and dnd-kit
are the existing system. Vitest covers domain/feed behavior; Playwright Chromium
and axe cover representative workflows. No repository instructions or declared
cross-browser support matrix were found. This workspace has no Git metadata.
There is no analytics integration or localization framework to migrate.

Priorities and affected files:

1. Foundations: evolve `src/tokens.css` with rem-based type/space scales, semantic
   control boundaries and sizing, retaining current color APIs and six modes.
2. Responsive shell and discovery: replace absolute narrow theme controls and
   tiny two-column cards with wrapping chrome and intrinsic card layouts in
   `src/styles.css` and `src/workspace.css`. Current 320px theme labels are 9px,
   mode targets 26px wide, and planner metadata frequently 8-10px.
3. Components and accessibility: consolidate icon control sizing and selected
   states; preserve native dialog, labeled form fields, explicit drag alternatives.
   Fix the skip link so it focuses content without mutating hash-based routing.
   Migrate discovery -> planner -> live calendar only after focused validation.
4. Quality and governance: remove obsolete split-view styles, document actual
   responsive contracts and component maturity in existing docs and system page.
5. Verification: add `tests/design-system.spec.ts`, run existing unit/browser/build
   gates, inspect actual screenshots and resource rendering. Report gaps honestly.

Assumptions: WCAG 2.2 AA is the engineering target, not a conformance claim.
No new density preference, theme, framework, dependency, or translated product is
needed. Logical CSS supports future RTL, but the current product is English.

Acceptance criteria:

- No document overflow at 320, 375, 768, 1024, 1280, 1536px, landscape or reduced
  height; meaningful text remains available without shrinking to fit.
- Controls remain separate at 200% root text size and WCAG text spacing.
- Shared icon targets are at least 36px, with 44px coarse-pointer targets;
  selected and focus states do not rely solely on color.
- Discover -> filter -> preview -> add -> adjust -> reorder -> share/undo works;
  mobile My day, map, saved, and calendar remain reachable.
- Native dialogs contain focus, close with Escape and restore their trigger.
- Six themes, forced colors, reduced motion, and content expansion are covered.
- Root text enlargement and viewport reflow are not labeled actual browser zoom;
  screen-reader, physical-device and unavailable browser checks remain explicit.

## Migration and Evidence

The initial regression failed: 200% root text size left body text at 14px.
The body now uses a 0.9375rem token (15px at the default root, 30px at 200%).
The theme bar wraps in normal flow and never hides mode/lens controls.

| Former pattern | Current owner / replacement | Status |
| --- | --- | --- |
| Fixed-pixel control sizes from 26px to 34px | `--control-compact`, shared `.icon-button` | Migrated |
| Duplicate event refresh button | `IconButton` with native disabled/name/title | Migrated |
| Tiny two-column narrow discovery | Intrinsic 16rem minimum cards | Migrated |
| Civic fixed thumbnail row at any width | Discovery container switches rows below 30rem | Migrated |
| 355px absolute mode controls | Wrapping lens/mode groups | Removed |
| Split-view and wide horizontal-layout overrides | Existing Explore / My day / Day map shell | Removed |
| Pixel-shrinking typography in mobile overrides | Relative type roles | Removed from migrated surfaces |
| Hash-changing skip link | Focusable main, route-preserving activation | Fixed |
| High-contrast preview losing to dark selectors | Equal-specificity final token override | Fixed |
| Global smooth scrolling during keyboard drag | Immediate native focus scrolling | Removed |

No public component API was removed; no compatibility adapters remain. Planner,
filter, source data, persistence and event service contracts are unchanged.

## Token Contract

CSS custom properties in `src/tokens.css` are the only runtime token source.
There is one React/web consumer, so adding a JSON serializer or token package is
not justified. Existing color role names remain compatible.

- Foundations: `--space-1` through `--space-7`, restrained rem type scale,
   line-height, label weight, border/focus widths, opacity, layer roles, measures,
   control/icon sizing, and neutral endpoints. Existing lens font, radius, duration
   and shadow mappings remain authoritative. Lens palette values remain colocated
   with their six semantic mappings rather than duplicated in unused color ramps.
- Semantics: canvas/surface/text/muted/accent/danger/focus remain shared. New
   `--control-border` aliases muted for discernible inputs and outlined actions;
   `--border` stays a quiet structural divider. `--selected-border` aliases accent.
   Inverse surface/text roles serve notices. Photo overlay roles are intentionally
   independent of page mode, so controls remain legible over arbitrary imagery.
- Component/layout decisions: `--planner-width`, `--card-min`, `--control-compact`
   and `--control-size` express actual repeated constraints. Do not create a token
   for every one-off pixel. Keep Leaflet's pixel marker/tile geometry and decorative
   stamp dimensions as documented exceptions.
- Modes: `data-lens` plus `data-mode` preserves six combinations and stored choices.
   OS color preference seeds the initial mode; explicit light/dark choice wins.
   Settings high contrast overrides all six modes, including native color-scheme.
   OS reduced motion, Settings reduction, prefers-contrast, and forced colors remain
   supported. Preview toggles remain session-only, as before. No new density mode.

## Component Contracts

| Component / pattern | API and states | Maturity and evidence |
| --- | --- | --- |
| IconButton | Required `label`, icon `children`, native button props, additive `className`; name/title cannot diverge; disabled and aria-pressed are native caller state | Shared, target and interaction regressions |
| Button / filter-button / text-button | Native buttons with established CSS classes; command label plus Lucide icon; no extra variant prop framework | Shared styles, dialogs and feed tests |
| Search / field / check-label | Native labels and input/select/textarea; visible value and native keyboard behavior; never use placeholder as sole label | Shared form patterns, browser workflows |
| PlaceCard / Photo | Existing place/index/saved/planned callbacks; stable photo ratio, named failure fallback, save/add/preview and drag enhancement | Product component, six-lens container checks |
| Planner / StopItem / Balance | Existing stops/date/callbacks; ordered sequence; move/remove/adjust/condense; warnings; labeled native meters | Product components, domain plus pointer/keyboard tests |
| Modal | Existing title/open/onClose/children/className; native inert background, close-button initial focus, wrap, Escape and trigger return | Shared, keyboard and narrow screenshot coverage |
| LiveEvents | Existing fetch/poll/filter states; shared refresh control; visible pending/stale/expired/error/empty states | Product component, fixture and outage tests |
| MapView | Existing Leaflet lifecycle, clusters, explicit zoom/retry and equivalent travel list | Network enhancement, map keyboard and tile-failure tests |
| Settings | Lens/mode controls, persisted accessibility preferences, profile and password recovery | Replaces the header theme toolbar and code inspector |

Usage examples (compose existing primitives, do not invent another button family):

```tsx
<IconButton label="Refresh events" disabled={loading} onClick={refresh}>
   <RefreshCw size={18} />
</IconButton>
<label className="field">Event date (Pacific)<input type="date" /></label>
<Modal title="A few preferences" open={open} onClose={close}>
   <div className="dialog-actions"><button className="button" onClick={close}>Done</button></div>
</Modal>
```

Keep labels concise but complete; never hide meaningful text to solve overflow.
IconButton uses the native title tooltip, not a custom rich-tooltip interaction.
Use aria-pressed for toggles, not commands; retain semantic native disabled state.
No async form validation framework was added because these controls filter or
mutate local state immediately; storage and feed failures keep their existing
alert/status mechanisms. Do not nest dialogs or use cards as page containers.

## Layout Recipes

- Shell: flexible discovery plus a 21rem planner, capped at 110rem; reduce gutter
   and planner width at 1150px because the dual-column workspace needs more room.
- At 850px, preserve the existing JavaScript/CSS compact-view contract: Explore,
   My day and Day map switch surfaces without remounting the planner. Do not change
   one side of that threshold without changing and testing the other.
- At 520px, theme groups get their own rows and detail facts stack. Buttons wrap,
   labels do not shrink. Header DOM and keyboard order are unchanged.
- Discovery grid uses `repeat(auto-fit, minmax(min(100%, 16rem), 1fr))`. Civic keeps
   its row identity until its discovery container is below 30rem, when the image
   stacks above the text. Only the decorative stamp is omitted in narrow containers.
- Calendar rows stack below a 38rem event container because timestamp and content
   columns no longer have readable space. It is not a viewport-only phone rule.
- Forms and facts use intrinsic wrapping. Grid/flex children containing native
   selects need `min-inline-size: 0`; selects retain their native popup behavior.
- Dialogs are bounded by dynamic viewport height, scroll internally, and retain
   action access at reduced height. Map regions retain explicit 360/400px minimums.
- Rem type responds to user defaults, never viewport-sized fonts. Logical layout
   and safe-area padding support RTL structure; English data, map orientation and
   times are not a localized or bidirectionally authored product.

### Mobile and touch (`src/mobile.css`, loaded last)

- At 850px and below, the one primary `<nav>` becomes a fixed bottom tab bar
   (icons, labels, non-zero counts, safe-area insets); DOM and reading order are
   unchanged. The header shrinks to brand, account and Settings. `html` and `body`
   reserve the bar's height so focus and anchors are never hidden behind it, and
   toasts sit above it. Short landscape phones get a 3rem row-style bar.
- Changing sections scrolls to the top; tapping the current tab returns to the top
   (smooth unless reduced motion is requested).
- On touch screens the bar hides while a text field is focused, so it cannot cover
   the field above the virtual keyboard.
- At 600px and below, dialogs are full-width bottom sheets bounded by dynamic
   viewport height. Their heading/close button is sticky at all sizes; on phones,
   `.dialog-actions` are pinned to the sheet's bottom edge.
- Text inputs, selects and textareas are at least 16px on small or touch screens
   to prevent iOS focus zoom.
- Coarse pointers get 44px targets for card titles, standalone source links,
   calendar days/navigation and text buttons. Inline links inside sentences may
   stay text-height. Drag-to-reorder always has tap alternatives (move buttons).
- `index.html` uses `viewport-fit=cover` so `env(safe-area-inset-*)` applies.
- Covered by `tests/mobile.spec.ts` in iPhone 13 emulation (Chromium engine, not
   real Safari/WebKit or a physical device).

## Review, Release and Deprecation

1. Propose changes with a consuming workflow and a measurable failure, not a new
    token or abstraction in isolation. Record exceptions here.
2. Change foundations, one representative component/workflow, then run the focused
    check before migrating adjacent surfaces. Preserve domain APIs and data.
3. Require `npm test`, `npm run test:e2e`, and `npm run build`. There is no configured
    lint or formatter gate. TypeScript is checked by the build.
4. Review all six lens/mode combinations, narrow/wide containers, keyboard focus,
    text expansion and preference states. Screenshot baselines in
    `tests/design-system.spec.ts-snapshots` are Chromium/Windows-specific; inspect
    intentional changes before using `--update-snapshots`. Full-page review artifacts
    in `test-results` are not automatic pixel-comparison baselines.
5. Release the source/token/docs change together. This private single-app prototype
    has no separately versioned design-system package. A breaking shared API needs
    every consumer migrated and documented in the same change.
6. Deprecate old selectors/APIs with a replacement and removal milestone; remove
    after all consumers migrate. Do not accumulate permanent override stylesheets.

## Verification Status

16 unit tests and 25 browser tests passed after the keyboard-scroll repair.
Six-theme axe checks cover discovery, map and live events, plus representative
dialogs. New regressions cover targets, route-safe skip, 200% root text plus WCAG
spacing, long event strings, RTL structure, touch emulation, reduced-height dialogs,
contrast preview, forced colors and visual contracts. See `docs/verification.md`
for the final environment, artifacts, bundle sizes and explicit remaining gates.