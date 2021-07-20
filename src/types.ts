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

export enum Commands {
  PLAY = "play",
  SKIP = "skip",
  SHUFFLE = "shuffle",
  QUEUE_RANDOM = "random",
  CLEAR_QUEUE = "clear",
  SHOW_QUEUE = "queue",
  LEAVE = "leave",
  SET_SHEET = "set_sheet_id",
}
