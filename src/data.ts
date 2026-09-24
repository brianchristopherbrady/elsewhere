export const moods = ['Quiet', 'Strange', 'Outdoors', 'Cheap', 'Romantic', 'Social', 'Late-night'] as const;
export type Mood = typeof moods[number];
export type Lens = 'journal' | 'nocturne' | 'civic';
export type Mode = 'light' | 'dark';
export type Place = {
  id: string; name: string; category: string; neighborhood: string; description: string;
  note: string; moods: Mood[]; price: number;
  lat: number; lng: number; open: number; close: number; duration: number; accessible: boolean | null;
  access: string; quiet: string; energy: number; unusual: number; outdoor: number;
  website: string; address: string; checkedAt: string; hours: string; hoursKnown: boolean;
  eventDate?: string;
};

export const unverifiedAccess = 'Access details have not been verified. Contact the venue about your specific requirements.';
export const unverifiedQuiet = 'No verified crowd data. Contact the venue for quieter visiting times.';
const shared = { checkedAt: '2026-09-17', quiet: unverifiedQuiet };
const reviewed = { ...shared, checkedAt: '2026-09-22', open: 0, close: 1440, hoursKnown: false, accessible: null, access: unverifiedAccess, energy: 30, unusual: 60, outdoor: 0 };

