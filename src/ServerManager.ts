import {
  DiscordGatewayAdapterCreator,
  joinVoiceChannel,
} from "@discordjs/voice";
import { Guild, GuildMember, TextChannel, VoiceChannel } from "discord.js";
import { EventEmitter } from "events";
import MusicPlayer from "./MusicPlayer.js";
import { getRandomElement } from "./util.js";

class ServerManager {
  playerGuildMap: { [key: string]: MusicPlayer } = {};

  constructor() {
    setInterval(() => {
      const oneHour = 60000 * 60;
      const now = new Date();
      Object.values(this.playerGuildMap).forEach((player) => {
        if (this.shouldLeaveChannel(player, now, oneHour)) {
          player.leave();
        }
      });
    }, 60000);
  }

  getOrCreatePlayer = async (
    user: GuildMember,
    textChannel: TextChannel,
    guild: Guild
  ): Promise<any> => {
    if (this.isInServer(guild.id)) {
      return this.playerGuildMap[guild.id];
    }
    return await this.joinChannelInteraction(user, textChannel, guild);
  };

  private isInServer = (guildId: string) => {
    return this.playerGuildMap[guildId];
  };

  private joinChannelInteraction = async (
    user: GuildMember,
    textChannel: TextChannel,
    guild: Guild
  ) => {
    const voiceChannel = user.voice.channel as VoiceChannel;
    textChannel.send(this.getJoinMessage(user));
    const voiceConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
    });
    const em = new EventEmitter();
    em.on("leave", this.leaveServer);
    const player = new MusicPlayer(
      voiceChannel,
      textChannel,
      voiceConnection,
      em
    );
    this.playerGuildMap[guild.id] = player;
    return player;
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

  private shouldLeaveChannel = (
    player: MusicPlayer,
    now: Date,
    maxIdleTime: number
  ) => {
    const numberOfVoiceMembers = player.voiceChannel.members.size;
    return (
      now.getTime() - player.lastActivity.getTime() > maxIdleTime ||
      numberOfVoiceMembers === 1
    );
  };

  private leaveServer = (guildId: string) => {
    delete this.playerGuildMap[guildId];
  };
}

export default ServerManager;
