import {
  Collection,
  Guild,
  GuildMember,
  TextChannel,
  VoiceChannel,
} from "discord.js";
import { getRandomElement } from "./util.js";
import { Player } from "@discordx/music";
import SkoipyQueue from "./SkoipyQueue.js";

class ServerManager extends Player {
  queues: Collection<string, SkoipyQueue>;
  constructor() {
    super();

    this.queues = new Collection();

    setInterval(() => {
      this.queues.forEach((queue) => {
        if (this.shouldLeaveChannel(queue)) {
          this.leaveServer(queue);
        }
      });
    }, 60000);
  }

  getOrCreateQueue = async (
    user: GuildMember,
    textChannel: TextChannel,
    guild: Guild
  ): Promise<SkoipyQueue> => {
    let queue = this.queues.get(guild.id);
    if (!queue) {
      queue = await this.joinChannelInteraction(user, textChannel, guild);
    }
    return queue;
  };

  private joinChannelInteraction = async (
    user: GuildMember,
    textChannel: TextChannel,
    guild: Guild
  ) => {
    const voiceChannel = user.voice.channel as VoiceChannel;
    const queue = this.queue(
      guild,
      () => new SkoipyQueue(this, guild, voiceChannel, textChannel)
    );
    await queue.join(voiceChannel);
    textChannel.send(this.getJoinMessage(user));
    return queue;
  };

  private getJoinMessage = (member: GuildMember) => {
    const userName = member?.displayName;
    const serverJoinMessages = [
      `Heyooooo, ${userName}!`,
      `Howdy-ho, ${userName}!`,
      "Skoip Skoip!",
      `Well hiiii, ${userName}!`,
      `Hulloooo, ${userName}!`,
    ];
    return getRandomElement(serverJoinMessages);
  };

  private shouldLeaveChannel = (queue: SkoipyQueue) => {
    const numberOfVoiceMembers = queue.voiceChannel.members.size;
    return numberOfVoiceMembers === 1;
  };

  leaveServer = (queue: SkoipyQueue) => {
    queue.shouldLeave = true;
    queue.leave();
  };
}

export default ServerManager;
