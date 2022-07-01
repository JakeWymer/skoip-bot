import axios from "axios";
import { getOrCreateServerConfig, getRandomElement } from "./util.js";

const fetchSpreadsheetData = async (spreadsheetId: string) => {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
  try {
    const sheetData = await axios.get(url);
    const matches = sheetData.data.match(
      /google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/
    );
    if (matches && matches.length == 2) {
      const obj = JSON.parse(matches[1]);
      const table = obj.table;
      const rows = table.rows;
      return rows;
    }
  } catch (err) {
    console.log(err);
  }
};

const getPlaylistRows = async (spreadsheetId: string) => {
  const NAME_INDEX = 0;
  const ARTIST_INDEX = 1;
  const URI_INDEX = 2;
  const DISABLED_INDEX = 3;
  try {
    const playlistRows = (await fetchSpreadsheetData(spreadsheetId)) as [];
    const rows = playlistRows
      .map((row: any) => {
        return {
          name: row.c[NAME_INDEX].v,
          artist: row.c[ARTIST_INDEX]?.v,
          uri: row.c[URI_INDEX].v,
          isDisabled: row.c[DISABLED_INDEX]?.v,
        };
      })
      .slice(1)
      .filter((row: any) => {
        return !row.isDisabled;
      });
    return rows;
  } catch (err) {
    console.log(err);
    return [];
  }
};

export const fetchUrlOverrides = async (guildId: string) => {
  const SONG_NAME_INDEX = 0;
  const ARTIST_INDEX = 1;
  try {
    const serverConfig = await getOrCreateServerConfig(guildId);
    if (!serverConfig.override_id) {
      return {};
    }
    const overrideRows = await fetchSpreadsheetData(serverConfig.override_id);
    return overrideRows.reduce((mapObj: any, row: any) => {
      return {
        ...mapObj,
        [`${row.c[SONG_NAME_INDEX].v}, ${row.c[ARTIST_INDEX].v}`]: row,
      };
    }, {});
  } catch (err) {
    console.log(err);
    return {};
  }
};

export const getRandomPlaylist = async (guildId: string) => {
  const serverConfig = await getOrCreateServerConfig(guildId);
  const playlists = await getPlaylistRows(serverConfig.sheets_id);
  return getRandomElement(playlists);
};
