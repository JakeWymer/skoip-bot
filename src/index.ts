import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  Message,
  TextChannel,
  GuildMember,
  VoiceChannel,
  Guild,
  WSEventType,
} from "discord.js";
import MusicPlayer from "./MusicPlayer.js";
import SpotifyGenerator from "./SpotifyGenerator.js";
import { getRandomPlaylist } from "./sheets.js";
import { TrackGenerator } from "./types.js";
import { getRandomElement, setupSpotifyApi } from "./util.js";
import { EventEmitter } from "events";
import Server from "./db/models/Server.js";

import "./db/index.js";
import axios from "axios";

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
  SET_SHEET: [`set_sheet_id`, `set_sheet`],
};

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

const matchCommand = (message: Message, command: string[]) => {
  const content = message.content.slice(1).split(` `);
  return command.includes(content[0]);
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
  botServerMap[guild.id] = player;
  return player;
};

// const handleMessage = async (message: Message) => {
//   if (message.content.length === 0 || message.content[0] !== BOT_PREFIX) return;
//   const { guild } = message;
//   if (!guild) {
//     return message.channel.send("No guild found.");
//   }
//   let player = await getPlayer(message, guild.id);
//   if (!player) {
//     return;
//   }

// const textChannel = message.channel as TextChannel;

//   if (matchCommand(message, BotCommands.PLAY)) {
//     await handlePlayCommand(message, player);
//   } else if (matchCommand(message, BotCommands.SHUFFLE)) {
//     player.shuffle();
//   } else if (matchCommand(message, BotCommands.SKIP)) {
//     player.playNext(true);
//   } else if (matchCommand(message, BotCommands.QUEUE_RANDOM)) {
//     await handleQueueRandomCommand(textChannel, player);
//   } else if (matchCommand(message, BotCommands.CLEAR_QUEUE)) {
//     player.clearQueue();
//   } else if (matchCommand(message, BotCommands.STOP)) {
//     player.stop();
//   } else if (matchCommand(message, BotCommands.SHOW_QUEUE)) {
//     await player.showQueue();
//   } else if (matchCommand(message, BotCommands.LEAVE)) {
//     await player.leave();
//   } else if (matchCommand(message, BotCommands.SET_SHEET)) {
//     const sheetsId = message.content.split(` `)[1];
//     let serverConfig = (await Server.findOne({
//       where: {
//         server_id: message.guild?.id,
//       },
//     })) as any;
//     if (!serverConfig) {
//       serverConfig = await Server.create({
//         server_id: message.guild?.id,
//       });
//     }
//     serverConfig.sheets_id = sheetsId;
//     serverConfig.save();
//     return message.channel.send(`Set sheets id to: ${sheetsId}`);
//   }
// };

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
  console.log(interaction);
  const guild = await client.guilds.fetch(interaction.guild_id);
  const channel = (await client.channels.fetch(
    interaction.channel_id
  )) as TextChannel;
  const user = await guild.members.fetch(interaction.member.user.id);
  const player = await getPlayer(user, channel, guild.id);
  switch (interaction.data.name) {
    case "random":
      await handleQueueRandomCommand(channel, player);
      break;
    case "skip":
      player.playNext(true);
      break;
    default:
      channel.send("Command not found");
  }
  await axios.post(responseURL, {
    type: 4,
    data: { content: "Woohooo" },
  });
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

// client.on("message", handleMessage);
const interactionEvent = "INTERACTION_CREATE" as WSEventType;
client.ws.on(interactionEvent, handleInteraction);
client.login(process.env.BOT_TOKEN || ``);
