import { TextChannel } from "discord.js";
import MusicPlayer from "../MusicPlayer.js";
import { generateSkoipyPlaylist } from "../util.js";
import handlePlayCommand from "./play.js";

const handleAutoGenerateCommand = async (
  textChannel: TextChannel,
  player: MusicPlayer
) => {
  const playlistUri = await generateSkoipyPlaylist(
    textChannel.guild.id,
    player.generatorId
  );
  player.textChannel.send(`Queuing auto generated playlist`);
  await handlePlayCommand(playlistUri, player);
};

export default handleAutoGenerateCommand;
