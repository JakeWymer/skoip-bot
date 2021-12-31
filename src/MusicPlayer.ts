import {
  TextChannel,
  VoiceConnection,
  MessageEmbed,
  EmbedFieldData,
  VoiceChannel,
} from "discord.js";
import ytdl from "ytdl-core";
import SpotifyToYoutube from "spotify-to-youtube";
import { Track } from "./types.js";
import { getRandomElement, setupSpotifyApi } from "./util.js";
import { EventEmitter } from "events";
import {
  errorLogger,
  handleAutoGenerateCommand,
  handleQueueRandomCommand,
} from "./index.js";

const serverLeaveMessages = [
  "See ya next time..! ;)",
  "Seeya!",
  "Goodbye!",
  "Leaving...",
  "Getting outta there!",
];

class MusicPlayer {
  voiceConnection: VoiceConnection;
  queue: Track[];
  isPlaying: boolean;
  currentQueueIndex: number;
  textChannel: TextChannel;
  dispatcher: any;
  voiceChannel: VoiceChannel;
  em: EventEmitter;
  lastActivity: Date;
  isAutoQueue: boolean;
  autoQueueShuffle: boolean;
  generatorId: number;

  constructor(
    voiceChannel: VoiceChannel,
    textChannel: TextChannel,
    voiceConnection: VoiceConnection,
    em: EventEmitter
  ) {
    this.voiceConnection = voiceConnection;
    this.textChannel = textChannel;
    this.queue = [];
    this.currentQueueIndex = 0;
    this.isPlaying = false;
    this.dispatcher = null;
    this.voiceChannel = voiceChannel;
    this.em = em;
    this.lastActivity = new Date();
    this.isAutoQueue = false;
    this.autoQueueShuffle = false;
    this.generatorId = 0;
  }
  play = async (track: Track, isSkip = false) => {
    this.lastActivity = new Date();
    try {
      if (this.isPlaying && !isSkip) {
        this.queue.push(track);
        return;
      }
      const trackInfo: EmbedFieldData = {
        name: track.title,
        value: track.artist || "unknown",
      };
      const embed = new MessageEmbed()
        .setTitle("Now Playing")
        .setColor(`#b7b5e4`)
        .addFields(trackInfo);
      this.textChannel.send(embed);
      const ytId = track.spotifyId
        ? await this.getYtId(track.spotifyId)
        : track.ytId;
      if (!ytId) {
        this.textChannel.send(`No matching YouTube videos found`);
        return this.playNext();
      }
      const videoLength = await this.getYtLength(ytId);
      if (videoLength > 900) {
        this.textChannel.send(`Cannot play content longer than 15 minutes`);
        return this.playNext();
      }
      const stream = await ytdl(ytId, {
        filter: "audio",
        quality: "highestaudio",
        highWaterMark: 1024 * 1024 * 32,
      });
      const dispatcher = this.voiceConnection.play(stream);
      this.dispatcher = dispatcher;
      this.isPlaying = true;
      dispatcher.on("speaking", (isSpeaking) => {
        this.isPlaying = isSpeaking;
        if (!isSpeaking) {
          this.playNext();
        }
      });
      dispatcher.on("error", (err) => {
        console.error(err);
        errorLogger.log(JSON.stringify(err));
        this.playNext();
      });
    } catch (err: unknown) {
      console.error(err);
      errorLogger.log(JSON.stringify(err));
    }
  };
  playNext = async (isSkip = false) => {
    let nextSong = this.queue.shift();
    if (isSkip) {
      this.textChannel.send(`Skoip skoip!`);
    }
    if (!nextSong) {
      if (this.isAutoQueue) {
        if (!!this.generatorId) {
          return await handleAutoGenerateCommand(this.textChannel, this);
        } else {
          return await handleQueueRandomCommand(
            this.textChannel,
            this,
            this.autoQueueShuffle
          );
        }
      } else {
        return this.textChannel.send(`That's the end of the queue!`);
      }
    }
    this.play(nextSong, isSkip);
  };
  appendQueue(tracks: Track[]) {
    this.queue = [...this.queue, ...tracks];
    this.textChannel.send(`${tracks.length} songs added to the queue...`);
    if (!this.isPlaying) {
      this.playNext();
    }
  }
  shuffle() {
    for (let i = this.queue.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    this.textChannel.send(`Shuffled!`);
  }
  clearQueue() {
    this.queue = [];
    this.stop();
  }
  stop() {
    this.dispatcher.pause();
  }
  showQueue = () => {
    const embed = new MessageEmbed().setTitle("Your Queue").setColor(`#b7b5e4`);
    const trackFields: EmbedFieldData[] = this.queue.map((track, i) => {
      const title = track.title;
      const field: EmbedFieldData = {
        name: `${i + 1}.) ${title}`,
        value: track.artist || "unknown",
      };
      return field;
    });
    embed.addFields(...trackFields);
    this.textChannel.send(embed);
  };
  leave() {
    this.voiceChannel.leave();
    this.textChannel.send(getRandomElement(serverLeaveMessages));
    const guildId = this.textChannel.guild.id;
    this.em.emit("leave", guildId);
  }
  getYtId = async (spotifyId: string) => {
    const spotifyApi = await setupSpotifyApi();
    const spotifyToYoutube = SpotifyToYoutube(spotifyApi);
    const ytId: string = await spotifyToYoutube(spotifyId);
    return ytId;
  };
  getYtLength = async (youtubeId: string): Promise<number> => {
    const metaData = await ytdl.getBasicInfo(
      `https://www.youtube.com/watch?v=${youtubeId}`
    );
    return parseInt(metaData.videoDetails.lengthSeconds);
  };
}
export default MusicPlayer;
