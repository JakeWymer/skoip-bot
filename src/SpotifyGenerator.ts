import SpotifyWebApi from "spotify-web-api-node";

import { Track, TrackGenerator } from "./types.js";

class SpotifyGenerator implements TrackGenerator {
  url: string;
  spotifyApi: SpotifyWebApi;
  constructor(url: string, spotifyApi: SpotifyWebApi) {
    this.url = url;
    this.spotifyApi = spotifyApi;
  }
  generateTracks = async (): Promise<Track[]> => {
    // Is a track URI
    const spotifyTrackRegex = `^(https:\/\/open.spotify.com\/track\/|spotify:track:)([a-zA-Z0-9]+)(.*)$`;
    const spotifyTrackMatch = this.url.match(spotifyTrackRegex);
    if (spotifyTrackMatch) {
      const trackId = spotifyTrackMatch[2];
      const { body: track } = await this.spotifyApi.getTrack(trackId);
      return [
        {
          title: track.name,
          artist: track.artists[0].name,
          spotifyId: trackId,
        },
      ];
    }
    // Is an album URI
    const spotifyAlbumRegex = `^(https:\/\/open.spotify.com\/album\/|spotify:album:)([a-zA-Z0-9]+)(.*)$`;
    const spotifyAlbumMatch = this.url.match(spotifyAlbumRegex);
    if (spotifyAlbumMatch) {
      const albumId = spotifyAlbumMatch[2];
      return await this.handleAlbum(albumId);
    }
    // Is a playlist URI
    const spotifyPlaylistRegex = `^(https:\/\/open.spotify.com\/playlist\/|spotify:playlist:)([a-zA-Z0-9]+)(.*)$`;
    const spotifyPlaylistMatch = this.url.match(spotifyPlaylistRegex);
    if (spotifyPlaylistMatch) {
      const playlistId = spotifyPlaylistMatch[2];
      return await this.handlePlaylist(playlistId);
    }
    throw new Error(`Unsupported Spotify URI`);
  };
  private handleAlbum = async (albumId: string): Promise<Track[]> => {
    const albumReponse = await this.spotifyApi.getAlbumTracks(albumId);
    const trackItems = albumReponse.body.items;
    const tracks = await Promise.all(
      trackItems.map(async (item: SpotifyApi.TrackObjectSimplified) => {
        const track: Track = {
          title: item.name,
          artist: item.artists[0].name,
          spotifyId: item.id,
        };
        return track;
      })
    );
    return tracks;
  };
  private handlePlaylist = async (playlistId: string): Promise<Track[]> => {
    const playlistResponse = await this.spotifyApi.getPlaylistTracks(
      playlistId
    );
    const trackItems = playlistResponse.body.items;
    try {
      const tracks: Track[] = await Promise.all(
        trackItems.map(
          async (item: SpotifyApi.PlaylistTrackObject): Promise<Track> => {
            const track: Track = {
              title: item.track.name,
              artist: item.track.artists[0].name,
              spotifyId: item.track.id,
            };
            return track;
          }
        )
      );
      return tracks;
    } catch (err) {
      throw err;
    }
  };
}

export default SpotifyGenerator;
