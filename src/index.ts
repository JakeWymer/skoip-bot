import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  TextChannel,
  GuildMember,
  VoiceChannel,
  Intents,
  CommandInteraction,
  Guild,
  Message,
} from "discord.js";
import {
  DiscordGatewayAdapterCreator,
  joinVoiceChannel,
} from "@discordjs/voice";
import MusicPlayer from "./MusicPlayer.js";
import SpotifyGenerator from "./SpotifyGenerator.js";
import { getRandomPlaylist } from "./sheets.js";
import { TrackGenerator, Commands } from "./types.js";
import {
  ErrorLogger,
  generateSkoipyPlaylist,
  getOrCreateServerConfig,
  getRandomElement,
  setSkoipyKey,
  setupSpotifyApi,
} from "./util.js";
import { EventEmitter } from "events";

import "./db/index.js";
import YoutubeGenerator from "./YoutubeGenerator.js";
import { trackEvent } from "./tracking.js";
import { REST } from "@discordjs/rest";
import { commands } from "./commands.js";

export let errorLogger: ErrorLogger;
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

const BOT_PREFIX = `>`;

const botServerMap: { [key: string]: MusicPlayer } = {};

setInterval(() => {
  const oneHour = 60000 * 60;
  const now = new Date();
  Object.values(botServerMap).forEach((player) => {
    if (shouldLeaveChannel(player, now, oneHour)) {
      player.leave();
    }
  });
}, 60000);

const shouldLeaveChannel = (
  player: MusicPlayer,
  now: Date,
  maxIdleTime: number
) => {
  const numberOfVoiceMembers = player.voiceChannel.members.size;
  return (
    now.getTime() - player.lastActivity.getTime() > maxIdleTime ||
    numberOfVoiceMembers === 1
  );
};

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
  guild: Guild
): Promise<any> => {
  if (isInServer(guild.id)) {
    return botServerMap[guild.id];
  }
  return await joinChannelInteraction(sentBy, textChannel, guild);
};

const leaveServer = (guildId: string) => {
  delete botServerMap[guildId];
};

const setSheetId = async (
  sheetsId: string,
  guildId: string,
  channel: TextChannel
) => {
  const serverConfig = await getOrCreateServerConfig(guildId);
  serverConfig.sheets_id = sheetsId;
  serverConfig.save();
  return channel.send(`Set sheets id to: ${sheetsId}`);
};

const setOverrideSheetId = async (
  overrideSheetId: string,
  guildId: string,
  channel: TextChannel
) => {
  const serverConfig = await getOrCreateServerConfig(guildId);
  serverConfig.override_id = overrideSheetId;
  serverConfig.save();
  return channel.send(`Set override sheet id to: ${overrideSheetId}`);
};

const joinChannelInteraction = async (
  sentBy: GuildMember,
  textChannel: TextChannel,
  guild: Guild
) => {
  const voiceChannel = sentBy.voice.channel as VoiceChannel;
  textChannel.send(getJoinMessage(sentBy));
  const voiceConnection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
  });
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

const handleInteraction = async (interaction: CommandInteraction) => {
  const channel = interaction.channel as TextChannel;
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice?.channel;
  const guild = interaction.guild;

  try {
    if (!guild || !channel || !member || !voiceChannel) {
      throw new Error(
        `Guild, Channel, Voice Channel, and Member are all required for command interactions`
      );
    }
    await interaction.deferReply();
    const { commandName, options } = interaction;
    const player = await getPlayer(member, channel, guild);
    switch (commandName) {
      case Commands.QUEUE_RANDOM:
        const shouldShuffle = options.getBoolean(`shuffle`, false) || false;
        await handleQueueRandomCommand(channel, player, shouldShuffle);
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
          options.getString(`url`, true),
          channel,
          player
        );
        break;
      case Commands.SET_SHEET:
        await setSheetId(options.getString(`id`, true), guild.id, channel);
        break;
      case Commands.SET_OVERRIDE_SHEET:
        await setOverrideSheetId(
          options.getString(`override_sheet_id`, true),
          guild.id,
          channel
        );
        break;
      case Commands.AUTO_QUEUE:
        player.isAutoQueue = options.getBoolean(`enabled`, true);
        player.autoQueueShuffle = options.getBoolean(`shuffle`, false) || false;
        channel.send(
          `Auto Queue ${player.isAutoQueue ? `enabled` : `disabled`}`
        );
        if (!player.queue.length && player.isAutoQueue) {
          await handleQueueRandomCommand(
            channel,
            player,
            player.autoQueueShuffle
          );
        }
        break;
      case Commands.SET_SKOIPY_KEY:
        const apiKey = options.getString(`skoipy_api_key`, true);
        await setSkoipyKey(apiKey, guild.id, channel);
        break;
      case Commands.GENERATE_AND_PLAY:
        const generatorId = options.getInteger(`generator_id`, true);
        const playlistUri = await generateSkoipyPlaylist(guild.id, generatorId);
        await handlePlayCommand(playlistUri, channel, player);
        break;
      case Commands.AUTO_GENERATE:
        player.isAutoQueue = options.getBoolean(`enabled`, true);
        player.generatorId = options.getInteger(`generator_id`, true);
        channel.send(
          `Auto Queue ${player.isAutoQueue ? `enabled` : `disabled`}`
        );
        if (!player.queue.length && player.isAutoQueue) {
          await handleAutoGenerateCommand(channel, player);
        }
        break;
      default:
        throw new Error(`Command not found`);
    }
    return interaction.editReply({ content: `Woohooo` });
  } catch (err) {
    console.log(err);
    return interaction.editReply({ content: `Something went wrong :(` });
  }
};

