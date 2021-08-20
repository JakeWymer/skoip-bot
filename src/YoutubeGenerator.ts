import { Track, TrackGenerator } from "./types.js";
import ytdl from "ytdl-core";
import ytpl from "ytpl";

class YoutubeGenerator implements TrackGenerator {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
  generateTracks = async (): Promise<Track[]> => {
    // Is a track URI
    const youtubeTrackRegex = `^https://(www\.)?youtube\.com/watch\?.*v=([a-zA-Z0-9]+).*`;
    const youtubeTrackMatch = this.url.match(youtubeTrackRegex);
    if (youtubeTrackMatch) {
      const trackId = youtubeTrackMatch[2];
      const trackInfo = await ytdl.getBasicInfo(this.url);
      return [{ title: trackInfo.videoDetails.title, ytId: trackId }];
    }
    const youtubePlaylistRegex = `^https://(www\.)?youtube\.com/playlist\?.*list=([a-zA-Z0-9]+).*`;
    const youtubePlaylistMatch = this.url.match(youtubePlaylistRegex);
    if (youtubePlaylistMatch) {
      const playlistInfo = await ytpl(this.url);
      const tracks = playlistInfo.items.map((playlistItem) => {
        return { title: playlistItem.title, ytId: playlistItem.id };
      });
      return tracks;
    }
    return [];
  };
}

export default YoutubeGenerator;
