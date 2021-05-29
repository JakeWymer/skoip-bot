import axios from "axios";

const getSheetyPlaylists = async () => {
  const sheetyUrl = process.env.SHEETY_URL as string;
  try {
    const spreadsheet = await axios.get(sheetyUrl);
    return spreadsheet.data.skoip;
  } catch (error) {
    console.log(error);
  }
};

export const getRandomPlaylist = async () => {
  const playlists = await getSheetyPlaylists();
  const randomIndex = Math.floor(Math.random() * playlists.length);
  return playlists[randomIndex];
};
