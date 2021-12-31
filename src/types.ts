export type Track = {
  title: string;
  artist?: string;
  spotifyId?: string;
  ytId?: string;
};

export interface TrackGenerator {
  generateTracks(): Promise<Track[]>;
}

export type SheetResponse = {
  name: string;
  uri: string;
};

export type SkoipyPlaylistResponse = {
  isError: boolean;
  playlist: any;
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
  AUTO_QUEUE = "auto_queue",
  SET_SKOIPY_KEY = "set_skoipy_api_key",
  GENERATE_AND_PLAY = "generate_and_play",
  AUTO_GENERATE = "auto_generate",
}
