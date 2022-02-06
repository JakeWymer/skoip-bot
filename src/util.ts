import axios from "axios";
import { TextChannel } from "discord.js";
import Server from "./db/models/Server.js";
import { SkoipyPlaylistResponse, UrlSources } from "./types.js";

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

export const getUrlSource = (url: string) => {
  if (url.includes(UrlSources.SPOTIFY)) {
    return UrlSources.SPOTIFY;
  } else if (url.includes(UrlSources.YOUTUBE)) {
    return UrlSources.YOUTUBE;
  } else {
    throw new Error(`Unsupported integration`);
  }
};

export class ErrorLogger {
  errorChannel: TextChannel;

  constructor(channel: TextChannel) {
    this.errorChannel = channel;
    this.log("Skoipy online");
  }

  log(message: string) {
    this.errorChannel.send(message);
  }
}
