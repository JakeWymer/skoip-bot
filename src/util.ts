import axios from "axios";
import { TextChannel } from "discord.js";
import SpotifyWebApi from "spotify-web-api-node";
import Server from "./db/models/Server.js";
import { SkoipyPlaylistResponse } from "./types";

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

export const generateSkoipyPlaylist = async (
  guildId: string,
  generatorId: number
) => {
  const serverConfig = (await Server.findOne({
    where: {
      server_id: guildId,
    },
  })) as any;
  if (!serverConfig || !serverConfig.skoipy_api_key) {
    return null;
  }
  const url = `https://skoipy.com/api/generators/${generatorId}/generate`;
  const response = await axios.post<SkoipyPlaylistResponse>(url, {
    apiKey: serverConfig.skoipy_api_key,
  });
  return response.data.playlist.uri;
};

export const setSkoipyKey = async (
  skoipyKey: string,
  guildId: string,
  channel: TextChannel
) => {
  let serverConfig = (await Server.findOne({
    where: {
      server_id: guildId,
    },
  })) as any;
  if (!serverConfig) {
    serverConfig = await Server.create({
      server_id: guildId,
    });
  }
  serverConfig.skoipy_api_key = skoipyKey;
  serverConfig.save();
  return channel.send(`Set Skoipy API key`);
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
