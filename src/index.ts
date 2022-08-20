import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  TextChannel,
  GuildMember,
  Guild,
  Message,
  GatewayIntentBits,
  ChatInputCommandInteraction,
} from "discord.js";
import { Commands } from "./types.js";
import { ErrorLogger, generateSkoipyPlaylist, setSkoipyKey } from "./util.js";

import "./db/index.js";
import { REST } from "@discordjs/rest";
import { commands } from "./commands.js";
import handleQueueRandomCommand from "./commands/random.js";
import setSheetId from "./commands/setSheetId.js";
import setOverrideSheetId from "./commands/setOverrideSheet.js";
import ServerManager from "./ServerManager.js";
import SkoipyQueue from "./SkoipyQueue.js";
import { Routes } from "discord-api-types/rest/v9";

export let errorLogger: ErrorLogger;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const BOT_PREFIX = `>`;

const serverManager = new ServerManager();

const handleInteraction = async (interaction: ChatInputCommandInteraction) => {
  const channel = interaction.channel as TextChannel;
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice?.channel;
  const guild = interaction.guild;

  try {
    await interaction.deferReply();
    if (!guild || !channel || !member || !voiceChannel) {
      throw new Error(
        `Guild, Channel, Voice Channel, and Member are all required for command interactions`
      );
    }
    const { commandName, options } = interaction;
    const queue: SkoipyQueue = await serverManager.getOrCreateQueue(
      member,
      channel,
      guild
    );

    switch (commandName) {
      case Commands.QUEUE_RANDOM:
        const shouldShuffle = options.getBoolean(`shuffle`, false) || false;
        await handleQueueRandomCommand(queue, shouldShuffle);
        break;
      case Commands.SKIP:
        queue.handleSkip();
        break;
      case Commands.SHUFFLE:
        queue.shuffle();
        break;
      case Commands.CLEAR_QUEUE:
        queue.clear();
        queue.handleSkip();
        break;
      case Commands.SHOW_QUEUE:
        queue.showQueue();
        break;
      case Commands.LEAVE:
        serverManager.leaveServer(queue);
        break;
      case Commands.PLAY:
        await queue.addToQueue(options.getString(`url`, true));
        break;
      case Commands.PLAY_NEXT:
        await queue.addToQueue(options.getString(`url`, true), true);
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
        queue.isAutoQueue = options.getBoolean(`enabled`, true);
        queue.shuffleAutoQueue = options.getBoolean(`shuffle`, false) || false;
        channel.send(
          `Auto Queue ${queue.isAutoQueue ? `enabled` : `disabled`}`
        );
        if (!queue.tracks.length && queue.isAutoQueue) {
          await handleQueueRandomCommand(queue, queue.shuffleAutoQueue);
        }
        break;
      case Commands.SET_SKOIPY_KEY:
        const apiKey = options.getString(`skoipy_api_key`, true);
        await setSkoipyKey(apiKey, guild.id, channel);
        break;
      case Commands.GENERATE_AND_PLAY:
        const generatorId = options.getInteger(`generator_id`, true);
        const playlistUri = await generateSkoipyPlaylist(guild.id, generatorId);
        await queue.addToQueue(playlistUri);
        break;
      case Commands.AUTO_GENERATE:
        queue.isAutoQueue = options.getBoolean(`enabled`, true);
        queue.generatorId = options.getInteger(`generator_id`, true);
        channel.send(
          `Auto Queue ${queue.isAutoQueue ? `enabled` : `disabled`}`
        );
        if (!queue.tracks.length && queue.isAutoQueue) {
          const playlistUri = await generateSkoipyPlaylist(
            guild.id,
            queue.generatorId
          );
          queue.textChannel.send(`Queuing auto generated playlist`);
          await queue.addToQueue(playlistUri);
        }
        break;
      default:
        throw new Error(`Command not found`);
    }
    return interaction.editReply({ content: `Woohooo` });
  } catch (err: any) {
    console.error(err);
    errorLogger.log(JSON.stringify(err.message));
    return interaction.editReply({ content: `Something went wrong :(` });
  }
};

const handleBotMessage = async (message: Message) => {
  const channel = message.channel as TextChannel;
  const member = message.member as GuildMember;
  const guild = message.guild as Guild;
  const queue = (await serverManager.getOrCreateQueue(
    member,
    channel,
    guild
  )) as SkoipyQueue;
  const parsedMessage = message.content.substring(1);
  switch (parsedMessage) {
    case Commands.SKIP:
      queue.handleSkip();
      break;
    case Commands.CLEAR_QUEUE:
      queue.clear();
      queue.handleSkip();
      break;
    default:
      channel.send(`Bot command not supported`);
  }
};

client.once("ready", async () => {
  const CLIENT_ID = client?.user?.id as string;
  const TEST_GUILD_ID = process.env.TEST_GUILD_ID;

  const rest = new REST({ version: "9" }).setToken(process.env.BOT_TOKEN || ``);

  try {
    console.log("Started reloading application commands.");
    if (TEST_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, TEST_GUILD_ID),
        {
          body: commands,
        }
      );
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), {
        body: commands,
      });
    }
    console.log("Successfully reloaded application commands.");
  } catch (error) {
    console.error(error);
  }

  const ERROR_CHANNEL_ID = process.env.ERROR_CHANNEL_ID as string;
  const errorChannel = (await client.channels.fetch(
    ERROR_CHANNEL_ID
  )) as TextChannel;

  errorLogger = new ErrorLogger(errorChannel);
});

client.on(`messageCreate`, async (message) => {
  if (!message.author.bot || message.content[0] !== BOT_PREFIX) return;
  await handleBotMessage(message);
});

client.on(`interactionCreate`, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await handleInteraction(interaction);
});

client.login(process.env.BOT_TOKEN || ``);
