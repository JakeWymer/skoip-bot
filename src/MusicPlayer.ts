import {
  TextChannel,
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
import { trackEvent } from "./tracking.js";
import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  VoiceConnection,
} from "@discordjs/voice";

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
  audioPlayer: AudioPlayer;
  voiceChannel: VoiceChannel;
  em: EventEmitter;
  lastActivity: Date;
  isAutoQueue: boolean;
  autoQueueShuffle: boolean;
  generatorId: number;
  currentSong: Track | null;

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
    this.audioPlayer = createAudioPlayer();
    this.voiceChannel = voiceChannel;
    this.em = em;
    this.lastActivity = new Date();
    this.isAutoQueue = false;
    this.autoQueueShuffle = false;
    this.generatorId = 0;
    this.currentSong = null;

    this.voiceConnection.subscribe(this.audioPlayer);
  }
  play = async (track: Track, isSkip = false) => {
    this.lastActivity = new Date();
    try {
      if (this.isPlaying && !isSkip) {
        this.queue.push(track);
        return;
      }
      this.currentSong = track;
      const embed = new MessageEmbed()
        .setTitle("Now Playing")
        .setDescription(`**${track.title}**\n${track.artist || "unknown"}`)
        .setColor(`#b7b5e4`);
      this.textChannel.send({ embeds: [embed] });
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
      const audioResource = createAudioResource(stream);
      this.audioPlayer.play(audioResource);
      this.isPlaying = true;
      trackEvent(`Played Song`, {
        name: track.title,
        artist: track.artist,
      });
      this.audioPlayer.on(`stateChange`, (oldState, newState) => {
        // Audio resource finished playing
        if (
          newState.status === AudioPlayerStatus.Idle &&
          oldState.status !== AudioPlayerStatus.Idle
        ) {
          this.isPlaying = false;
          this.playNext();
        } else if (newState.status === AudioPlayerStatus.Playing) {
          this.isPlaying = true;
        }
      });
      this.audioPlayer.on(`error`, (err) => {
        console.error(err);
        errorLogger.log(JSON.stringify(err));
        this.isPlaying = false;
        this.playNext();
      });
    } catch (err: unknown) {
      console.error(err);
    }
  };
  playNext = async (isSkip = false) => {
    let nextSong = this.queue.shift();
    if (isSkip) {
      this.textChannel.send(`Skoip skoip!`);
      trackEvent(`Skipped Song`, {
        name: this.currentSong?.title,
        artist: this.currentSong?.artist,
      });
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
    this.playNext();
  }
  stop() {
    this.audioPlayer.pause();
    this.isPlaying = false;
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
    this.textChannel.send({ embeds: [embed] });
  };
  leave() {
    this.voiceConnection.disconnect();
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
