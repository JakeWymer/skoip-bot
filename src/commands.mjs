const random = {
  name: "random",
  description: "Queues a random playlist from Google sheets",
  options: [
    {
      type: 5,
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
      type: 3,
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
      type: 3,
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
      type: 5,
      name: "enabled",
      description:
        "Set to True if you would like to enable auto queue for this session.",
      required: true,
    },
    {
      type: 5,
      name: "shuffle",
      description:
        "Set to True if you would like to shuffle every playlist auto queued for this session.",
      required: false,
    },
  ],
};

const commands = [
  random,
  skip,
  play,
  shuffle,
  clear,
  showQueue,
  leave,
  setSheet,
  autoQueue,
];
export default commands;
