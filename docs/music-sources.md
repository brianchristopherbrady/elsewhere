# Music Sources

Discover > Discovery type > Music & Venues has separate upcoming-show and venue views. Place-only preferences do not apply. Save activity collects a show or venue without modifying a day. Create my day can add that saved snapshot or discover music inline. Concert end times, visit durations and coordinates are not invented; map review explicitly marks missing locations and uncertain totals. Saved snapshots retain the official URL and published date but do not automatically refresh from the provider.

## Enable Live Shows

Register for a key at https://developer.ticketmaster.com/. For local development or Vite preview, configure the following in the ignored `.env.local` file, then restart the server:

```dotenv
TICKETMASTER_API_KEY=your_key_here
```

For `npm start`, supply `TICKETMASTER_API_KEY` through the server's deployment environment. The production launcher does not automatically load `.env.local`. Never prefix this variable with `VITE_`, expose it in client code, or commit the key. No key is necessary for the official venue directory or existing city calendar.

The workspace had no Ticketmaster key at implementation time. Adapter and browser behavior were verified with fixtures; authenticated upstream coverage remains unverified until a key is configured. Missing configuration returns an explicit `configured: false` response, not an upstream error or an assertion that no concerts exist.

## Provider Behavior

- Official documentation: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
- `/api/music` is a read-only server endpoint. It searches Seattle, WA, US music listings for the next 90 days, ordered by date, up to five 200-result pages. A truncated-result flag is shown if the provider reports more pages.
- Default documented provider quota: 5,000 requests/day and 5 requests/second. Requests are sequential and coalesced within each server process. Cache lasts 15 minutes; failure fallback expires after 24 hours and retries are suppressed for one minute. Multiple server replicas would need a shared cache/rate limit.
- Records are source-qualified, deduplicated by provider ID, limited to Seattle music venues, and normalized to Pacific dates. Unsafe links and undated listings are excluded. Unknown prices, age restrictions, and times remain labeled unknown. Past start times are removed; no concert end time is assumed.
- The UI polls every 15 minutes while visible and retries when connectivity returns. The city feed has an independent cache and failure path.
- Ticketmaster is not comprehensive and is not live inventory. A listed price does not guarantee availability or include every fee. Preserve attribution and ticket URLs; review provider terms before public/commercial deployment.

## Reviewed Venue Directory

Reviewed September 20, 2026 from official venue websites:

| Venue | Address | Source | Calendar |
| --- | --- | --- | --- |
| The Crocodile | 2505 1st Avenue, Seattle, WA 98121 | https://www.thecrocodile.com/ | https://calendar.thecrocodile.com/ |
| Neumos | 925 East Pike Street, Seattle, WA 98122 | https://www.neumos.com/ | https://www.neumos.com/events |

This is a factual reviewed snapshot, not an automated calendar import. Official links cover shows that may be absent from Ticketmaster. The directory includes neighborhood, address, official calendar, venue information, and an external map search. No venue photos, reviews, descriptions, ticket inventory, or private attendee information are copied. Physical accessibility and age policies must be confirmed for each performance.

The Showbox and Tractor Tavern remain candidates: attempted official URLs could not be verified in this environment, so no entries or live feeds were fabricated. Viator, Meetup, and Bandsintown also remain unconnected pending provider access and a separate integration.