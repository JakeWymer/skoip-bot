import mixpanel from "mixpanel";

const isProd = process.env.NODE_ENV === `prod`;
const mpToken = process.env.MP_TOKEN as string;

const mp = mixpanel.init(mpToken, {
  debug: !isProd,
});

export const MP_EVENTS = {
  PLAYED_SONG: `Played Song`,
  RANDOM_QUEUED: `Random Queued`,
  SKIPPED_SONG: `Skipped Song`,
};

export const trackEvent = (eventName: string, properties: any) => {
  mp.track(eventName, properties);
};
