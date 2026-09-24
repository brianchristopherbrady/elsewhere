export type ActivityKind = 'guided-tour' | 'meetup';

export const activityLabels: Record<ActivityKind, string> = {
  'guided-tour': 'Guided Tours',
  meetup: 'Meet Up',
};

export type LiveEvent = {
  id: string;
  title: string;
  activities: ActivityKind[];
  organizer: string;
  audience: string;
  location: string;
  category: string;
  start: string;
  end: string;
  startDate: string;
  endDate: string;
  schedule: string;
  url: string;
  provider?: string;
  cost: string;
  canceled: boolean;
  full: boolean;
};

export type EventFeed = {
  events: LiveEvent[];
  fetchedAt: string;
  stale: boolean;
  source: string;
  unavailable?: string[];
};