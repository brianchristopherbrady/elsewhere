import type { Activity } from './activities.ts';

// Imported from the user's discovery_items.md list; entries are leads, not individually verified records.
export type Staple = { id: string; name: string; group: string; area?: string; timing?: string; note?: string; event: boolean; outside: boolean };
type Extra = { area?: string; timing?: string; event?: boolean; outside?: boolean };

function slug(text: string): string {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function list(group: string, names: string, extra: Extra = {}): Staple[] {
  return names.split(';').map(name => name.trim()).filter(Boolean).map(name => ({ id: `staple:${slug(name)}`, name, group, event: false, outside: false, ...extra }));
}
function item(group: string, name: string, extra: Extra & { note?: string } = {}): Staple {
  return { id: `staple:${slug(name)}`, name, group, event: false, outside: false, ...extra };
}

const tradition = (name: string, timing: string, note: string, area?: string) => item('Annual tradition', name, { timing, note, area, event: true });
const festival = (timing: string, names: string) => list('Seasonal festival', names, { timing, event: true });
const beyond = (area: string, names: string, event = false) => list('Beyond Seattle', names, { area, outside: true, event });

export const staples: Staple[] = [
  ...list('Park', 'Seward Park; Green Lake Park; Golden Gardens; Alki Beach; Lincoln Park; Carkeek Park; Magnuson Park; Volunteer Park; Washington Park Arboretum; Ravenna Park; Cowen Park; Woodland Park; Camp Long; Schmitz Preserve; Frink Park; Interlaken Park; Northacres Park; Llandover Woods; Cheasty Greenspace; West Duwamish Greenbelt'),
  ...list('Garden', 'Kubota Garden; Volunteer Park Conservatory; Woodland Park Rose Garden; Carl S. English Jr. Botanical Garden; Seattle Chinese Garden; South Seattle College Arboretum; UW Center for Urban Horticulture; Union Bay Natural Area; Parsons Gardens; Bradner Gardens; Danny Woo Community Garden; Dunn Gardens; Beacon Food Forest'),
  ...list('Viewpoint & waterfront', 'Kerry Park; Marshall Park; Bhy Kracke Park; Kinnear Park; Ella Bailey Park; Magnolia Park', { area: 'Queen Anne / Magnolia' }),
  ...list('Viewpoint & waterfront', 'Sunset Hill Park; Fremont Peak Park; Fremont Canal Park; Salmon Bay Park; Ballard Commons; Commodore Park', { area: 'Ballard / Fremont' }),
  ...list('Viewpoint & waterfront', 'Hamilton Viewpoint; Belvedere Park; Emma Schmitz Memorial Overlook; Me-Kwa-Mooks Park; Jack Block Park; Seacrest Park; Don Armeni Boat Ramp waterfront', { area: 'West Seattle' }),
  ...list('Viewpoint & waterfront', 'Waterfront Park; Pier 62; Overlook Walk; Myrtle Edwards Park; Centennial Park; Victor Steinbrueck Park', { area: 'Downtown waterfront' }),
  ...list('Viewpoint & waterfront', 'Lake Union Park; Fairview Park; South Passage Point Park; Cheshiahud Lake Union Loop', { area: 'Lake Union' }),
  ...list('Viewpoint & waterfront', 'Madison Park Beach; Madrona Beach; Denny Blaine Park; Leschi Park; Mount Baker Beach; Colman Park; Pritchard Island Beach; Beer Sheva Park; Matthews Beach', { area: 'Lake Washington' }),
  ...list('Neighborhood park', 'Cal Anderson Park; Louisa Boren Lookout; Jefferson Park; Dr. Jose Rizal Park; Judkins Park; Jimi Hendrix Park; Pratt Park; Powell Barnett Park; Othello Park; Hing Hay Park; Kobe Terrace; Occidental Square; Waterfall Garden Park; Freeway Park; Denny Park; Westlake Park; Tilikum Place; Licton Springs Park; Duwamish Waterway Park; Herring\'s House Park'),
  ...list('Trail', 'Burke-Gilman Trail; Elliott Bay Trail; Alki Trail; Chief Sealth Trail; Duwamish River Trail; Interurban Trail North; Ship Canal Trail; Mountains to Sound Trail (I-90); SR 520 Trail; Lake Washington Boulevard'),
  ...list('Museum', 'Seattle Asian Art Museum; Henry Art Gallery; Chihuly Garden and Glass; MOHAI; National Nordic Museum; Northwest African American Museum; Klondike Gold Rush National Historical Park; Log House Museum; Pacific Science Center; Seattle Aquarium; Woodland Park Zoo; Seattle Children\'s Museum; Museum of Pop Culture; Seattle Pinball Museum; Connections Museum; Last Resort Fire Department Museum; Georgetown Steam Plant; Holocaust Center for Humanity; Gates Foundation Discovery Center; Sea Mar Museum of Chicano/a/Latino/a Culture'),
  ...list('Cultural space', 'Duwamish Longhouse; Daybreak Star Indian Cultural Center; Japanese Cultural & Community Center of Washington; Wa Na Wari; Langston Hughes Performing Arts Institute; Pratt Fine Arts Center; Hugo House; Town Hall Seattle; ARTS at King Street Station; El Centro de la Raza; Center for Wooden Boats'),
  ...list('Landmark', 'Pike Place Market; Pike Place Fish Market; Rachel the Pig; Gum Wall; Post Alley; MarketFront', { area: 'Pike Place' }),
  ...list('Landmark', 'Space Needle; Seattle Center Monorail; International Fountain; Artists at Play playground', { area: 'Seattle Center' }),
  ...list('Landmark', 'Smith Tower; Sky View Observatory; King Street Station; The Spheres; Ballard Locks and fish ladder; Fishermen\'s Terminal; West Point Lighthouse; Alki Point Lighthouse; West Seattle Water Taxi; Bainbridge ferry ride; Hammering Man; Black Sun; Chief Seattle statue; Bruce and Brandon Lee graves; Jimi Hendrix statue; Underground Tour; Beneath the Streets; St. James Cathedral; St. Mark\'s Cathedral'),
  ...list('Landmark', 'Fremont Troll; Fremont Rocket; Waiting for the Interurban; Lenin statue', { area: 'Fremont' }),
  item('Landmark', 'Hat \'n\' Boots', { area: 'Georgetown' }),
  ...list('Landmark', 'UW Quad; Suzzallo Library Reading Room; Drumheller Fountain; Rainier Vista', { area: 'University of Washington' }),
  ...list('Coffee', 'Espresso Vivace; Café Allegro; Lighthouse Roasters; Caffè Vita; Victrola Coffee; Caffè Ladro; Caffè Umbria; Herkimer Coffee; Zoka Coffee; Monorail Espresso; Uptown Espresso; Fremont Coffee Company; Cloud City Coffee; Couth Buzzard; Milstead & Co.; Analog Coffee; Ghost Note Coffee; Elm Coffee Roasters; Anchorhead Coffee; Fulcrum Coffee; Café Hagen; Olympia Coffee; Sound & Fog; Boon Boona; Café Avole; Hello Em; Phin; Coffeeholic House; Phê; Push x Pull; Ancient Gate Coffee; Mr. West; Bonhomie Coffee Bar; Slow Day Coffee; Cardoon; Day Made Kaffe Bar'),
  item('Coffee', 'Starbucks at 1912 Pike Place', { area: 'Pike Place' }),
  ...list('Food institution', 'Dick\'s Drive-In; Ivar\'s Acres of Clams; Ivar\'s Salmon House; Canlis; Maneki; Tai Tung; Pho Bac; The Athenian; Lowell\'s; Beecher\'s; Three Girls Bakery; Market Grill; Oriental Mart; Le Pichet; The Pink Door; Matt\'s in the Market; The Walrus and the Carpenter; Ray\'s Boathouse; The Lockspot; Chinook\'s; Beth\'s Café; Ezell\'s; Un Bien; Paseo; Salumi; Marination Ma Kai; Salty\'s on Alki; Loretta\'s Northwesterner; Tacos Chukis; Tilikum Place Cafe'),
  ...list('Bakery & sweets', 'Bakery Nouveau; Macrina Bakery; Sea Wolf Bakers; Saint Bread; Le Panier; Dahlia Bakery; Fuji Bakery; Hood Famous; Temple Pastries; Columbia City Bakery; Larsen\'s Bakery; Coyle\'s Bakeshop; Mighty-O Donuts; Top Pot Doughnuts; Daily Dozen Doughnut Company; Molly Moon\'s; Husky Deli; Shug\'s Soda Fountain'),
  ...list('Bar & brewery', 'Blue Moon Tavern; Merchants Cafe; Central Saloon; Shorty\'s; The 5 Point; Hattie\'s Hat; The Sloop; Linda\'s Tavern; Comet Tavern; Crescent Lounge; Unicorn; Canon; Bathtub Gin & Co.; Foreign National; Fremont Brewing; Georgetown Brewing; Reuben\'s Brews; Stoup Brewing; Urban Family Brewing; Holy Mountain Brewing'),
  ...list('Books & records', 'Third Place Books Ravenna; Third Place Books Seward Park; University Book Store; Magus Books; Twice Sold Tales; Open Books; Arundel Books; Book Larder; Charlie\'s Queer Books; Phinney Books; Secret Garden Books; Queen Anne Book Company; Fantagraphics Bookstore; Kinokuniya; Estelita\'s Library; Easy Street Records; Sonic Boom Records; Scarecrow Video'),
  ...list('Shop & games', 'Archie McPhee; Ye Olde Curiosity Shop; Georgetown Trailer Park Mall; Seattle Antiques Market; Golden Age Collectables; Old Seattle Paperworks; Uwajimaya; DeLaurenti; REI flagship; Add-a-Ball; Jupiter Bar; Mox Boarding House; Raygun Lounge; GameWorks; Flatstick Pub; Kraken Community Iceplex'),
  ...list('Music venue', 'The Showbox; Showbox SoDo; The Crocodile; Neumos; Barboza; Paramount Theatre; Moore Theatre; Neptune Theatre; Tractor Tavern; Sunset Tavern; Conor Byrne; Nectar Lounge; The Royal Room; Columbia City Theater; Clock-Out Lounge; Sea Monster Lounge; Dimitriou\'s Jazz Alley; The Triple Door; Vera Project'),
  ...list('Theater & film', 'Benaroya Hall; McCaw Hall; Seattle Rep; Seattle Children\'s Theatre; The 5th Avenue Theatre; ACT Theatre; On the Boards; Intiman Theatre; Theatre Off Jackson; Unexpected Productions; SIFF Cinema Downtown; SIFF Cinema Uptown; SIFF Film Center; Northwest Film Forum; Central Cinema; The Beacon'),
  ...list('Sports venue', 'T-Mobile Park; Lumen Field; Climate Pledge Arena; Husky Stadium'),
  tradition('Fremont Solstice Cyclists', 'June', 'Body-painted, often nude bicycle ride associated with the parade.', 'Fremont'),
  tradition('Fremont Solstice Parade', 'June', 'Handmade floats, giant puppets, costumes and community art.', 'Fremont'),
  tradition('Fremont Fair / Art Car Blowout', 'June', 'Street fair, music and elaborately decorated vehicles.', 'Fremont'),
  tradition('HONK! Fest West', 'Late May-June', 'Community street bands performing across neighborhoods.'),
  tradition('Georgetown Carnival', 'June', 'Arts, performances, music and eccentric street-fair energy.', 'Georgetown'),
  tradition('Moisture Festival', 'March-April', 'Comedy, variety, circus and unusual performance acts.'),
  tradition('Dead Baby Downhill', 'August', 'DIY bicycle-culture gathering and party; locations vary.'),
  tradition('Luminata', 'September', 'Lantern procession and illuminated art.', 'Green Lake'),
  tradition('Trolloween', 'October 31', 'Fremont Troll birthday celebration and costumed procession.', 'Fremont'),
  tradition('Syttende Mai', 'May 17', 'Norwegian Constitution Day celebrations and parade.', 'Ballard'),
  tradition('Seattle Bon Odori', 'July', 'Japanese Buddhist community dance festival.'),
  tradition('Fishermen\'s Fall Festival', 'September-October', 'Maritime and fishing-fleet community celebration.'),
  tradition('R-Day', 'September', 'Rainier Beer celebration and music; 21+.', 'Georgetown'),
  tradition('Great Pumpkin Beer Festival', 'Autumn', 'Pumpkin-themed beer festival; verify the current venue.'),
  tradition('Pathway of Lights', 'December', 'Luminarias around the lake; separate from Luminata.', 'Green Lake'),
  tradition('Christmas Ship Festival', 'Late November-December', 'Decorated boats, choirs and shoreline gatherings.'),
  tradition('Independent Bookstore Day', 'April', 'Seattle-area bookstore crawl and passport challenge.'),
  ...festival('Winter-early spring', 'Seattle Polar Bear Plunge; MLK Day community events; CID Lunar New Year celebrations; Seattle Museum Month; Northwest Flower & Garden Festival; Seattle Boat Show; Emerald City Comic Con; Seattle Jewish Film Festival; Taste Washington; St. Patrick\'s Day Parade; Sakura-Con; Seattle Restaurant Week; NFFTY; UW cherry blossoms'),
  ...festival('Late spring', 'Seattle International Film Festival; U District Street Fair; Northwest Folklife; Opening Day of Boating Season; Windermere Cup; Seattle International Dance Festival'),
  ...festival('Summer', 'Seattle Pride Parade; PrideFest Capitol Hill; PrideFest Seattle Center; Pride in the Park; Seattle Dyke March; Juneteenth celebrations; Seafair Fourth of July; Seafair Torchlight Parade; Seafair Torchlight Run; Seafair Fleet Week; Seafair Weekend hydroplanes and air show; Ballard SeafoodFest; West Seattle Summer Fest; West Seattle Grand Parade; Capitol Hill Block Party; Seattle Art Fair; Seattle Chamber Music Society Summer Festival; Seafair Indian Days Powwow; Pista sa Nayon; Umoja Fest; Lake City Summer Festival & Parade; Sunset Supper at Pike Place Market; Seattle Design Festival; Big Day of Play; Obliteride; Seattle to Portland Bicycle Classic'),
  ...festival('Late summer-autumn', 'Bumbershoot; PAX West; Fremont Oktoberfest; CID Night Market; Local Sightings Film Festival; Northwest Tea Festival; Walk the Block at Wa Na Wari; Earshot Jazz Festival; Refract glass-art events; Seattle Latino Film Festival; Tasveer Film Festival; Fauntleroy Fall Festival; Freakout Festival; Short Run Comix & Arts Festival; Julefest; Seattle Marathon; Urban Craft Uprising; Seattle Queer & Trans Film Festival'),
  ...festival('Holiday season', 'Seattle Center Winterfest; WildLanterns at Woodland Park Zoo; PNB\'s The Nutcracker; Candy Cane Lane; Olympic Manor lights; Westlake tree lighting; Pike Place Market holiday festivities; New Year\'s at the Needle'),
  ...([['February', 'Tết in Seattle'], ['March', 'Irish Festival; French Fest'], ['April', 'Cherry Blossom & Japanese Cultural Festival'], ['May', 'AANHPI Heritage Month Celebration; A Glimpse of China; Spirit of Africa'], ['June', 'Pagdiriwang Philippine Festival; Indigenous People Festival'], ['July', 'Polish Festival'], ['August', 'A Day in Punjab; Tibet Fest; BrasilFest; Festival Sundiata'], ['September', 'Live Aloha; Sea Mar Fiestas Patrias; Italian Festival'], ['October', 'CroatiaFest; Turkfest'], ['October-November', 'Día de Muertos'], ['November', 'Diwali; Seattle Hmong New Year']] as const)
    .flatMap(([timing, names]) => list('Seattle Center Festál', names, { area: 'Seattle Center', timing, event: true })),
  ...list('Recurring', 'Fremont Sunday Market; Ballard Farmers Market; University District Farmers Market; West Seattle Farmers Market; Capitol Hill Farmers Market; Georgetown Steam Plant open houses; KEXP sessions and events; Couth Buzzard performances; Duck Dodge sailing races; Lake Washington Boulevard car-free days; Shakespeare in the parks; ZooTunes; Rat City Roller Derby; Capitol Hill Art Walk; West Seattle Art Walk; Belltown Art Walk; Ballard Art Walk; Georgetown Art Attack', { timing: 'Recurring', event: true }),
  ...list('Recurring', 'Columbia City Farmers Market; Lake City Farmers Market; Phinney Farmers Market; Magnolia Farmers Market', { timing: 'Seasonal', event: true }),
  item('Recurring', 'Pioneer Square First Thursday Art Walk', { timing: 'First Thursday', event: true }),
  ...list('Neighborhood', 'Pioneer Square; Chinatown-International District; Japantown; Little Saigon; Capitol Hill; Ballard; Fremont; Wallingford; University District; Phinney Ridge; Greenwood; Green Lake; Queen Anne; Uptown; Belltown; South Lake Union; Eastlake; West Seattle Junction; Admiral; Alki; Georgetown; South Park; Columbia City; Beacon Hill; Central District; Madrona; Leschi; Madison Park; Rainier Beach; Othello'),
  ...beyond('Bainbridge Island', 'Winslow; Bainbridge Island Museum of Art; Bloedel Reserve'),
  ...beyond('Bainbridge Island', 'Chilly Hilly', true),
  ...beyond('Vashon Island', 'Vashon town center; Point Robinson'),
  ...beyond('Vashon Island', 'Vashon Strawberry Festival', true),
  ...beyond('Snoqualmie', 'Snoqualmie Falls; Northwest Railway Museum'),
  ...beyond('Bellevue', 'Bellevue Botanical Garden; Bellevue Downtown Park; KidsQuest Children\'s Museum'),
  ...beyond('Bellevue', 'Garden d\'Lights', true),
  ...beyond('Redmond', 'Marymoor Park; Sammamish River Trail'),
  ...beyond('Kirkland', 'Kirkland waterfront'),
  ...beyond('Edmonds', 'Cascadia Art Museum; Edmonds waterfront'),
  ...beyond('Shoreline', 'Richmond Beach; Kruckeberg Botanic Garden'),
  ...beyond('Federal Way', 'Pacific Bonsai Museum; Rhododendron Species Botanical Garden'),
  ...beyond('Tacoma', 'Museum of Glass; Tacoma Art Museum; Washington State History Museum; LeMay - America\'s Car Museum; Point Defiance Park'),
  ...beyond('Washington', 'Washington State Fair; Issaquah Salmon Days; Skagit Valley Tulip Festival', true),
];

export const stapleGroups = [...new Set(staples.map(staple => staple.group))];

function where(staple: Staple): string {
  return staple.outside ? `${staple.area}, Washington` : `${staple.area ? `${staple.area}, ` : ''}Seattle`;
}

export function stapleMapLink(staple: Staple): string {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${staple.name}, ${where(staple)}`)}`;
}

const cityParkGroups = new Set(['Park', 'Neighborhood park']);
// No official URL is on file for list entries, so point to the best verified directory or a search.
export function stapleSource(staple: Staple): { url: string; label: string } {
  if (staple.group === 'Seattle Center Festál') return { url: 'https://www.seattlecenter.com/events/featured-events/festal', label: 'Check the Seattle Center Festál schedule' };
  if (cityParkGroups.has(staple.group)) return { url: 'https://www.seattle.gov/parks/parks', label: 'Check the Seattle Parks directory' };
  return { url: `https://duckduckgo.com/?q=${encodeURIComponent(`${staple.name} ${where(staple)} official site`)}`, label: 'Search for the official site' };
}

export function stapleUnknowns(staple: Staple, confirmed?: { time?: string }): string[] {
  if (!staple.event) return ['exact address', 'hours', 'step-free access'];
  if (!confirmed) return ['this year\'s date', 'location', 'cost', 'step-free access'];
  return [...(confirmed.time ? [] : ['start time']), 'cost', 'step-free access'];
}

export function stapleActivity(staple: Staple): Activity {
  const place = staple.outside ? `${staple.area}, WA` : `${staple.area ? `${staple.area}, ` : ''}Seattle, WA`;
  return { id: staple.id, name: staple.name, category: staple.group, address: `${place} (confirm exact location)`, url: stapleSource(staple).url, ...(staple.timing ? { tags: [staple.timing] } : {}) };
}

export function filterStaples(query: string, group = ''): Staple[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return staples.filter(staple => (!group || staple.group === group)
    && terms.every(term => [staple.name, staple.group, staple.area ?? '', staple.timing ?? '', staple.note ?? ''].join(' ').toLocaleLowerCase().includes(term)));
}
