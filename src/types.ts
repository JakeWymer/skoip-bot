import { YoutubeTrack } from "@discordx/music";

export type SheetResponse = {
  name: string;
  uri: string;
};

export type SkoipyPlaylistResponse = {
  isError: boolean;
  playlist: any;
};

export enum UrlSources {
  YOUTUBE = `youtube`,
  SPOTIFY = `spotify`,
}

export interface SkoipyTrack {
  trackName: string;
  trackArtist: string;
  youtubeUrl: string;
}

export enum Commands {
  PLAY = "play",
  PLAY_NEXT = "play_next",
  SKIP = "skip",
  SHUFFLE = "shuffle",
  QUEUE_RANDOM = "random",
  CLEAR_QUEUE = "clear",
  SHOW_QUEUE = "queue",
  LEAVE = "leave",
  SET_SHEET = "set_sheet_id",
  SET_OVERRIDE_SHEET = "set_override_sheet",
  AUTO_QUEUE = "auto_queue",
  SET_SKOIPY_KEY = "set_skoipy_api_key",
  GENERATE_AND_PLAY = "generate_and_play",
  AUTO_GENERATE = "auto_generate",
}
