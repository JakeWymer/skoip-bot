import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  Message,
  TextChannel,
  GuildMember,
  VoiceChannel,
  Guild,
} from "discord.js";
import MusicPlayer from "./MusicPlayer.js";
import SpotifyGenerator from "./SpotifyGenerator.js";
import { getRandomPlaylist } from "./sheets.js";
import { TrackGenerator } from "./types.js";
import { setupSpotifyApi } from "./util.js";
import { EventEmitter} from "events";

const client = new Client();

const BOT_PREFIX = `>`;

const BotCommands = {
  PLAY: [`play`, `p`],
  SKIP: [`skoip`, `skip`, `s`],
  KICK: [`kick`, `k`],
  SHUFFLE: [`shuffle`],
  QUEUE_RANDOM: [`queue_random`, `qr`, `random`],
  CLEAR_QUEUE: [`clear`],
  STOP: [`stop`],
  SHOW_QUEUE: [`queue`, `q`],
  LEAVE: [`leave`],
};

const botServerMap: { [key: string]: MusicPlayer } = {};

setInterval(() => {
  const oneHour = 60000 * 60;
  const now = new Date();
  Object.values(botServerMap).forEach((player) => {
    if(now.getTime() - player.lastActivity.getTime() > oneHour) {
      player.leave();
    }
  })
}, 60000);

const matchCommand = (message: Message, command: string[]) => {
  const content = message.content.slice(1).split(` `);
  return command.includes(content[0]);
};

const isInServer = (guildId: string) => {
  return botServerMap[guildId];
};

const getPlayer = async (message: Message, guildId: string): Promise<any> => {
  if (isInServer(guildId)) {
    return botServerMap[guildId];
  }
  return await joinChannel(message);
};

const leaveServer = (guildId: string) => {
  delete botServerMap[guildId];
};

const joinChannel = async (message: Message) => {
  const sentBy = message.member as GuildMember;
  const textChannel = message.channel as TextChannel;
  const guild = message.guild as Guild;
  if (!guild) {
    return textChannel.send("No guild found.");
  }
  if (!sentBy) {
    return textChannel.send("Bot must join by member request.");
  }
  const voiceChannel = sentBy.voice.channel as VoiceChannel;
  if (!voiceChannel) {
    return textChannel.send("You need to be in a voice channel to play music.");
  }
  const voiceConnection = await voiceChannel.join();
  const em = new EventEmitter();
  em.on("leave", leaveServer)
  const player = new MusicPlayer(voiceChannel, textChannel, voiceConnection, em);
  botServerMap[guild.id] = player;
  return player;
};

const handleMessage = async (message: Message) => {
  if (message.content.length === 0 || message.content[0] !== BOT_PREFIX) return;
  const { guild } = message;
  if (!guild) {
    return message.channel.send("No guild found.");
  }
  let player = await getPlayer(message, guild.id);
  if (!player) {
    return;
  }
  if (matchCommand(message, BotCommands.PLAY)) {
    await handlePlayCommand(message, player);
  } else if (matchCommand(message, BotCommands.SHUFFLE)) {
    player.shuffle();
  } else if (matchCommand(message, BotCommands.SKIP)) {
    player.playNext(true);
  } else if (matchCommand(message, BotCommands.QUEUE_RANDOM)) {
    await handleQueueRandomCommand(message, player);
  } else if (matchCommand(message, BotCommands.CLEAR_QUEUE)) {
    player.clearQueue();
  } else if (matchCommand(message, BotCommands.STOP)) {
    player.stop();
  } else if (matchCommand(message, BotCommands.SHOW_QUEUE)) {
    await player.showQueue();
  } else if (matchCommand(message, BotCommands.LEAVE)) {
    await player.leave();
  }
};

const handlePlayCommand = async (message: Message, player: MusicPlayer) => {
  const url = message.content.split(` `)[1];
  let generator: TrackGenerator;
  if (!url.includes(`spotify`)) {
    return message.channel.send("Unsupported integration");
  }
  const spotifyApi = await setupSpotifyApi();
  generator = new SpotifyGenerator(url, spotifyApi);
  const tracks = await generator.generateTracks();
  await player.appendQueue(tracks);
};

const handleQueueRandomCommand = async (
  message: Message,
  player: MusicPlayer
) => {
  const shouldShuffle = message.content.includes("-s");
  let generator: TrackGenerator;
  const playlist = await getRandomPlaylist();
  if (!playlist.uri.includes(`spotify`)) {
    return message.channel.send("Unsupported integration");
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

client.on("message", handleMessage);

client.login(process.env.BOT_TOKEN || ``);
