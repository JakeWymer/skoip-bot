import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import commands from "../commands.js";

const applicationId = process.env.APPLICATION_ID;
const botToken = process.env.BOT_TOKEN;
const url = `https://discord.com/api/v8/applications/${applicationId}/commands`;
const guildURL = `https://discord.com/api/v8/applications/${applicationId}/guilds/596370362422395042/commands`;

await Promise.all(
  commands.map(async (command) => {
    console.log(command);
    const options = {
      method: "post",
      headers: { Authorization: `Bot ${botToken}` },
      data: command,
      url: guildURL,
    };
    await axios(options);
  })
);
const options = {
  method: "get",
  headers: { Authorization: `Bot ${botToken}` },
  url: guildURL,
};
const currentCommands = await axios(options);
console.log(currentCommands);
