import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import commands from "../commands.mjs";

const applicationId = process.env.APPLICATION_ID;
const botToken = process.env.BOT_TOKEN;
const url = `https://discord.com/api/v8/applications/${applicationId}/commands`;
const guildURL = `https://discord.com/api/v8/applications/${applicationId}/guilds/596370362422395042/commands`;

const options = {
  method: "put",
  headers: {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json",
  },
  data: JSON.stringify(commands),
  url: guildURL,
};
try {
  await axios(options);
} catch (error) {
  console.log(error.toJSON());
}
