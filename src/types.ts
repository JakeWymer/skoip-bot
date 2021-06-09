export type Track = {
  title: string;
  artist: string;
  spotifyId: string;
};

export interface TrackGenerator {
  generateTracks(): Promise<Track[]>;
}

export type SheetResponse = {
  name: string;
  uri: string;
};
