import SkoipyQueue from "../SkoipyQueue.js";
import { generateSkoipyPlaylist } from "../util.js";

const handleAutoGenerateCommand = async (queue: SkoipyQueue) => {
  const playlistUri = await generateSkoipyPlaylist(
    queue.guild.id,
    queue.generatorId
  );
  queue.textChannel.send(`Queuing auto generated playlist`);
  await queue.addToQueue(playlistUri);
};

export default handleAutoGenerateCommand;
