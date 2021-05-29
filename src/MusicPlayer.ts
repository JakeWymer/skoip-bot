import {
  TextChannel,
  VoiceConnection,
  MessageEmbed,
  EmbedFieldData,
} from "discord.js";
import ytdl from "ytdl-core-discord";
import { Track } from "./types.js";

class MusicPlayer {
  voiceConnection: VoiceConnection;
  queue: Track[];
  isPlaying: boolean;
  currentQueueIndex: number;
  textChannel: TextChannel;
  dispatcher: any;
  constructor(voiceConnection: VoiceConnection, textChannel: TextChannel) {
    this.voiceConnection = voiceConnection;
    this.textChannel = textChannel;
    this.queue = [];
    this.currentQueueIndex = 0;
    this.isPlaying = false;
    this.dispatcher = null;
  }
  play = async (track: Track, isSkip = false) => {
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
    const stream = await ytdl(track.ytId, {
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
    console.log("leaving...");
  }
}

export default MusicPlayer;
