# Elsewhere

A Seattle discovery and day-planning app, with real source-linked venues, dated events, three design lenses, and independent light/dark color modes. Built with React, TypeScript, Vite, Leaflet, dnd-kit, and Lucide.

## Run

Requires Node.js 22.18+ (tested on 24.19).

```sh
npm install
npm run dev
npm test
npm run test:e2e
npm run build
```

Playwright uses Chromium. On a machine without the browser installed, run `npx playwright install chromium`. No API keys are required for the city calendar or venue directory. Live concerts optionally use a server-only `TICKETMASTER_API_KEY`; see [Music sources and setup](docs/music-sources.md).

For production, copy the settings in [.env.example](.env.example) into your host's environment: `BETTER_AUTH_URL` (your public HTTPS origin), a persistent `BETTER_AUTH_SECRET` of at least 32 characters, and `DATABASE_PATH` on durable storage. Then run `npm ci`, `npm run build` and `npm start`. The listener defaults to http://127.0.0.1:5174 behind an HTTPS reverse proxy; on container platforms set `HOST=0.0.0.0` and `TRUST_PROXY=true`. `GET /healthz` is available for health checks. A static-only host cannot serve accounts, saved days, or the live feed. See [Accounts and deployment](docs/accounts.md) before deploying publicly.

## Experience

- In Discover, choose Music & Venues for Ticketmaster shows filtered by artist/venue, genre, and Pacific date, or a reviewed Seattle music venue directory with official calendars and directions. Live shows require a configured provider key; missing configuration and stale/unavailable data are explicitly labeled.
- In Discover, select Live events for Seattle's official city calendar, refreshed every 15 minutes while visible. Search, filter by Pacific date, and follow official event links. Cancellations, unknown costs, and stale updates are labeled. Live events is no longer a separate page; old links redirect to this filter.
- In Discover, choose Guided Tours or Meet Up from Discovery type (also available in Filters). Both pull published activities from the live city feed, with search, dates, organizer/audience details, and official links. Categories are inferred conservatively from source text; this is not a Meetup.com or commercial tour integration. Place-only preferences do not apply to live activities.
- Discover searches and collects curated places, tours, city meetups, live events, music shows and venues independently of a day. There is no planner or collection sidebar.
- Saved items is a separate browser-local library. Add tags and notes, search and filter, and remove items without changing any planned day. Event ideas retain explicit Pacific dates or inclusive ranges.
- Create a Day starts with a keyboard-accessible calendar and condensed saved-item picker. Search names, notes or tags, filter by category/tag/date availability, then add items or discover more inline. Adding copies item notes into an independent draft. Arrival, departure, title, custom tags and day/activity notes are optional. Reorder with pointer/keyboard dragging or move buttons. Out-of-range events display a notification without changing the itinerary.
- See my day maps located activities with numbered markers, clusters, sequential distance/walking estimates and a readable travel list. Unknown coordinates are explicitly listed, and the map never connects across missing locations. Total scheduled span and hours until midnight remain undetermined for incomplete or conflicting schedules.
- Share a URL containing activity snapshots and times, copy plan text, or download an itinerary. Day-level title/tags/notes are stored with saved days, not included in shared links.
- Save day stores an independent account record in My Calendar, with title/tag cards, edit/remove actions, drag rescheduling and a date-input alternative. Editing an opened day offers Save changes (same ID, including after reload) or Save as new day, which keeps the original. New day clears only the working draft after confirmation. Older browser-saved days can be explicitly imported. Saved items and the draft remain browser-local; signing out clears the draft but never deletes account days.
- The header Settings gear contains Field Journal, Nocturne and Civic Modern themes, light/dark modes, reduced motion, high contrast, display-name editing, password recovery and sign-out. Appearance preferences persist on this browser. The former code icon and top theme toolbar are removed; developer documentation remains at `/system.html`.

## Structure

