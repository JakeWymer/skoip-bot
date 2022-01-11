import axios from "axios";
import { getRandomElement } from "./util.js";
import Server from "./db/models/Server.js";

const getPlaylistRows = async (spreadsheetId: string) => {
  const NAME_INDEX = 0;
  const ARTIST_INDEX = 1;
  const URI_INDEX = 2;
  const DISABLED_INDEX = 3;
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
  try {
    const sheetData = await axios.get(url);
    const matches = sheetData.data.match(
      /google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/
    );
    if (matches && matches.length == 2) {
      const obj = JSON.parse(matches[1]);
      const table = obj.table;
      const rows = table.rows
        .map((row: any) => {
          return { name: row.c[NAME_INDEX].v, artist: row.c[ARTIST_INDEX]?.v, uri: row.c[URI_INDEX].v, isDisabled: row.c[DISABLED_INDEX]?.v };
        })
        .slice(1)
        .filter((row: any) => {
          return !row.isDisabled
        });
      return rows;
    }
  } catch (err) {
    console.log(err);
  }
};

export const getRandomPlaylist = async (guildId: string) => {
  const serverConfig = (await Server.findOne({
    where: {
      server_id: guildId,
    },
  })) as any;
  if (!serverConfig || !serverConfig.sheets_id) {
    return null;
  }
  const playlists = await getPlaylistRows(serverConfig.sheets_id);
  return getRandomElement(playlists);
};
