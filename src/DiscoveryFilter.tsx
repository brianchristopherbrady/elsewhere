import { activityLabels, type ActivityKind } from './event-types';

export type DiscoveryKind = 'places' | 'staples' | 'music' | 'events' | ActivityKind;

export function DiscoveryFilter({ value, onChange }: { value: DiscoveryKind; onChange: (value: DiscoveryKind) => void }) {
  return <label className="feed-date">Discovery type<select value={value} onChange={event => onChange(event.target.value as DiscoveryKind)}>
    <option value="places">Places</option>
    <option value="staples">Seattle staples &amp; traditions</option>
    <option value="events">Live events</option>
    <option value="music">Music &amp; Venues</option>
    {(Object.keys(activityLabels) as ActivityKind[]).map(kind => <option key={kind} value={kind}>{activityLabels[kind]}</option>)}
  </select></label>;
}