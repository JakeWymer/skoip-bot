import MusicPlayer from "../MusicPlayer";
import { TextChannel } from "discord.js";
import { getRandomPlaylist } from "../sheets.js";
import { trackEvent } from "../tracking.js";
import { getTrackGenerator } from "../util.js";

const handleQueueRandomCommand = async (
  textChannel: TextChannel,
  player: MusicPlayer,
  shouldShuffle = false
) => {
  // Reset to 0 to make sure auto generate is turned off
  player.generatorId = 0;
  const playlist = await getRandomPlaylist(textChannel.guild.id);
  let message = `Queuing ${playlist.name}`;
  if (playlist.artist) {
    message += ` by ${playlist.artist}`;
  }
  player.textChannel.send(message);
  trackEvent(`Random Queued`, {
    name: playlist.name,
    artist: playlist.artist || `Unknown`,
    "Discord Server Id": textChannel.guild.id,
  });
  const trackGenerator = await getTrackGenerator(playlist.uri);
  const tracks = await trackGenerator.generateTracks();
  await player.appendQueue(tracks, shouldShuffle);
};

export default handleQueueRandomCommand;
