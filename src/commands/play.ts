import MusicPlayer from "../MusicPlayer.js";
import { getTrackGenerator } from "../util.js";

const handlePlayCommand = async (url: string, player: MusicPlayer) => {
  const generator = await getTrackGenerator(url);
  const tracks = await generator.generateTracks();
  await player.appendQueue(tracks);
};

export default handlePlayCommand;