export const places: Place[] = [
  { ...reviewed, id: 'seattle-art-museum', name: 'Seattle Art Museum', category: 'Art museum', neighborhood: 'Downtown',
    description: 'Explore collection galleries and changing exhibitions near Pike Place Market. The First and Union entrance is open; SAM reports partial gallery and entrance closures through December 10, 2026. Check current visitor notices.',
    note: 'Art from the Northwest and around the world.', moods: ['Quiet', 'Strange'], price: 30, duration: 120,
    lat: 47.6075, lng: -122.338, website: 'https://www.seattleartmuseum.org/visit/seattle-art-museum', address: '1300 First Avenue, Seattle, WA 98101', hours: 'Closed Monday-Tuesday. Check the official calendar for daily hours, holidays and gallery closures.' },
  { ...reviewed, id: 'burke-museum', name: 'Burke Museum', category: 'Natural history museum', neighborhood: 'University District',
    description: 'Natural history and cultural collections on the University of Washington campus, including fossils, Northwest Native art and views into working research spaces.',
    note: 'Fossils, living cultures and science at work.', moods: ['Strange', 'Social'], price: 24, duration: 120,
    lat: 47.6603, lng: -122.3113, website: 'https://www.burkemuseum.org/visit', address: '4303 Memorial Way NE, Seattle, WA 98195', hours: 'Tuesday-Sunday 10:00-17:00; closed Monday. Check holiday closures and First Thursday hours.' },
  { ...reviewed, id: 'wing-luke-museum', name: 'Wing Luke Museum', category: 'History museum', neighborhood: 'Chinatown-International District',
    description: 'Community-developed exhibitions about Asian American, Native Hawaiian and Pacific Islander experiences. Historic hotel tours depend on availability and may have weather or staffing cancellations.',
    note: 'Community stories in the historic district.', moods: ['Strange', 'Social'], price: 25, duration: 120,
    lat: 47.5982, lng: -122.3226, website: 'https://www.wingluke.org/visit', address: '719 South King Street, Seattle, WA 98104', hours: 'Wednesday-Sunday 10:00-17:00. Check holidays, tour availability and special evening hours.' },
  { ...reviewed, id: 'frye-art-museum', name: 'Frye Art Museum', category: 'Art museum', neighborhood: 'First Hill',
    description: 'Free collection galleries and changing art exhibitions on First Hill. Talks and gallery conversations have their own schedules; group visits may need advance arrangements.',
    note: 'A free afternoon with art on First Hill.', moods: ['Quiet', 'Cheap', 'Strange'], price: 0, duration: 90,
    lat: 47.6069, lng: -122.3241, website: 'https://www.fryemuseum.org/visit', address: '704 Terry Avenue, Seattle, WA 98104', hours: 'Wednesday-Sunday 11:00-17:00; Thursday until 20:00. Closed Monday-Tuesday; check holidays.' },
  { ...reviewed, id: 'museum-of-flight', name: 'The Museum of Flight', category: 'Aviation museum', neighborhood: 'Boeing Field',
    description: 'Aircraft and aerospace exhibitions at the main museum beside Boeing Field. This is not the separate aircraft restoration facility at Paine Field. Allow extra travel time from downtown.',
    note: 'An afternoon tracing the history of flight.', moods: ['Strange', 'Social'], price: 29, duration: 180,
    lat: 47.518, lng: -122.2964, website: 'https://www.museumofflight.org/visit/', address: '9404 East Marginal Way South, Seattle, WA 98108', hours: 'Daily 10:00-17:00, with holiday closures. Check First Thursday evening admission separately.' },
  { ...reviewed, id: 'central-library', name: 'Seattle Central Library', category: 'Library & architecture', neighborhood: 'Downtown',
    description: 'Explore the public spaces and Books Spiral of Seattle Public Library\'s downtown building. Library programs, tours and room access have separate availability.',
    note: 'Books and architecture across eleven floors.', moods: ['Quiet', 'Cheap', 'Strange'], price: 0, duration: 60,
    lat: 47.6064, lng: -122.3327, website: 'https://www.spl.org/hours-and-locations/central-library', address: '1000 Fourth Avenue, Seattle, WA 98104', hours: 'Hours vary by weekday; check the branch page for holiday and service notices.' },
  { ...reviewed, id: 'gas-works-park', name: 'Gas Works Park', category: 'Park', neighborhood: 'Wallingford',
    description: 'Walk beside preserved industrial structures and enjoy Lake Union and skyline views. Swimming, wading, fishing and launching boats from this park are prohibited.',
    note: 'Lake Union views and an industrial silhouette.', moods: ['Outdoors', 'Cheap', 'Romantic'], price: 0, duration: 75, outdoor: 100,
    lat: 47.6456, lng: -122.3344, website: 'https://www.seattle.gov/parks/allparks/gas-works-park', address: '2101 N Northlake Way, Seattle, WA 98103', hours: 'Regular park hours 06:00-22:00. Check event restrictions and city notices.' },
  { ...reviewed, id: 'discovery-park', name: 'Discovery Park', category: 'Park & trails', neighborhood: 'Magnolia',
    description: 'Forest, meadow and bluff trails with Puget Sound views. The visitor center is closed until summer 2027 according to Seattle Parks; the park remains open. Beach parking and trail access have restrictions.',
    note: 'Room for a longer walk above Puget Sound.', moods: ['Outdoors', 'Quiet', 'Cheap'], price: 0, duration: 150, outdoor: 100,
    lat: 47.6573, lng: -122.4057, website: 'https://www.seattle.gov/parks/allparks/discovery-park', address: '3801 Discovery Park Boulevard, Seattle, WA 98199', hours: 'Check park and trail notices; visitor center closed. Beach access is not a guaranteed short or step-free walk.' },
  { ...reviewed, id: 'seattle-japanese-garden', name: 'Seattle Japanese Garden', category: 'Garden', neighborhood: 'Washington Park',
    description: 'A landscaped garden within Washington Park Arboretum. Admission is separate from the surrounding arboretum. Current construction limits capacity; check access notices before visiting.',
    note: 'A garden visit that changes with the seasons.', moods: ['Outdoors', 'Quiet', 'Romantic'], price: 10, duration: 75, outdoor: 100,
    lat: 47.629, lng: -122.2964, website: 'https://www.seattlejapanesegarden.org/visit', address: '1075 Lake Washington Boulevard E, Seattle, WA 98112', hours: 'Seasonal March-November; closed Mondays and December-February. Last entry 45 minutes before closing; some dates open at noon.' },
  { ...shared, id: 'vita-kexp', name: 'Caffe Vita at KEXP', category: 'Cafe', neighborhood: 'Uptown',
    description: 'Coffee inside KEXP at Seattle Center, with the radio station and a record shop sharing the building.',
    note: 'Coffee with a Seattle soundtrack.', moods: ['Quiet', 'Social', 'Cheap'],
    price: 10, lat: 47.6235, lng: -122.3553, open: 480, close: 1080, duration: 60, accessible: true,
    access: 'KEXP reports that all public entrances are accessible. Confirm restroom and seating requirements with the venue.', energy: 30, unusual: 45, outdoor: 0,
    website: 'https://www.kexp.org/visit/', address: '472 1st Ave N, Seattle, WA 98109',
    hours: 'Mon-Fri 07:00-18:00; Sat-Sun 08:00-18:00. Planning uses the shared 08:00-18:00 window.', hoursKnown: true },
  { ...shared, id: 'sub-pop-kexp', name: 'Sub Pop at KEXP', category: 'Record store', neighborhood: 'Uptown',
    description: 'The Sub Pop shop in KEXP\'s Gathering Space sells records, label merchandise, and music-related gifts.',
    note: 'A little piece of the local music scene.', moods: ['Strange', 'Social'],
    price: 0, lat: 47.6235, lng: -122.3552, open: 600, close: 1080, duration: 45, accessible: true,
    access: 'KEXP reports accessible public entrances. Interior aisle and counter access have not been independently checked.', energy: 45, unusual: 75, outdoor: 0,
    website: 'https://www.kexp.org/visit/', address: '472 1st Ave N, Seattle, WA 98109', hours: 'Daily 10:00-18:00; confirm holiday changes.', hoursKnown: true },
  { ...shared, id: 'olympic-sculpture-park', name: 'Olympic Sculpture Park', category: 'Sculpture park', neighborhood: 'Belltown',
    description: 'Seattle Art Museum\'s free waterfront sculpture park connects outdoor art, native planting, and views over Elliott Bay.',
    note: 'Art, salt air, and a slower afternoon.', moods: ['Outdoors', 'Quiet', 'Cheap', 'Romantic'],
    price: 0, lat: 47.6166, lng: -122.3553, open: 0, close: 1440, duration: 75, accessible: null,
    access: 'SAM publishes an accessibility guide and park sensory map. Verify the route that suits your needs; step-free status is not confirmed here.', energy: 20, unusual: 65, outdoor: 100,
    website: 'https://www.seattleartmuseum.org/visit/olympic-sculpture-park', address: '2901 Western Ave, Seattle, WA 98121',
    hours: 'Opens 30 minutes before sunrise; closes 30 minutes after sunset. Seasonal times are not calculated here.', hoursKnown: false },
  { ...shared, id: 'elliott-bay-books', name: 'Elliott Bay Book Company', category: 'Bookstore', neighborhood: 'Capitol Hill',
    description: 'An independent bookstore on 10th Avenue with a broad selection and an author-event calendar. Event locations and admission vary.',
    note: 'Leave room in your bag for one more book.', moods: ['Quiet', 'Strange', 'Cheap'],
    price: 0, lat: 47.6146, lng: -122.3192, open: 0, close: 1440, duration: 60, accessible: null,
    access: unverifiedAccess, energy: 20, unusual: 55, outdoor: 0,
    website: 'https://www.elliottbaybook.com/', address: '1521 10th Ave, Seattle, WA 98122', hours: 'Check the official Map & Hours page before visiting.', hoursKnown: false },
  { ...shared, id: 'pike-place-chowder', name: 'Pike Place Chowder', category: 'Seafood restaurant', neighborhood: 'Pike Place Market',
    description: 'The Post Alley flagship serves chowders and seafood in the Pike Place Market neighborhood. This listing is for Post Alley, not the Pacific Place branch.',
    note: 'A chowder stop in Post Alley.', moods: ['Social'],
    price: 25, lat: 47.6094243, lng: -122.3412192, open: 660, close: 1020, duration: 60, accessible: null,
    access: unverifiedAccess, energy: 65, unusual: 35, outdoor: 0,
    website: 'https://www.pikeplacechowder.com/', address: '1530 Post Alley, Seattle, WA 98101', hours: 'Daily 11:00-17:00; confirm holiday changes.', hoursKnown: true },
  { ...shared, id: 'piroshky-pike-place', name: 'Piroshky Piroshky', category: 'Bakery', neighborhood: 'Pike Place Market',
    description: 'The Pike Place bakery offers sweet and savory filled pastries. Check the bakery\'s own listing for today\'s menu and pickup hours.',
    note: 'Something warm for a market wander.', moods: ['Cheap', 'Social'],
    price: 12, lat: 47.6102, lng: -122.3425, open: 0, close: 1440, duration: 30, accessible: null,
    access: unverifiedAccess, energy: 50, unusual: 45, outdoor: 0,
    website: 'https://piroshkybakery.com/stores', address: 'Pike Place Market, Seattle, WA', hours: 'Check the official Pike Place store listing.', hoursKnown: false },
  { ...shared, id: 'kexp', name: 'KEXP Gathering Space', category: 'Music & community', neighborhood: 'Uptown',
    description: 'KEXP welcomes visitors to its Seattle Center home. Check the official calendar for individual performances, signups, and capacity; a visit does not include a guaranteed live show.',
    note: 'Meet the city through its music.', moods: ['Strange', 'Social'],
    price: 0, lat: 47.6234, lng: -122.3554, open: 540, close: 1080, duration: 60, accessible: true,
    access: 'KEXP reports all public entrances are accessible. Ask the front desk about specific event accommodations.', energy: 55, unusual: 70, outdoor: 0,
    website: 'https://www.kexp.org/visit/', address: '472 1st Ave N, Seattle, WA 98109', hours: 'Front desk daily 09:00-18:00. Individual events have separate times.', hoursKnown: true },
  { ...shared, id: 'sam-tour-2026-09-19', name: 'Discover the Olympic Sculpture Park', category: 'Guided tour', neighborhood: 'Belltown',
    description: 'SAM lists a free, hour-long guided outdoor tour of the park\'s artworks and ecosystems on September 19, 2026. Confirm meeting instructions and any changes with SAM.',
    note: 'Sep 19, 2026 / 13:00-14:00 Pacific', moods: ['Outdoors', 'Social', 'Cheap'],
    price: 0, lat: 47.6166, lng: -122.3553, open: 780, close: 840, duration: 60, accessible: null,
    access: 'Contact SAM for the tour route and accommodations. Do not assume every route is step-free.', energy: 40, unusual: 70, outdoor: 100,
    website: 'https://www.seattleartmuseum.org/whats-on/events/public-tour-discover-the-olympic-sculpture-park-sep-19-26',
    address: 'Olympic Sculpture Park, 2901 Western Ave, Seattle, WA 98121', hours: 'September 19, 2026, 13:00-14:00 America/Los_Angeles.', hoursKnown: true, eventDate: '2026-09-19' },
];

export const placeById = new Map(places.map(place => [place.id, place]));
export const lensNames: Record<Lens, string> = { journal: 'Field Journal', nocturne: 'Nocturne', civic: 'Civic Modern' };