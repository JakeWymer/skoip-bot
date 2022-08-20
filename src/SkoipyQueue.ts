import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection,
} from "@discordjs/voice";
import {
  EmbedBuilder,
  EmbedField,
  Guild,
  TextChannel,
  VoiceChannel,
} from "discord.js";
import spotify, { ArtistsEntity, Tracks } from "spotify-url-info";
import fetch from "isomorphic-unfetch";
import spotifyToYT from "spotify-to-yt";
import handleAutoGenerateCommand from "./commands/autoGenerate.js";
import handleQueueRandomCommand from "./commands/random.js";
import { fetchUrlOverrides } from "./sheets.js";
import { MP_EVENTS, trackEvent } from "./tracking.js";
import { SkoipyTrack, UrlSources } from "./types.js";
import { getUrlSource } from "./util.js";
import ytdl from "ytdl-core";

const sp = spotify(fetch);

class SkoipyQueue {
  tracks: SkoipyTrack[];
  currentTrack: SkoipyTrack | null;
  generatorId: number;
  isAutoQueue: boolean;
  shuffleAutoQueue: boolean;
  textChannel: TextChannel;
  voiceChannel: VoiceChannel;
  guild: Guild;
  player: AudioPlayer;
  voiceConnection: VoiceConnection;

  constructor(
    guild: Guild,
    voiceChannel: VoiceChannel,
    textChannel: TextChannel
  ) {
    this.tracks = [];
    this.currentTrack = null;
    this.generatorId = 0; // Default generatorId of 0 means no generator is set
    this.isAutoQueue = false;
    this.shuffleAutoQueue = false;
    this.textChannel = textChannel;
    this.voiceChannel = voiceChannel;
    this.guild = guild;
    this.player = new AudioPlayer();

    this.voiceConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });
    this.voiceConnection.subscribe(this.player);

    this.player.on("stateChange", (oldState, newState) => {
      if (
        oldState.status === AudioPlayerStatus.Playing &&
        newState.status === AudioPlayerStatus.Idle
      ) {
        this.processQueue();
      }
    });
  }

  leave() {
    this.voiceConnection.destroy();
    this.player.stop();
  }

  clear() {
    this.tracks = [];
  }

  shuffle() {
    this.tracks.sort((a, b) => 0.5 - Math.random());
  }

  playSong(track: SkoipyTrack) {
    const stream = ytdl(track.youtubeUrl, { highWaterMark: 1 << 25 });
    const resource = createAudioResource(stream);
    this.currentTrack = track;
    this.player.play(resource);
    this.onPlay();
  }

  async addToQueue(url: string, enqueueTop = false) {
    const source = getUrlSource(url);
    url = url.slice(0, url.lastIndexOf("?"));
    switch (source) {
      case UrlSources.SPOTIFY:
        await this.addSpotifyTracksToQueue(url, enqueueTop);
        break;
      case UrlSources.YOUTUBE:
        // this.play(url);
        break;
      default:
        break;
    }
  }

  handleSkip() {
    const currentTrack = this.currentTrack as SkoipyTrack;
    trackEvent(MP_EVENTS.SKIPPED_SONG, {
      name: currentTrack.trackName,
      artist: currentTrack.trackArtist,
      $distinct_id: this.guild.id,
    });
    this.processQueue(true);
  }

  showQueue = () => {
    const embed = new EmbedBuilder().setTitle("Your Queue").setColor(`#6e108a`);
    const tracks = this.tracks;
    const trackFields: EmbedField[] = tracks.map((track, i) => {
      const title = track.trackName;
      const field: EmbedField = {
        name: `${i + 1}.) ${title}`,
        value: track.trackArtist || "unknown",
        inline: false,
      };
      return field;
    });
    embed.addFields(...trackFields);
    this.textChannel.send({ embeds: [embed] });
  };

  onPlay() {
    if (this.currentTrack) {
      const embed = this.buildNowPlayingEmbed(this.currentTrack);
      this.textChannel.send({ embeds: [embed] });
      trackEvent(MP_EVENTS.PLAYED_SONG, {
        name: this.currentTrack.trackName,
        artist: this.currentTrack.trackArtist || "unknown",
        $distinct_id: this.guild.id,
      });
    }
  }

  private async addSpotifyTracksToQueue(
    url: string,
    enqueueTop?: boolean
  ): Promise<SkoipyTrack[] | undefined> {
    const spotifyTracks = await sp.getTracks(url);

    if (!spotifyTracks) {
      return;
    }

    const { songs: youtubeLinks } = await this.getYoutubeUrls(url);

    const skoipyTracks: SkoipyTrack[] = spotifyTracks.map((track, i) => {
      const artists = track.artists
        ? this.stringifySpotifyArtists(track.artists)
        : "";
      return {
        trackName: track.name,
        trackArtist: artists,
        youtubeUrl: youtubeLinks[i],
      };
    });
    const processedTracks = await this.applyOverrides(skoipyTracks);
    this.enqueue(processedTracks, enqueueTop);
  }

  private enqueue(tracks: SkoipyTrack[], top?: boolean) {
    this.tracks = [...this.tracks, ...tracks];
    this.processQueue();
  }

  private processQueue(skip = false) {
    if (this.player.state.status == AudioPlayerStatus.Idle || skip) {
      const nextSong = this.tracks.shift();
      if (nextSong) {
        this.playSong(nextSong);
      } else {
        if (this.isAutoQueue) {
          if (!!this.generatorId) {
            handleAutoGenerateCommand(this);
          } else {
            handleQueueRandomCommand(this, this.shuffleAutoQueue);
          }
        } else {
          this.textChannel.send("That's the end of the queue! :musical_note:");
        }
      }
    }
  }

  private async applyOverrides(skoipyTracks: SkoipyTrack[]) {
    const urlOverrideMap = await fetchUrlOverrides(this.guild.id);
    return skoipyTracks.map((track) => {
      const overrideRow =
        urlOverrideMap[`${track.trackName}, ${track.trackArtist}`];
      if (overrideRow) {
        const OVERRIDE_URL_INDEX = 3;
        track.youtubeUrl = overrideRow.c[OVERRIDE_URL_INDEX].v;
      }
      return track;
    });
  }

  private async getYoutubeUrls(spotifyPlaylistUrl: string) {
    return await spotifyToYT.playListGet(spotifyPlaylistUrl);
  }

  private stringifySpotifyArtists(artists: ArtistsEntity[]): string {
    return `${
      artists ? artists.map((ar: ArtistsEntity) => ar.name).join(", ") : ""
    }`;
  }

  private buildNowPlayingEmbed(track: SkoipyTrack) {
    return new EmbedBuilder()
      .setTitle("Now Playing")
      .setDescription(
        `**${track.trackName}**\n${track.trackArtist || "unknown"}`
      )
      .setColor(`#6e108a`);
  }
}

export default SkoipyQueue;
