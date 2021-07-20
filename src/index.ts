import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  TextChannel,
  GuildMember,
  VoiceChannel,
  WSEventType,
} from "discord.js";
import MusicPlayer from "./MusicPlayer.js";
import SpotifyGenerator from "./SpotifyGenerator.js";
import { getRandomPlaylist } from "./sheets.js";
import { TrackGenerator, Commands } from "./types.js";
import { getRandomElement, setupSpotifyApi } from "./util.js";
import { EventEmitter } from "events";
import Server from "./db/models/Server.js";

import "./db/index.js";
import axios from "axios";

const client = new Client();

const botServerMap: { [key: string]: MusicPlayer } = {};

setInterval(() => {
  const oneHour = 60000 * 60;
  const now = new Date();
  Object.values(botServerMap).forEach((player) => {
    if (now.getTime() - player.lastActivity.getTime() > oneHour) {
      player.leave();
    }
  });
}, 60000);

const getJoinMessage = (member: GuildMember) => {
  const userName = member?.displayName;
  const serverJoinMessages = [
    `Heyooooo, ${userName}!`,
    `Howdy-ho, ${userName}!`,
    "Skoip Skoip!",
    `Well hiiii, ${userName}!`,
    `Hulloooo, ${userName}!`,
  ];
  const randomMessage = getRandomElement(serverJoinMessages);
  return randomMessage;
};

const isInServer = (guildId: string) => {
  return botServerMap[guildId];
};

const getPlayer = async (
  sentBy: GuildMember,
  textChannel: TextChannel,
  guildId: string
): Promise<any> => {
  if (isInServer(guildId)) {
    return botServerMap[guildId];
  }
  return await joinChannelInteraction(sentBy, textChannel, guildId);
};

const leaveServer = (guildId: string) => {
  delete botServerMap[guildId];
};

const setSheetId = async (
  sheetsId: string,
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
  serverConfig.sheets_id = sheetsId;
  serverConfig.save();
  return channel.send(`Set sheets id to: ${sheetsId}`);
};

const joinChannelInteraction = async (
  sentBy: GuildMember,
  textChannel: TextChannel,
  guildId: string
) => {
  const voiceChannel = sentBy.voice.channel as VoiceChannel;
  if (!voiceChannel) {
    return textChannel.send("You need to be in a voice channel to play music.");
  }
  textChannel.send(getJoinMessage(sentBy));
  const voiceConnection = await voiceChannel.join();
  const em = new EventEmitter();
  em.on("leave", leaveServer);
  const player = new MusicPlayer(
    voiceChannel,
    textChannel,
    voiceConnection,
    em
  );
  botServerMap[guildId] = player;
  return player;
};

const handleInteraction = async (interaction: any) => {
  const responseURL = `https://discord.com/api/v8/interactions/${interaction.id}/${interaction.token}/callback`;
  const guild = await client.guilds.fetch(interaction.guild_id);
  const channel = (await client.channels.fetch(
    interaction.channel_id
  )) as TextChannel;
  const user = await guild.members.fetch(interaction.member.user.id);
  const player = await getPlayer(user, channel, guild.id);
  switch (interaction.data.name) {
    case Commands.QUEUE_RANDOM:
      await handleQueueRandomCommand(channel, player);
      break;
    case Commands.SKIP:
      player.playNext(true);
      break;
    case Commands.SHUFFLE:
      player.shuffle();
      break;
    case Commands.CLEAR_QUEUE:
      player.clearQueue();
      break;
    case Commands.SHOW_QUEUE:
      await player.showQueue();
      break;
    case Commands.LEAVE:
      await player.leave();
      break;
    case Commands.PLAY:
      await handlePlayCommand(
        interaction.data.options[0].value,
        channel,
        player
      );
      break;
    case Commands.SET_SHEET:
      await setSheetId(interaction.data.options[0].value, guild.id, channel);
      break;
    default:
      channel.send("Command not found");
  }
  await axios.post(responseURL, {
    type: 4,
    data: { content: "Woohooo" },
  });
};

const handlePlayCommand = async (
  url: string,
  channel: TextChannel,
  player: MusicPlayer
) => {
  let generator: TrackGenerator;
  if (!url.includes(`spotify`)) {
    return channel.send("Unsupported integration");
  }
  const spotifyApi = await setupSpotifyApi();
  generator = new SpotifyGenerator(url, spotifyApi);
  const tracks = await generator.generateTracks();
  await player.appendQueue(tracks);
};

const handleQueueRandomCommand = async (
  textChannel: TextChannel,
  player: MusicPlayer,
  shouldShuffle = false
) => {
  let generator: TrackGenerator;
  const playlist = await getRandomPlaylist(textChannel.guild.id);
  if (!playlist) {
    return textChannel.send("Could not fetch random playlist");
  }
  if (!playlist.uri.includes(`spotify`)) {
    return textChannel.send("Unsupported integration");
  }
  player.textChannel.send(`Queuing ${playlist.name}`);
  const spotifyApi = await setupSpotifyApi();
  generator = new SpotifyGenerator(playlist.uri, spotifyApi);
  const tracks = await generator.generateTracks();
  await player.appendQueue(tracks);
  if (shouldShuffle) {
    player.shuffle();
  }
};

client.on("ready", () => {
  console.log("Skoipy online");
});

const interactionEvent = "INTERACTION_CREATE" as WSEventType;
client.ws.on(interactionEvent, handleInteraction);
client.login(process.env.BOT_TOKEN || ``);
