import { Player, Queue } from "@discordx/music";
import {
  EmbedFieldData,
  Guild,
  MessageEmbed,
  TextChannel,
  VoiceChannel,
} from "discord.js";
import spotify from "spotify-url-info";
import handleAutoGenerateCommand from "./commands/autoGenerate.js";
import handleQueueRandomCommand from "./commands/random.js";
import { fetchUrlOverrides } from "./sheets.js";
import { MP_EVENTS, trackEvent } from "./tracking.js";
import { SkoipyTrack, UrlSources } from "./types.js";
import { getUrlSource } from "./util.js";

class SkoipyQueue extends Queue {
  generatorId: number;
  isAutoQueue: boolean;
  shuffleAutoQueue: boolean;
  textChannel: TextChannel;
  voiceChannel: VoiceChannel;

  constructor(
    player: Player,
    guild: Guild,
    voiceChannel: VoiceChannel,
    textChannel: TextChannel
  ) {
    super(player, guild);

    // Default generatorId of 0 means no generator is set
    this.generatorId = 0;
    this.isAutoQueue = false;
    this.shuffleAutoQueue = false;
    this.textChannel = textChannel;
    this.voiceChannel = voiceChannel;

    // When track beings playing
    this.player.on("onStart", this.onPlay);

    // When queue is empty
    this.player.on("onFinishPlayback", ([]) => {
      if (this.isAutoQueue) {
        if (!!this.generatorId) {
          handleAutoGenerateCommand(this);
        } else {
          handleQueueRandomCommand(this, this.shuffleAutoQueue);
        }
      } else {
        this.textChannel.send("That's the end of the queue! :musical_note:");
      }
    });
  }

  async addToQueue(url: string, enqueueTop = false) {
    const source = getUrlSource(url);
    switch (source) {
      case UrlSources.SPOTIFY:
        const tracks = (await this.spotify(
          url,
          {},
          enqueueTop
        )) as SkoipyTrack[];
        const sTracks = await spotify.getTracks(url);
        if (tracks) {
          const urlOverrideMap = await fetchUrlOverrides(this.guild.id);
          sTracks.forEach((track, i) => {
            const artists = this.stringifySpotifyArtists(track.artists);
            tracks[i].trackName = track.name;
            tracks[i].trackArtist = artists;
            const overrideRow = urlOverrideMap[`${track.name}, ${artists}`];
            if (overrideRow) {
              const OVERRIDE_URL_INDEX = 3;
              tracks[i].url = overrideRow.c[OVERRIDE_URL_INDEX].v;
            }
          });
        }
        break;
      case UrlSources.YOUTUBE:
        this.play(url);
        break;
      default:
        break;
    }
  }

  handleSkip() {
    const trackData = this.currentTrack?.metadata as SkoipyTrack;
    trackEvent(MP_EVENTS.SKIPPED_SONG, {
      name: trackData.trackName,
      artist: trackData.trackArtist,
      $distinct_id: this.guild.id,
    });
    this.skip();
  }

  showQueue = () => {
    const embed = new MessageEmbed().setTitle("Your Queue").setColor(`#b7b5e4`);
    const tracks = this.tracks as SkoipyTrack[];
    const trackFields: EmbedFieldData[] = tracks.map((track, i) => {
      const title = track.trackName;
      const field: EmbedFieldData = {
        name: `${i + 1}.) ${title}`,
        value: track.trackArtist || "unknown",
      };
      return field;
    });
    embed.addFields(...trackFields);
    this.textChannel.send({ embeds: [embed] });
  };

  onPlay(queueInfo: any) {
    const queue = queueInfo[0];
    const track = queueInfo[1] as SkoipyTrack;
    const embed = queue.buildNowPlayingEmbed(track);
    queue.textChannel.send({ embeds: [embed] });
    trackEvent(MP_EVENTS.PLAYED_SONG, {
      name: track.trackName,
      artist: track.trackArtist || "unknown",
      $distinct_id: queue.guild.id,
    });
  }

  private stringifySpotifyArtists(artists: any): string {
    return `${
      artists
        ? artists.map((ar: spotify.ArtistsEntity) => ar.name).join(", ")
        : ""
    }`;
  }

  private buildNowPlayingEmbed(track: SkoipyTrack) {
    return new MessageEmbed()
      .setTitle("Now Playing")
      .setDescription(
        `**${track.trackName}**\n${track.trackArtist || "unknown"}`
      )
      .setColor(`#b7b5e4`);
  }
}

export default SkoipyQueue;
