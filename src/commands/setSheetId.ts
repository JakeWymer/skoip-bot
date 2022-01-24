import { TextChannel } from "discord.js";
import { getOrCreateServerConfig } from "../util.js";

const setSheetId = async (
  sheetsId: string,
  guildId: string,
  channel: TextChannel
) => {
  const serverConfig = await getOrCreateServerConfig(guildId);
  serverConfig.sheets_id = sheetsId;
  serverConfig.save();
  return channel.send(`Set sheets id to: ${sheetsId}`);
};

export default setSheetId;
