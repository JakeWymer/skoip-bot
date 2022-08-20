import { SlashCommandBuilder } from "discord.js";

const random = new SlashCommandBuilder()
  .setName(`random`)
  .setDescription(`Queues a random playlist from Google sheets`)
  .addBooleanOption((option) =>
    option
      .setName(`shuffle`)
      .setDescription(`Shuffle the playlist after queuing`)
      .setRequired(false)
  );

const skip = new SlashCommandBuilder()
  .setName(`skip`)
  .setDescription(`Skips the current song`);

const play = new SlashCommandBuilder()
  .setName(`play`)
  .setDescription(`Queue songs from specified URL`)
  .addStringOption((option) =>
    option.setName(`url`).setDescription(`Song or album URL`).setRequired(true)
  );

const playNext = new SlashCommandBuilder()
  .setName(`play_next`)
  .setDescription(`Add songs from specified URL to the front of the queue.`)
  .addStringOption((option) =>
    option.setName(`url`).setDescription(`Song or album URL`).setRequired(true)
  );

const shuffle = new SlashCommandBuilder()
  .setName(`shuffle`)
  .setDescription(`Shuffles the current queue`);

const clear = new SlashCommandBuilder()
  .setName(`clear`)
  .setDescription(`Clears the current queue`);

const showQueue = new SlashCommandBuilder()
  .setName(`queue`)
  .setDescription(`Shows the current queue`);

const leave = new SlashCommandBuilder()
  .setName(`leave`)
  .setDescription(`Makes Skoipy leave the channel`);

const setSheet = new SlashCommandBuilder()
  .setName(`set_sheet_id`)
  .setDescription(`Sets the Google sheet used by the Random command`)
  .addStringOption((option) =>
    option
      .setName(`id`)
      .setDescription(`ID of the Google sheet being used`)
      .setRequired(true)
  );

const autoQueue = new SlashCommandBuilder()
  .setName(`auto_queue`)
  .setDescription(
    `When turned on, Skoipy will automatically queue up a playlist from your Google Sheet.`
  )
  .addBooleanOption((option) =>
    option
      .setName(`enabled`)
      .setDescription(
        `Set to True if you would like to enable auto queue for this session.`
      )
      .setRequired(true)
  )
  .addBooleanOption((option) =>
    option
      .setName(`shuffle`)
      .setDescription(
        `Set to True if you would like to shuffle every playlist auto queued for this session.`
      )
      .setRequired(false)
  );

const setSkoipyKey = new SlashCommandBuilder()
  .setName(`set_skoipy_api_key`)
  .setDescription(`Sets the API key used to generate Skoipy playlists`)
  .addStringOption((option) =>
    option
      .setName(`skoipy_api_key`)
      .setDescription(`Your Skoipy API key`)
      .setRequired(true)
  );

const generateAndPlay = new SlashCommandBuilder()
  .setName(`generate_and_play`)
  .setDescription(
    `Generates a new Skoipy playlist and adds the songs to the queue`
  )
  .addBooleanOption((option) =>
    option
      .setName(`generator_id`)
      .setDescription(
        `ID of the generator you would like to use for playlist generation`
      )
      .setRequired(true)
  );

const autoGenerate = new SlashCommandBuilder()
  .setName(`auto_generate`)
  .setDescription(`Auto queues Skoipy generated playlists`)
  .addBooleanOption((option) =>
    option
      .setName(`enabled`)
      .setDescription(
        `Set to True if you would like to enable auto queue for this session.`
      )
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName(`generator_id`)
      .setDescription(
        `ID of the generator you would like to use for playlist generation`
      )
      .setRequired(true)
  );

const setOverrideId = new SlashCommandBuilder()
  .setName(`set_override_sheet`)
  .setDescription(`Sets the Google Sheet id to check for any URL overrides`)
  .addStringOption((option) =>
    option
      .setName(`override_sheet_id`)
      .setDescription(`Your override Google Sheet id`)
      .setRequired(true)
  );

export const commands = [
  random,
  skip,
  play,
  playNext,
  shuffle,
  clear,
  showQueue,
  leave,
  setSheet,
  autoQueue,
  setSkoipyKey,
  generateAndPlay,
  autoGenerate,
  setOverrideId,
];