- `src/data.ts`: Seattle places, official source links, review dates, and lens metadata.
- `src/planner.ts`: pure discovery/scheduling/balance utilities and persistence validation.
- `src/App.tsx`: shared state and workflow composition.
- `src/activities.ts`: validated source snapshots shared by browser and server.
- `src/DayBuilder.tsx`: saved ideas, date-first editor, inline discovery and day review.
- `src/SavedItems.tsx` and `src/SavedItemPicker.tsx`: independent library metadata and compact filtered day selection.
- `src/SettingsDialog.tsx`: appearance, accessibility and account settings.
- `src/SavedCalendar.tsx`: monthly saved-day calendar, rescheduling and record actions.
- `src/components.tsx`: native modal, cards, planner, and meters.
- `src/MapView.tsx`: Leaflet lifecycle, layers, markers, and tile recovery.
- `src/tokens.css`: six semantic token mappings.
- `src/styles.css`: structural layout, components, and lens composition.
- `src/planner.test.ts`: domain regression tests.
- `tests/app.spec.ts`: browser, preference, accessibility, and interaction tests.
- `docs/implementation-plan.md`: scope and initial acceptance criteria.
- [Design-system upgrade](docs/design-system-upgrade.md): token/component contracts, responsive recipes, migration map and contribution gates.
- `tests/design-system.spec.ts`: target sizing, text expansion, route-safe keyboard navigation, preferences, RTL structure and visual contracts.

## Honest Boundaries

Discover's Live events filter reads the City of Seattle's published Trumba calendar. It is a polling feed, not real-time ticket inventory, and does not cover every commercial event. The server caches for 15 minutes, retains outage fallback for at most 24 hours, and retries failures no more than once per minute. Cache is in memory and resets on restart. Live activities can be saved and planned as snapshots, but missing coordinates or durations remain unknown. Snapshots do not automatically refresh when the source changes; confirm official listings before travel. Multi-day ranges do not guarantee continuous operation. Older saved snapshots without an end date remain single-day items; re-save from the feed to capture the current range.

Discover's Places catalog contains 16 durable destinations plus one dated tour retained for existing plans, initially reviewed September 17 and expanded September 22, 2026. Museums, gardens, parks and Central Library now supplement the original collection; the default radius is 20 km from Pike Place Market. Restaurant/store listings are not live. Hours, holidays, event cancellations, and availability must be reconfirmed. Unknown access/hours do not qualify for affirmative filters. Weekly/seasonal museum and garden hours are shown as source text, not asserted as a daily open window. Times are Pacific. The cafe uses its shared weekday/weekend planning window. Coordinates are approximate venue positions, not surveyed entrances. Costs, moods, durations, and balance are editorial estimates, not quoted prices or measured crowd data. Free visits do not include purchases. Mock weather has been removed.

[Discovery source research](docs/discovery-sources.md) records verified feeds, datasets, provider API constraints and the maintenance routine. The Seattle Public Library calendar is connected alongside the city calendar, and both are paged to about 45 days ahead. Discover's main grid shows the 17 curated places followed by every entry from the user-supplied Seattle list as cards, each labeled with how it was validated (Seattle Parks data, OpenStreetMap, several possible locations, or not yet verified); `npm run verify:staples` refreshes those checks. Run `npm run review:discovery` weekly to find traditions needing this year's date, dates to reconfirm, overdue place reviews and stale list verification. License dates and news leads must not be represented as confirmed store openings.

Unsplash photos remain labeled illustrations, not actual venue photos. Walking estimates use a simple distance multiplier, not street routing or Seattle hill/accessibility data. Map data uses OpenStreetMap's public tile service under its attribution and usage policy; choose a traffic-appropriate provider before a high-volume deployment. See [Seattle data sources](docs/seattle-data.md) for the current collection and recommended dataset/feed strategy.

Images, fonts, and map tiles need network access. After app load, core discovery and local draft planning work offline; cold-start offline is not implemented. Guests can browse, plan, bookmark places and share without an account. Account registration, sign-in, saving, deleting, and importing require the server. Share URLs contain the itinerary directly and require the recipient to reach the host. Better Auth manages hashed passwords and cookie sessions; SQLite stores accounts and saved days. Email verification and password recovery use server-only `RESEND_API_KEY` and `ACCOUNT_EMAIL_FROM` settings. Without mail configuration, local sign-up/sign-in still work, but public enrollment should wait until real delivery is verified; see [Accounts and deployment](docs/accounts.md).

Seattle plans use separate storage keys; original Lisbon plans are left untouched, and old place IDs are never silently reassigned. Theme preferences and valid existing drafts are retained. New visitors start with an empty undated draft. See [Workspace workflows](docs/workspace-views.md) for persistence and timing contracts.

This is a working portfolio prototype, not a formally evaluated WCAG-conformant product. Real screen-reader, mobile-device, and browser-zoom validation remain separate from automated accessibility scans and viewport emulation.