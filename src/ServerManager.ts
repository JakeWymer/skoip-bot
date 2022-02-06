import { Guild, GuildMember, TextChannel, VoiceChannel } from "discord.js";
import { getRandomElement } from "./util.js";
import { Player } from "@discordx/music";
import SkoipyQueue from "./SkoipyQueue.js";

class ServerManager {
  queueGuildMap: { [key: string]: SkoipyQueue } = {};

  constructor() {
    setInterval(() => {
      Object.values(this.queueGuildMap).forEach((queue) => {
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
    if (this.isInServer(guild.id)) {
      return this.queueGuildMap[guild.id];
    }
    return await this.joinChannelInteraction(user, textChannel, guild);
  };

  private isInServer = (guildId: string) => {
    return this.queueGuildMap[guildId];
  };

  private joinChannelInteraction = async (
    user: GuildMember,
    textChannel: TextChannel,
    guild: Guild
  ) => {
    const player = new Player();
    const voiceChannel = user.voice.channel as VoiceChannel;
    const queue = player.queue(
      guild,
      () => new SkoipyQueue(player, guild, voiceChannel, textChannel)
    );
    await queue.join(voiceChannel);
    textChannel.send(this.getJoinMessage(user));
    this.queueGuildMap[guild.id] = queue;
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
    return !numberOfVoiceMembers;
  };

  leaveServer = (queue: SkoipyQueue) => {
    delete this.queueGuildMap[queue.guild.id];
    queue.leave();
  };
}

export default ServerManager;
