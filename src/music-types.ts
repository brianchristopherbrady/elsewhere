export type MusicShow = {
  id: string;
  title: string;
  date: string;
  start: string | null;
  schedule: string;
  venue: string;
  address: string;
  genre: string;
  url: string;
  price: string;
  age: string;
  status: string;
};

export type MusicFeed = {
  shows: MusicShow[];
  configured: boolean;
  fetchedAt: string;
  stale: boolean;
  truncated: boolean;
};