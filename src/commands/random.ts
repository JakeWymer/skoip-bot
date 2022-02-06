import { getRandomPlaylist } from "../sheets.js";
import { trackEvent } from "../tracking.js";
import SkoipyQueue from "../SkoipyQueue";

const handleQueueRandomCommand = async (
  queue: SkoipyQueue,
  shouldShuffle = false
) => {
  // Reset to 0 to make sure auto generate is turned off
  queue.generatorId = 0;
  const playlist = await getRandomPlaylist(queue.guild.id);
  let message = `Queuing ${playlist.name}`;
  if (playlist.artist) {
    message += ` by ${playlist.artist}`;
  }
  queue.textChannel.send(message);
  trackEvent(`Random Queued`, {
    name: playlist.name,
    artist: playlist.artist || `Unknown`,
    $distinct_id: queue.guild.id,
  });
  await queue.addToQueue(playlist.uri);
  if (shouldShuffle) {
    queue.mix();
  }
};

export default handleQueueRandomCommand;
