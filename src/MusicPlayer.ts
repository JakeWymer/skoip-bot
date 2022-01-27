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
import { trackEvent } from "./tracking.js";
import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  VoiceConnection,
} from "@discordjs/voice";
import { getUrlOverride } from "./sheets.js";
import handleQueueRandomCommand from "./commands/random.js";
import handleAutoGenerateCommand from "./commands/autoGenerate.js";

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
    this.audioPlayer = createAudioPlayer();
    this.voiceChannel = voiceChannel;
    this.em = em;
    this.lastActivity = new Date();
    this.isAutoQueue = false;
    this.autoQueueShuffle = false;
    this.generatorId = 0;
    this.currentSong = null;

    this.voiceConnection.subscribe(this.audioPlayer);

    this.audioPlayer.on(`stateChange`, (oldState, newState) => {
      // Audio resource finished playing
      if (
        newState.status === AudioPlayerStatus.Idle &&
        oldState.status === AudioPlayerStatus.Playing
      ) {
        this.stop();
        this.playNext();
      }
    });

    this.audioPlayer.on(`error`, (err) => {
      console.error(err);
      this.playNext();
    });
  }

  play = async (track: Track, isSkip = false) => {
    this.lastActivity = new Date();
    try {
      if (this.isPlaying() && !isSkip) {
        this.queue.push(track);
        return;
      }

      this.currentSong = track;
      const embed = this.buildNowPlayingEmbed(track);
      this.textChannel.send({ embeds: [embed] });
      const ytId = track.spotifyId
        ? await this.getYtId(track.spotifyId)
        : track.ytId;

      // We can't play a song that doesn't have a matching YT video
      if (!ytId) {
        this.textChannel.send(`No matching YouTube videos found`);
        return this.playNext();
      }

      // We don't want to queue something longer than 15 mins
      const videoLength = await this.getYtLength(ytId);
      if (videoLength > 900) {
        this.textChannel.send(`Cannot play content longer than 15 minutes`);
        return this.playNext();
      }

      const stream = await this.fetchYtStream(ytId);
      const audioResource = createAudioResource(stream);
      this.audioPlayer.play(audioResource);

      trackEvent(`Played Song`, {
        name: track.title,
        artist: track.artist,
      });
    } catch (err: unknown) {
      console.error(err);
    }
  };

  private fetchYtStream = async (ytId: string) => {
    return await ytdl(ytId, {
      filter: "audio",
      quality: "highestaudio",
      highWaterMark: 1024 * 1024 * 32,
    });
  };

  private buildNowPlayingEmbed = (track: Track) => {
    return new MessageEmbed()
      .setTitle("Now Playing")
      .setDescription(`**${track.title}**\n${track.artist || "unknown"}`)
      .setColor(`#b7b5e4`);
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

  appendQueue(tracks: Track[], shouldShuffle = false) {
    this.queue = [...this.queue, ...tracks];
    this.textChannel.send(`${tracks.length} songs added to the queue...`);
    if (shouldShuffle) {
      this.shuffle();
    }
    if (!this.isPlaying()) {
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
    this.audioPlayer.stop();
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

  private getYtId = async (spotifyId: string) => {
    const spotifyIdOrOverrideUrl = await getUrlOverride(
      this.textChannel.guild.id,
      spotifyId
    );
    // If we hit this, it's a YT override
    if (spotifyId !== spotifyIdOrOverrideUrl) {
      this.textChannel.send(`URL override found`);
      return this.parseYtUrl(spotifyIdOrOverrideUrl);
    }
    // Else it's the normal Spotify id we need to convert to a YT id
    const spotifyApi = await setupSpotifyApi();
    const spotifyToYoutube = SpotifyToYoutube(spotifyApi);
    const ytId: string = await spotifyToYoutube(spotifyIdOrOverrideUrl);
    return ytId;
  };

  private parseYtUrl = (url: string) => {
    const trackId = ytdl.getURLVideoID(url);
    if (trackId) {
      return trackId;
    } else {
      throw Error(`Invalid YouTube URL`);
    }
  };

  private getYtLength = async (youtubeId: string): Promise<number> => {
    const metaData = await ytdl.getBasicInfo(
      `https://www.youtube.com/watch?v=${youtubeId}`
    );
    return parseInt(metaData.videoDetails.lengthSeconds);
  };

  isPlaying = () => {
    return (
      this.audioPlayer.state.status === AudioPlayerStatus.Playing ||
      this.audioPlayer.state.status === AudioPlayerStatus.Buffering
    );
  };
}
export default MusicPlayer;
