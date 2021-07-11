import axios from "axios";
import { getRandomElement } from "./util.js";

const getPlaylistRows = async () => {
  const NAME_INDEX = 0;
  const URI_INDEX = 1;
  const spreadsheetId = process.env.SPREADSHEET_ID as string;
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`
  try {
    const sheetData = await axios.get(url)
    const matches = sheetData.data.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/);
    if (matches && matches.length == 2) {
      const obj = JSON.parse(matches[1]);
      const table = obj.table;
      const rows = table.rows.map((row: any) => {
        return {name: row.c[NAME_INDEX].v, uri: row.c[URI_INDEX].v}
      }).slice(1);
      return rows;
    }
  } catch (err) {
    console.log(err);
  }
};

export const getRandomPlaylist = async () => {
  const playlists = await getPlaylistRows();
  return getRandomElement(playlists)
};
