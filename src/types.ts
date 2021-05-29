export type Track = {
  title: string;
  artist: string;
  ytId: string;
};

export interface TrackGenerator {
  generateTracks(): Promise<Track[]>;
}

export type SheetResponse = {
  name: string;
  uri: string;
};
