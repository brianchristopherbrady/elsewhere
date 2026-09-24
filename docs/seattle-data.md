# Seattle Data

Initial source review: September 17, 2026; nine durable destinations added September 22, 2026. Discover's Places catalog now contains 16 durable destinations and one dated tour retained for existing plans. Default discovery radius is 20 km from Pike Place Market, so north/south Seattle museums are not silently hidden. City calendar and curated places need no credentials. See [Discovery sources](discovery-sources.md) for verified library feeds, business-license data and the next integration priorities.

## Live Calendar

The official city page publishes the Trumba identifier `seattlegov-city-wide`. The app reads its public JSON export at https://www.trumba.com/calendars/seattlegov-city-wide.json through `/api/events`. Verified in the running app with 200 records on September 17, 2026. This is the provider's current export window, not a complete historical or citywide commercial-events dataset.

`server/live-events.ts` normalizes IDs, published offset-aware timestamps, Pacific calendar dates, locations, categories, cost text, cancellation flags, and registration-full flags. HTML becomes plain text; links are constructed against the official city domain. Missing cost is unknown, not free. Published canceled entries remain visibly labeled. Ended records are hidden in the browser. Multi-day ranges are preserved without inventing daily opening hours.

Requests share an in-memory 15-minute cache and one in-flight fetch. Upstream requests time out after 12 seconds. Failures allow visibly stale results for at most 24 hours and have a one-minute retry backoff. No fabricated live fallback is substituted. Browser polling runs every 15 minutes while visible and retries on reconnection; manual refresh still honors the server cache. Restarting the server clears its cache.

Only short listing metadata is displayed, with an official link on every event; descriptions, contact details, and images are not republished. A public feed is not a blanket content license: review Seattle/Trumba reuse terms and arrange appropriate service before commercial or high-volume deployment. Live records can be saved and planned as snapshots. Missing coordinates, access and duration stay unknown; unlocated stops are not map pins and no route is drawn across them.

Production requires the included Node server (`npm run build`, then `npm start`), or an equivalent backend endpoint. No keys are exposed to the browser. Restaurant/store feeds are not connected: both public Overpass hosts tested were unavailable in this environment.

## Activity Discovery

Discover has a Discovery type selector beside Filters and inside the preferences dialog: Places, Guided Tours, and Meet Up. The two activity views read the same live `/api/events` feed, with search, Pacific date filtering, cancellation/full labels, source links, and the same cache/outage behavior. Switching discovery type preserves the active itinerary and place preferences. Venue mood, budget, distance, access, and opening-hour controls apply only to Places; the calendar does not consistently supply those facts. Activity date defaults to all upcoming listings, independently of My day's sample date.

The server assigns `activities` from normalized titles and descriptions (including the Event Description custom field). Explicit guided/walking/docent-led/ranger-led tour wording qualifies for Guided Tours; self-guided wording is excluded. Explicit meetup, book club, coffee klatch, social group/gathering, or conversation group/circle wording qualifies for Meet Up. Civic council/commission/committee/hearing/design-review categories are excluded. These are conservative text-based classifications, not provider-certified categories: ambiguous listings may be omitted. HTML link targets are not searched, so Teams `meetup-join` links do not qualify. Generic community categories and "where to meet" instructions are insufficient.

Live source inspection during implementation confirmed the Chinatown-International District Walking Tour (202998339), Games and Crafts (205756362), Coffee Klatch (205762263), and Black Futures Book Club (208877801). These are examples from the current upstream window, not hard-coded fallback records. Results change as the feed rolls forward and may be empty. Organizer and audience fields are shown when supplied; descriptions are used for classification but are not republished. Confirm age restrictions, exact meeting points, registration and availability on the official listing.

Meet Up means social activities in Seattle's public calendar, not a Meetup.com integration. No Meetup.com or commercial tour inventory is connected. Broader coverage needs a separately authorized provider integration. Activity normalization and browser tests include positive/negative classifications, date/search combinations, errors and stale recovery, mobile reflow, and theme accessibility.

## Current Collection

| Listing | Official source | Scope of checked facts |
| --- | --- | --- |
| Caffe Vita at KEXP | https://www.kexp.org/visit/ | Location, coffee operator, weekday/weekend hours, public entrance access |
| Sub Pop at KEXP | https://www.kexp.org/visit/ | Shop, location, daily hours, building entrance access |
| KEXP Gathering Space | https://www.kexp.org/visit/ | Visitor activities, location, front desk hours, public entrance access; no guaranteed performance |
| Olympic Sculpture Park | https://www.seattleartmuseum.org/visit/olympic-sculpture-park | Address, free entry, sunrise/sunset rule; access remains unverified |
| Elliott Bay Book Company | https://www.elliottbaybook.com/ | Bookstore, street address, author-event calendar; hours/access remain unverified |
| Pike Place Chowder | https://www.pikeplacechowder.com/ | Post Alley restaurant, address, daily 11:00-17:00 hours; access remains unverified |
| Piroshky Piroshky | https://piroshkybakery.com/ | Bakery and Pike Place branch; details link to https://piroshkybakery.com/stores |
| Discover the Olympic Sculpture Park | https://www.seattleartmuseum.org/whats-on/events/public-tour-discover-the-olympic-sculpture-park-sep-19-26 | Free tour, September 19, 2026, 13:00-14:00 Pacific, venue |
| Seattle Art Museum | https://www.seattleartmuseum.org/visit/seattle-art-museum | Address, exhibitions, adult admission $29.99 (planning estimate $30); Monday/Tuesday closure and partial closures through December 10, 2026 |
| Burke Museum | https://www.burkemuseum.org/visit | UW location, collections, adult admission $24; Monday closure |
| Wing Luke Museum | https://www.wingluke.org/visit | Address, community exhibitions, adult admission $24.95 (planning estimate $25); Wednesday-Sunday schedule, tour availability caveat |
| Frye Art Museum | https://www.fryemuseum.org/visit | Address, galleries always free, Wednesday-Sunday schedule with Thursday evenings |
| The Museum of Flight | https://www.museumofflight.org/visit/ | Main museum address, aircraft/aerospace exhibits, adult admission $29; daily hours with holiday closures |
| Seattle Central Library | https://www.spl.org/hours-and-locations/central-library | Public library, address, Books Spiral and weekday-dependent hours |
| Gas Works Park | https://www.seattle.gov/parks/allparks/gas-works-park | Address, views, industrial structures, regular hours and prohibited water access |
| Discovery Park | https://www.seattle.gov/parks/allparks/discovery-park | Address, trails, park remains open; visitor center closure until summer 2027 and beach-parking restrictions |
| Seattle Japanese Garden | https://www.seattlejapanesegarden.org/visit | Address, adult admission $10, seasonal schedule, winter/Monday closures, capacity restrictions |

