import { BookOpen, Building2, CalendarDays, Clapperboard, Coffee, Croissant, Beer, Disc3, Fish, Flower2, Footprints, Landmark, Library, MapPin, Mountain, Music, PartyPopper, Plane, ShoppingBag, Shapes, Trees, Trophy, UtensilsCrossed } from 'lucide-react';

const icons: Record<string, typeof MapPin> = {
  Park: Trees, 'Neighborhood park': Trees, 'Park & trails': Trees, Garden: Flower2, 'Viewpoint & waterfront': Mountain, Trail: Footprints, 'Sculpture park': Shapes,
  Museum: Landmark, 'Art museum': Landmark, 'History museum': Landmark, 'Natural history museum': Landmark, 'Aviation museum': Plane, 'Cultural space': Landmark,
  'Library & architecture': Library, Landmark: MapPin, Coffee, Cafe: Coffee, 'Food institution': UtensilsCrossed, 'Seafood restaurant': Fish, 'Bakery & sweets': Croissant, Bakery: Croissant,
  'Bar & brewery': Beer, 'Books & records': BookOpen, Bookstore: BookOpen, 'Record store': Disc3, 'Shop & games': ShoppingBag, 'Music venue': Music, 'Music & community': Music,
  'Theater & film': Clapperboard, 'Sports venue': Trophy, 'Annual tradition': PartyPopper, 'Seasonal festival': PartyPopper, 'Seattle Center Festál': PartyPopper,
  Recurring: CalendarDays, 'Guided tour': Footprints, Neighborhood: Building2, 'Beyond Seattle': MapPin,
};
const families: [string, RegExp][] = [
  ['outdoors', /park|garden|trail|viewpoint|waterfront/i],
  ['culture', /museum|cultural|landmark|librar|book|theater|film/i],
  ['food', /coffee|cafe|food|restaurant|bak|bar|brew/i],
  ['night', /music|record|sports|shop|games/i],
  ['events', /tradition|festival|festál|recurring|tour|event/i],
];

export function artFor(category: string) {
  return { Icon: icons[category] ?? MapPin, family: families.find(([, pattern]) => pattern.test(category))?.[0] ?? 'place' };
}

/** Decorative category tile used wherever the app once showed stock photos. */
export function CategoryArt({ category, className = '', size = 28 }: { category: string; className?: string; size?: number }) {
  const { Icon, family } = artFor(category);
  return <div className={`category-art ${className}`.trim()} data-family={family} aria-hidden="true"><Icon size={size} strokeWidth={1.2} /></div>;
}