const handleBotMessage = async (message: Message) => {
  const channel = message.channel as TextChannel;
  const member = message.member as GuildMember;
  const guild = message.guild as Guild;
  const player = (await getPlayer(member, channel, guild)) as MusicPlayer;
  const parsedMessage = message.content.substring(1);
  switch (parsedMessage) {
    case Commands.SKIP:
      player.playNext(true);
      break;
    default:
      channel.send(`Bot command not supported`);
  }
};

const handlePlayCommand = async (
  url: string,
  channel: TextChannel,
  player: MusicPlayer
) => {
  let generator: TrackGenerator;
  if (url.includes(`spotify`)) {
    const spotifyApi = await setupSpotifyApi();
    generator = new SpotifyGenerator(url, spotifyApi);
  } else if (url.includes("youtube")) {
    generator = new YoutubeGenerator(url);
  } else {
    return channel.send("Unsupported integration");
  }
  const tracks = await generator.generateTracks();
  await player.appendQueue(tracks);
};

export const handleQueueRandomCommand = async (
  textChannel: TextChannel,
  player: MusicPlayer,
  shouldShuffle = false
) => {
  let generator: TrackGenerator;
  // Reset to 0 to make sure auto generate is turned off
  player.generatorId = 0;
  const playlist = await getRandomPlaylist(textChannel.guild.id);
  if (!playlist) {
    return textChannel.send("Could not fetch random playlist");
  }
  if (!playlist.uri.includes(`spotify`)) {
    return textChannel.send("Unsupported integration");
  }
  let message = `Queuing ${playlist.name}`;
  if (playlist.artist) {
    message += ` by ${playlist.artist}`;
  }
  player.textChannel.send(message);
  trackEvent(`Random Queued`, {
    name: playlist.name,
    artist: playlist.artist || `Unknown`,
  });
  const spotifyApi = await setupSpotifyApi();
  generator = new SpotifyGenerator(playlist.uri, spotifyApi);
  const tracks = await generator.generateTracks();
  await player.appendQueue(tracks);
  if (shouldShuffle) {
    player.shuffle();
  }
};

export const handleAutoGenerateCommand = async (
  textChannel: TextChannel,
  player: MusicPlayer
) => {
  const playlistUri = await generateSkoipyPlaylist(
    textChannel.guild.id,
    player.generatorId
  );
  if (!playlistUri.includes(`spotify`)) {
    return textChannel.send("Unsupported integration");
  }
  player.textChannel.send(`Queuing auto generated playlist`);
  const spotifyApi = await setupSpotifyApi();
  const trackGenerator = new SpotifyGenerator(playlistUri, spotifyApi);
  const tracks = await trackGenerator.generateTracks();
  await player.appendQueue(tracks);
};

client.on("ready", async () => {
  console.log("Skoipy online");

  const rest = new REST({ version: "9" }).setToken(process.env.BOT_TOKEN || ``);
  try {
    console.log("Started refreshing application (/) commands.");
    const slashCommandsUrl = process.env.SLASH_COMMANDS_URL || ``;
    await rest.put(`/${slashCommandsUrl}`, { body: commands });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
});

client.on(`messageCreate`, async (message) => {
  if (!message.author.bot || message.content[0] !== BOT_PREFIX) return;
  await handleBotMessage(message);
});

client.on(`interactionCreate`, async (interaction) => {
  if (!interaction.isCommand()) return;
  await handleInteraction(interaction);
});

client.login(process.env.BOT_TOKEN || ``);
