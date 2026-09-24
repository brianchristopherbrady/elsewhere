# Elsewhere Implementation Plan

## Starting Point
Only the product brief exists. There is no existing framework, design system, runtime, or test suite to preserve. Preserve plan.md. Build a client-side React/TypeScript application with fictional Lisbon venues, local persistence, and no account or backend dependency.

## Delivery Sequence
1. Establish Vite, TypeScript, shared data and deterministic planning utilities. Validate production compilation and domain tests.
2. Build discovery, filtering, map/list/split presentation, place details, saved collection, and itinerary with keyboard and pointer reordering.
3. Apply Field Journal, Nocturne, and Civic Modern lenses over stable structure, independently supporting light/dark modes. Add the system inspector, balance, sharing, and state feedback.
4. Verify desktop/mobile workflows, all six combinations, accessibility automation, keyboard dialogs, reflow, preference handling, persistence, and production build. Document genuine testing gaps.

## Contracts
- Lens/mode changes preserve component identity, selected place, route/view, itinerary, focus, and scroll context.
- Search/filter/sort combine; zero results offers recovery. Saved state is independent of planned state.
- Planned stops are unique and have editable start times/durations; overlap and opening-hour warnings use deterministic fictional data. Walking time is an estimate, not navigation advice.
- Drag reorder also works by keyboard and explicit move controls. Dialogs support Escape, focus containment, and focus return.
- No page overflow at 320 CSS pixels. Map/chart regions have stable, nonzero dimensions. Full workflows remain available on mobile.
- External map tiles, font and image delivery are online enhancements; core fictional data and planning remain usable if those resources fail after app load. Cold-start offline is not promised.

## Tooling and Boundaries
Leaflet provides map interaction; dnd-kit provides drag-and-drop and keyboard sorting. Native dialog, form controls, and details elements provide simple semantics. No generated SVG illustration or backend recommendation service is needed. Production/test artifacts stay in this repository; personal agents and skills remain unchanged.