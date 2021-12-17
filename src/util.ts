import { TextChannel } from "discord.js";
import SpotifyWebApi from "spotify-web-api-node";

export const setupSpotifyApi = async (): Promise<SpotifyWebApi> => {
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  // Retrieve an access token.
  const spotifyToken = await spotifyApi.clientCredentialsGrant();
  spotifyApi.setAccessToken(spotifyToken.body.access_token);

  return spotifyApi;
};

export const getRandomElement = (arr: any[]) => {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
};

export class ErrorLogger {
  errorChannel: TextChannel;

  constructor(channel: TextChannel) {
    this.errorChannel = channel;
    this.log("Logging online");
  }

  log(message: string) {
    this.errorChannel.send(message);
  }
}
