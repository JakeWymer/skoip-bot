import axios from "axios";
import { TextChannel } from "discord.js";
import SpotifyWebApi from "spotify-web-api-node";
import Server from "./db/models/Server.js";
import SpotifyGenerator from "./SpotifyGenerator.js";
import { SkoipyPlaylistResponse } from "./types";
import YoutubeGenerator from "./YoutubeGenerator.js";

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

export const getOrCreateServerConfig = async (guildId: string) => {
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
  return serverConfig;
};

export const setSkoipyKey = async (
  skoipyKey: string,
  guildId: string,
  channel: TextChannel
) => {
  const serverConfig = await getOrCreateServerConfig(guildId);
  serverConfig.skoipy_api_key = skoipyKey;
  serverConfig.save();
  return channel.send(`Set Skoipy API key`);
};

export const setOverrideSheet = async (
  skoipyKey: string,
  guildId: string,
  channel: TextChannel
) => {
  const serverConfig = await getOrCreateServerConfig(guildId);
  serverConfig.skoipy_api_key = skoipyKey;
  serverConfig.save();
  return channel.send(`Set Skoipy API key`);
};

export const getTrackGenerator = async (url: string) => {
  let generator;
  if (url.includes(`spotify`)) {
    const spotifyApi = await setupSpotifyApi();
    generator = new SpotifyGenerator(url, spotifyApi);
  } else if (url.includes("youtube")) {
    generator = new YoutubeGenerator(url);
  } else {
    throw new Error(`Unsupported integration`);
  }
  return generator;
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