The nine additions have individual September 22 review dates. Their hours remain `hoursKnown: false`: the current daily-window model cannot safely assert weekly/seasonal/holiday availability. Published schedules remain visible in details. Access remains unknown pending a dedicated entrance/path review. Suggested duration, mood and atmosphere scores are editorial, not measured facts.

Summaries are written for Elsewhere, not copied marketing descriptions. Source links are not licenses to copy photography or full descriptions. Photos remain Unsplash illustrations with a visible disclaimer, not documentary venue images. Coordinates are approximate map positions, including manually placed pins from the listed addresses; they are not surveyed or systematically geocoded. Do not treat any marker as a wheelchair entrance or routing endpoint.

## Recommended Sources

### Places: OpenStreetMap / Overpass

[Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) can query real restaurants, cafes, shops, parks, and attractions by geography and tags. It is the recommended open-data starting point. Names and coordinates have broad coverage; opening hours, wheelchair access, cuisine, websites, and business freshness vary. Missing fields must remain unknown, not false or invented.

[OSM data is ODbL](https://www.openstreetmap.org/copyright): preserve attribution and meet applicable share-alike obligations for derived databases. The data license does not guarantee a free production API service. Public Overpass instances are shared infrastructure with usage limits, not a request-per-keystroke backend. Import and review a bounded snapshot on a schedule, cache it, and use a suitable provider for scale. This app has not yet imported OSM place data; it uses OSM tiles separately.

### Ticketed Events: Ticketmaster Discovery API

[Official documentation](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) supports event search by city, state, date, and category. Seattle queries can use `city=Seattle`, `stateCode=WA`, and `countryCode=US`. An API key is required; documented default limits at review time are 5,000 calls/day and 5 requests/second. Confirm your account limits and content terms before use. Coverage is limited to participating ticketing sources, not every local event.

The server-side `/api/music` adapter is implemented; it requires a locally configured `TICKETMASTER_API_KEY`, never a `VITE_` key bundled into client JavaScript. See [Music sources](music-sources.md). Broader non-music inventory is not connected. Preserve source IDs, Pacific dates and cancellation status; never substitute guessed dates or prices for TBA/TBD/unknown values.

### Community Events: Official Calendars

- [Seattle Center](https://www.seattlecenter.com/events/event-calendar): festivals, performances, sports, and campus programs.
- [City of Seattle](https://www.seattle.gov/event-calendar): community and departmental events; its published Trumba JSON export is connected as described above.
- [Seattle Art Museum](https://www.seattleartmuseum.org/visit/olympic-sculpture-park): dated tours and programs. The checked tour page exposes an individual `.ics` download; that is not an established bulk event feed.
- [Elliott Bay Book Company](https://www.elliottbaybook.com/events): author events; some are offsite, so resolve the actual event venue.

Review provider feed availability and reuse terms before automated collection. Prefer published feeds or agreements over scraping calendar HTML. The September 22 research verified Seattle Public Library's `kalendaro` JSON export, Seattle park-address dataset `v5tj-kqhc` and active-business-license dataset `wnbq-64tb`. These remain candidates, not connected adapters; see [Discovery sources](discovery-sources.md) for fields, licenses and limitations. None is a complete restaurant/store-opening/event inventory.

## Data Rules

- Keep durable source-qualified IDs. Do not rename an old fictional ID into a real business.
- Preserve field provenance and review dates. Recheck sensitive access statements directly with providers.
- Only source-backed affirmative access values qualify for the access filter. Unknown is distinct from inaccessible.
- Hours filters use the checked regular planning window, not live open status or holiday overrides. Unverified hours generate a warning rather than a fabricated all-day claim.
- Dated events appear only on their selected Pacific calendar date. Adding/replacing uses their published start. Retiming or changing the itinerary date generates warnings, including in exported text.
- Budget, suggested duration, moods, and atmosphere scores are editorial estimates. Free shop visits exclude purchases; spending estimates are not menus, admission quotes, tax, or tips.
- No cold-start offline support, live weather, live ticket inventory, or reservations are included. The calendar refreshes on demand and while its view is open, not through a background worker.

## Verification

Run `npm test`, `npm run test:e2e`, and `npm run build`. Seattle-specific coverage includes geographic bounds, source metadata, old-ID rejection, unknown-data filtering, date-sensitive event discovery, event-time warnings, source links, sharing, storage isolation, and clustered keyboard map access. Existing tests also cover six themes, mobile reflow, planning, persistence, and representative axe scans.