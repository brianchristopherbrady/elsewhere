# Discovery Sources

Research date: September 22, 2026. This is an implementation-oriented source assessment, not a claim that every source is integrated or licensed for redistribution.

## Recommendation

1. Keep an independently researched, source-linked destination catalog for museums, gardens, parks, libraries and shops. Nine destinations were added in this pass: Seattle Art Museum, Burke Museum, Wing Luke Museum, Frye Art Museum, Museum of Flight, Central Library, Gas Works Park, Discovery Park and Seattle Japanese Garden. There are now 16 durable destinations plus one historical dated tour retained for existing plans.
2. Seattle Public Library's published Trumba feed is now connected alongside the city calendar (see Keeping Discovery Current).
3. Enable the existing Ticketmaster music adapter with a server-only key, then consider a separate all-category adapter for theater, comedy, sports and family events. Do not relabel all-category results as music.
4. Treat new-business discovery as a reviewed pipeline, not a trustworthy automatic "just opened" feed. Combine license changes and local reporting with confirmation from the business itself.

## Source Assessment

| Source | Coverage and concrete access | Status and constraints |
| --- | --- | --- |
| [City of Seattle calendar](https://www.seattle.gov/event-calendar) | Public JSON: `https://www.trumba.com/calendars/seattlegov-city-wide.json`; community and civic events | Connected through `/api/events`. No key; 15-minute cache. Export is bounded and is not complete citywide inventory. Public availability is not a blanket redistribution license. |
| [Seattle Public Library](https://www.spl.org/event-calendar) | Official page publishes `webName: "kalendaro"`. Public JSON: `https://www.trumba.com/calendars/kalendaro.json` | **Connected** through `/api/events` with the city calendar; 200 records at inspection, not a guaranteed window. Listings link to spl.org and are labeled by source; missing cost reads "Free library program" per SPL's statement that its events are free. Confirm Seattle/Trumba reuse terms before redistribution or commercial scale. |
| [Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) | Event/venue search by city, state, country, dates and classification. API key required. | `/api/music` adapter exists; see [setup](music-sources.md). Research did not verify a credentialed upstream query. Documented default quota: 5,000 requests/day, 5/second, pagination below 1,000 records. Participating sellers only; not a comprehensive meetup source. Preserve attribution/links and review API terms. |
| [Meetup GraphQL API](https://www.meetup.com/api/) | Groups and upcoming events; official API page advertises access with Meetup Pro, authentication and API license terms | Not integrated. Confirm account eligibility, OAuth access, permitted search scope and commercial reuse before building. Do not assume an anonymous citywide API or scrape member/attendee data. The existing Meet Up view is not Meetup.com. |
| [Seattle Center calendar](https://www.seattlecenter.com/events/event-calendar) | Published campus festivals, performances, sports and activities | Calendar verified; supported bulk feed/API and redistribution rights not established. Contains maintenance and private-event closures as well as activities, so importing every row would be wrong. Request a feed/partnership first. |
| [EverOut Seattle](https://everout.com/seattle/) | Broad local music, theater, arts, festivals and editorial recommendations | Coverage verified. No authorized bulk API/feed established. Useful discovery/partnership candidate, not a license to scrape its listings, articles or photography. |
| [Eventbrite API](https://www.eventbrite.com/platform/api) | Potential organizer-authorized event inventory | Documentation returned HTTP 401 during this research. No public citywide search entitlement or usable feed verified. Keep blocked pending official access/docs; do not build against an assumed legacy search endpoint. |
| [Seattle park addresses](https://data.seattle.gov/Community-and-Culture/Seattle-Parks-And-Recreation-Park-Addresses/v5tj-kqhc) | Socrata JSON: `https://data.seattle.gov/resource/v5tj-kqhc.json`; `pmaid`, `locid`, `name`, `address`, `zip_code`, `location_1`, coordinate fields | Metadata/schema verified; marked PUBLIC_DOMAIN, attributed to City of Seattle, annual refresh. Good next catalog expansion source. Resolve coordinate reference systems before using `x_coord`/`y_coord`; validate geographic `location_1`. Does not establish current closures, amenities, access or hours. Not imported. |
| [Active business licenses](https://data.seattle.gov/City-Administration/Active-Business-License-Tax-Certificate/wnbq-64tb) | Socrata JSON: `https://data.seattle.gov/resource/wnbq-64tb.json`; trade/legal names, NAICS, license start date and business address | Metadata/schema verified; PUBLIC_DOMAIN, Department of Finance and Administrative Services, daily refresh. `license_start_date` is **text**, not a typed date. This is an active-license snapshot, not a store-opening calendar. Not imported. |
| [OpenStreetMap / Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API) | Geographic queries for shops, cafes, museums, parks and attractions | Candidate for bounded, scheduled place imports; not connected. [ODbL attribution and applicable share-alike obligations](https://www.openstreetmap.org/copyright). Shared public servers are not a production SLA. Current endpoint availability was not revalidated in this pass. OSM edit dates are not business opening dates. |
| [Google Places](https://developers.google.com/maps/documentation/places/web-service/policies) | Commercial place search/enrichment option | Not connected. Reviewed policies restrict caching, with place IDs an explicit exception, and require Google Maps and applicable author attribution. Review pricing and map/display terms before using alongside Leaflet or storing snapshots. Not an unrestricted seed database. |

## Official Venue Calendars

These are verified discovery pages, not verified bulk export contracts. Request a supported feed or permission before automation; an individual "add to calendar" link does not establish a complete event feed.

- [Burke Museum](https://www.burkemuseum.org/calendar): museum programs, talks and activities.
- [Wing Luke Museum](https://www.wingluke.org/eventscalendar): community programs and tours; historic hotel tours depend on availability.
- [Frye Art Museum](https://fryemuseum.org/calendar): gallery conversations, talks and art activities.
- [Museum of Flight](https://www.museumofflight.org/exhibits-and-events/calendar-of-events): lectures and special museum events.
- [National Nordic Museum](https://nordicmuseum.org/calendar): films, lectures, concerts and cultural programs.
- [Seattle Aquarium](https://www.seattleaquarium.org/events/): special programs; admissions/reservations are separate from event availability.
- [Seattle Art Museum](https://www.seattleartmuseum.org/whats-on/programs/sam-tours): dated tours. Do not turn a recurring description into invented occurrences.

Nordic Museum and Aquarium visitor pages were verified as expansion candidates, but adult admission was not established from the fetched pages. MoPOP and MOHAI fetches landed on third-party embeds; Henry and Ballard Locks content extraction failed. Those destinations were not added on the strength of incomplete evidence. Revisit their official visitor information before importing.

## New Stores And Openings

[Capitol Hill Seattle](https://www.capitolhillseattle.com/) provides reporting on openings, planned businesses and closures. Its pages were readable through browser research, but a direct HTTP request returned 403. Do not bypass that restriction. No RSS contract or bulk redistribution permission was verified. Use links and original factual notes after review, or arrange publisher access. EverOut also supplies useful local editorial leads.

The city's [Find a Business](https://www.seattle.gov/city-finance/business-taxes-and-licenses/find-a-licensed-business) service corroborates trade names, addresses, industries and certificate status, not opening dates. The verified license dataset supports a daily, bounded change-review process:

1. Select only necessary business fields server-side. Do not expose owner names, phone numbers or residential business addresses as attractions. Confirm a public-facing storefront.
2. Diff normalized license identifiers and locations. License registration, ownership changes and relocations can all look "new" without a new storefront opening.
3. Store `firstSeenAt` separately from `announcedOpeningDate`, `confirmedOpenedAt`, `lastVerifiedAt` and supporting source URLs. No confirmed date means no "newly opened" badge.
4. Verify the business's own announcement and current visitor address/hours. Distinguish coming soon, soft opening, open and closed. Deduplicate name/address/official-domain matches and preserve branch identities.
5. Publish an original short summary with links, then recheck closures. Do not republish full news articles, photographs or customer reviews.

No license records or personal contact information were imported during research; only catalog metadata and column definitions were inspected. No new-store live feed is connected.

## Keeping Discovery Current

Automatic:
- `/api/events` refreshes the City of Seattle and Seattle Public Library calendars every 15 minutes. If one source fails, the other still loads and the view names the unavailable source; the server logs `[events] <source> calendar failed: <reason>`. Ended listings disappear.
- Confirmed tradition dates in `src/occurrences.ts` show in Discover > Seattle staples & traditions and hide themselves after they end. Saving one creates a dated activity linked to the organizer page, so planner date warnings apply.

Reviewed (run weekly, e.g. with Windows Task Scheduler or CI):

```sh
npm run review:discovery            # report for today (Pacific)
npm run review:discovery -- --links # also check official URLs
npm run review:discovery -- 2026-11-01 --strict  # simulate a date; exit 1 on stale/invalid data or broken links
```

The report lists:
- **Needs this year's date:** a tradition's customary month is within 60 days and no edition is confirmed. Check the organizer, then add an entry to `occurrences` with `start`, optional `end`/`time`/`note`, the organizer `url` and `checkedAt`. If it is not happening, leave it unconfirmed.
- **Reconfirm upcoming dates:** a confirmed date was last checked over 30 days ago, or is within 14 days and was checked over a week ago. Update `checkedAt` after rechecking.
- **Ended - roll forward:** editions older than about 13 months. Past editions within that window are kept so the review knows this year's event already happened.
- **Place review overdue:** curated places not reviewed for 120 days. Recheck hours, prices, closures and access, then update `checkedAt`.
- **Link check:** "Broken" means an HTTP error. "Check manually" covers sites that block automated requests (401/403/429) or network timeouts.

Organizer dates confirmed September 22, 2026: Live Aloha and Sea Mar Fiestas Patrias (history), Italian Festival, CroatiaFest, Turkfest, Día de Muertos, Diwali, Seattle Hmong New Year (Seattle Center Festál 2026 schedule), Trolloween (Fremont Arts Council), WildLanterns (Woodland Park Zoo) and the Seattle Marathon. Festál customary months come from the same 2026 schedule; the Iranian and Arab festivals were postponed and are excluded.

### Live calendar paging

Each Trumba JSON export returns at most 200 events per request (about 10-14 days). `/api/events` pages forward with `?startdate=YYYYMMDD` from today, starting each page on the last date of the previous one, up to 4 pages or 45 days per calendar. Measured September 23, 2026: 594 city and 775 library events (1,369 total) versus 400 from single pages. A failed later page keeps the pages already fetched.

### Validating the Seattle list

`npm run verify:staples` checks every locatable list entry (not events, neighborhoods, trails or places outside Seattle) and caches results in `src/staple-verifications.json`:

1. **Seattle Parks public data** (`data.seattle.gov` dataset `v5tj-kqhc`, public domain): exact name match gives status `verified` with the official address and coordinates.
2. **OpenStreetMap Nominatim**, one request per second with an identifying User-Agent and cached results, per its usage policy: exactly one Seattle-area result whose name contains every significant word gives `matched` with address, coordinates, and website/opening hours where tagged. Several results (usually chains) give `multiple`; nothing gives `unmatched`. OSM data is community-maintained (ODbL; attribution shown on the map).

Discover shows every list entry as a card below the curated places, with its status. Verified and matched entries carry their address and coordinates into saved items and the day map; OSM opening hours are labeled community data and never count as confirmed hours. Unknown price, access and hours exclude list entries from narrowed filters. Results older than 30 days are re-checked on the next run (`--refresh` re-checks everything); `npm run review:discovery` reports the verification date and status counts. A match is not proof a business is open today; confirm on its own site before visiting.

## Integration Gates

For future adapters, reuse the existing server cache/coalescing/backoff pattern, but keep provider status and provenance separate. Deduplicate cross-posted city/library events without collapsing different recurring occurrences. Preserve canonical links, registration requirements, audience/language, online-versus-in-person status, cancellation and unknown coordinates. A feed's export limit must remain visible; do not promise 90 days from a 200-record response.

Suggested refresh cadence, subject to provider terms: 15-60 minutes for calendars, daily for licenses and opening leads, monthly for stable venue facts with more frequent closure checks. Store fetch/review time and source IDs. Expire ended events, use bounded stale data with a visible warning, and never manufacture replacement results during outages.

Before connecting each provider, test malformed records, DST/offset changes, all-day and multi-day events, cancellations, registration-full entries, duplicates, missing prices/locations, HTTP 429, timeouts and partial-source failure. Keep keys server-side and outside shared logs. Existing saved activity snapshots do not automatically refresh; confirm the source before travel.