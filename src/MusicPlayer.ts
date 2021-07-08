import {
  TextChannel,
  VoiceConnection,
  MessageEmbed,
  EmbedFieldData,
  VoiceChannel,
} from "discord.js";
import ytdl from "ytdl-core-discord";
import SpotifyToYoutube from "spotify-to-youtube";
import { Track } from "./types.js";
import { setupSpotifyApi } from "./util.js";
import { EventEmitter} from "events";

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

  constructor(voiceChannel: VoiceChannel, textChannel: TextChannel, voiceConnection: VoiceConnection, em: EventEmitter) {
    this.voiceConnection = voiceConnection;
    this.textChannel = textChannel;
    this.queue = [];
    this.currentQueueIndex = 0;
    this.isPlaying = false;
    this.dispatcher = null;
    this.voiceChannel = voiceChannel;
    this.em = em;
    this.lastActivity = new Date();
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
        value: track.artist,
      };
      const embed = new MessageEmbed()
        .setTitle("Now Playing")
        .setColor(`#b7b5e4`)
        .addFields(trackInfo);
      this.textChannel.send(embed);
      const ytId = await this.getYtId(track.spotifyId);
      if (!ytId) {
        this.textChannel.send(`No matching YouTube videos found`);
        return this.playNext();
      }
      const stream = await ytdl(ytId, {
        filter: "audio",
        quality: "highestaudio",
        highWaterMark: 1024 * 1024 * 32,
      });
      const dispatcher = this.voiceConnection.play(stream, {
        type: `opus`,
      });
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
        this.playNext();
      })
    } catch (err) {
      console.error(err);
    }
  };
  playNext(isSkip = false) {
    const nextSong = this.queue.shift();
    if (isSkip) {
      this.textChannel.send(`Skoip skoip!`);
    }
    if (!nextSong) {
      return this.textChannel.send(`That's the end of the queue!`);
    }
    this.play(nextSong, isSkip);
  }
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
        value: track.artist,
      };
      return field;
    });
    embed.addFields(...trackFields);
    this.textChannel.send(embed);
  };
  leave() {
    this.voiceChannel.leave();
    this.textChannel.send("See ya next time..! ;)");
    const guildId = this.textChannel.guild.id;
    this.em.emit("leave", guildId);
  }
  getYtId = async (spotifyId: string) => {
    const spotifyApi = await setupSpotifyApi();
    const spotifyToYoutube = SpotifyToYoutube(spotifyApi);
    const ytId: string = await spotifyToYoutube(spotifyId);
    return ytId;
  };
}

export default MusicPlayer;
