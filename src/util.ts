import SpotifyWebApi from "spotify-web-api-node";

export const setupSpotifyApi = async (): Promise<SpotifyWebApi> => {
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  // Retrieve an access token.
  const spotifyToken = await spotifyApi.clientCredentialsGrant();
  spotifyApi.setAccessToken(spotifyToken.body.access_token);

  return spotifyApi;
};
