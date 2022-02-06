import { ApplicationCommandOptionTypes } from "discord.js/typings/enums";

const random = {
  name: "random",
  description: "Queues a random playlist from Google sheets",
  options: [
    {
      type: ApplicationCommandOptionTypes.BOOLEAN,
      name: "shuffle",
      description: "Shuffle the playlist after queuing",
      required: false,
    },
  ],
};
const skip = {
  name: "skip",
  description: "Skips the current song",
};
const play = {
  name: "play",
  description: "Queue songs from specified URL",
  options: [
    {
      type: ApplicationCommandOptionTypes.STRING,
      name: "url",
      description: "Song or album URL",
      required: true,
    },
  ],
};
const playNext = {
  name: "play_next",
  description: "Add songs from specified URL to the front of the queue.",
  options: [
    {
      type: ApplicationCommandOptionTypes.STRING,
      name: "url",
      description: "Song or album URL",
      required: true,
    },
  ],
};
const shuffle = {
  name: "shuffle",
  description: "Shuffles the current queue",
};
const clear = {
  name: "clear",
  description: "Clears the current queue",
};
const showQueue = {
  name: "queue",
  description: "Shows the current queue",
};
const leave = {
  name: "leave",
  description: "Makes Skoipy leave the channel",
};
const setSheet = {
  name: "set_sheet_id",
  description: "Sets the Google sheet used by the Random command",
  options: [
    {
      type: ApplicationCommandOptionTypes.STRING,
      name: "id",
      description: "ID of the Google sheet being used",
      required: true,
    },
  ],
};
const autoQueue = {
  name: "auto_queue",
  description:
    "When turned on, Skoipy will automatically queue up a playlist from your Google Sheet.",
  options: [
    {
      type: ApplicationCommandOptionTypes.BOOLEAN,
      name: "enabled",
      description:
        "Set to True if you would like to enable auto queue for this session.",
      required: true,
    },
    {
      type: ApplicationCommandOptionTypes.BOOLEAN,
      name: "shuffle",
      description:
        "Set to True if you would like to shuffle every playlist auto queued for this session.",
      required: false,
    },
  ],
};
const setSkoipyKey = {
  name: "set_skoipy_api_key",
  description: "Sets the API key used to generate Skoipy playlists",
  options: [
    {
      type: ApplicationCommandOptionTypes.STRING,
      name: "skoipy_api_key",
      description: "Your Skoipy API key",
      required: true,
    },
  ],
};
const generateAndPlay = {
  name: "generate_and_play",
  description:
    "Generates a new Skoipy playlist and adds the songs to the queue",
  options: [
    {
      type: ApplicationCommandOptionTypes.INTEGER,
      name: "generator_id",
      description:
        "ID of the generator you would like to use for playlist generation",
      required: true,
    },
  ],
};
const autoGenerate = {
  name: "auto_generate",
  description: "Auto queues Skoipy generated playlists",
  options: [
    {
      type: ApplicationCommandOptionTypes.BOOLEAN,
      name: "enabled",
      description:
        "Set to True if you would like to enable auto queue for this session.",
      required: true,
    },
    {
      type: ApplicationCommandOptionTypes.INTEGER,
      name: "generator_id",
      description:
        "ID of the generator you would like to use for playlist generation",
      required: true,
    },
  ],
};
const setOverrideId = {
  name: "set_override_sheet",
  description: "Sets the Google Sheet id to check for any URL overrides",
  options: [
    {
      type: ApplicationCommandOptionTypes.STRING,
      name: "override_sheet_id",
      description: "Your override Google Sheet id",
      required: true,
    },
  ],
};

export const commands = [
  random,
  skip,
  play,
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
