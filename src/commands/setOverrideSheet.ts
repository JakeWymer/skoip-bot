import { TextChannel } from "discord.js";
import { getOrCreateServerConfig } from "../util.js";

const setOverrideSheetId = async (
  overrideSheetId: string,
  guildId: string,
  channel: TextChannel
) => {
  const serverConfig = await getOrCreateServerConfig(guildId);
  serverConfig.override_id = overrideSheetId;
  serverConfig.save();
  return channel.send(`Set override sheet id to: ${overrideSheetId}`);
};

export default setOverrideSheetId;
