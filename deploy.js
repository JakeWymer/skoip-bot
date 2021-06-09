import dotenv from "dotenv";
dotenv.config();

import { NodeSSH } from "node-ssh";
import fs from "fs";

const ssh = new NodeSSH();

ssh
  .connect({
    host: process.env.HOST_IP,
    username: process.env.HOST_USER,
    privateKey: fs.readFileSync(process.env.HOST_PRIVATE_KEY_FILE_PATH, "utf8"),
  })
  .then(async () => {
    console.log("cd skoip-bot");
    await ssh.execCommand("cd skoip-bot", { cwd: "/root" });
    console.log("git pull");
    const gitResult = await ssh.execCommand("git pull", {
      cwd: "/root/skoip-bot",
    });
    console.log("STDOUT: " + gitResult.stdout);
    console.log("STDERR: " + gitResult.stderr);
    console.log("pm2 restart skoipy");
    const yarnResult = await ssh.execCommand("pm2 restart skoipy", {
      cwd: "/root/skoip-bot",
    });
    console.log("STDOUT: " + yarnResult.stdout);
    console.log("STDERR: " + yarnResult.stderr);
  });
