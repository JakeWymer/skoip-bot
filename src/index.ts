import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  TextChannel,
  GuildMember,
  Intents,
  CommandInteraction,
  Guild,
  Message,
} from "discord.js";
import MusicPlayer from "./MusicPlayer.js";
import { Commands } from "./types.js";
import { ErrorLogger, generateSkoipyPlaylist, setSkoipyKey } from "./util.js";

import "./db/index.js";
import { REST } from "@discordjs/rest";
import { commands } from "./commands.js";
import handleQueueRandomCommand from "./commands/random.js";
import handlePlayCommand from "./commands/play.js";
import setSheetId from "./commands/setSheetId.js";
import setOverrideSheetId from "./commands/setOverrideSheet.js";
import ServerManager from "./ServerManager.js";

export let errorLogger: ErrorLogger;
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

const BOT_PREFIX = `>`;

const serverManager = new ServerManager();

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
    const player = await serverManager.getOrCreatePlayer(
      member,
      channel,
      guild
    );

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
        await handlePlayCommand(options.getString(`url`, true), player);
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
        await handlePlayCommand(playlistUri, player);
        break;
      case Commands.AUTO_GENERATE:
        player.isAutoQueue = options.getBoolean(`enabled`, true);
        player.generatorId = options.getInteger(`generator_id`, true);
        channel.send(
          `Auto Queue ${player.isAutoQueue ? `enabled` : `disabled`}`
        );
        if (!player.queue.length && player.isAutoQueue) {
          const playlistUri = await generateSkoipyPlaylist(
            guild.id,
            player.generatorId
          );
          player.textChannel.send(`Queuing auto generated playlist`);
          await handlePlayCommand(playlistUri, player);
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
  const player = (await serverManager.getOrCreatePlayer(
    member,
    channel,
    guild
  )) as MusicPlayer;
  const parsedMessage = message.content.substring(1);
  switch (parsedMessage) {
    case Commands.SKIP:
      player.playNext(true);
      break;
    default:
      channel.send(`Bot command not supported`);
  }
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
