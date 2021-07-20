import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import chalk from "chalk";
import commands from "../commands.mjs";

const botToken = process.env.BOT_TOKEN;
const url = process.env.SLASH_COMMANDS_URL;

const options = {
  method: "put",
  headers: {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json",
  },
  data: JSON.stringify(commands),
  url,
};

(async () => {
  try {
    await axios(options);
    console.log(chalk.green("Slash commands successfully updated"));
  } catch (error) {
    console.log(error.toJSON());
    console.log(chalk.red("Slash commands failed to update"));
  }
})();
