export const DEFAULT_LINK_PROPS: any = {
  key: "",
  url: "",
  domain: "",
  archived: false,
  tags: [], // note: removing this breaks the link builder
  webhookIds: [], // note: removing this breaks the link builder

  title: null,
  description: null,
  image: null,
  video: null,
  trackConversion: false,
  proxy: false,
  rewrite: false,
  expiresAt: null,
  password: null,
  ios: null,
  android: null,
  doIndex: false,

  clicks: 0,
  userId: "",
};

export const GOOGLE_FAVICON_URL =
  "https://www.google.com/s2/favicons?sz=64&domain_url=";

export const DICEBEAR_AVATAR_URL =
  "https://api.dicebear.com/7.x/initials/svg?backgroundType=gradientLinear&fontFamily=Helvetica&fontSize=40&seed=";

export const PAGINATION_LIMIT = 100;

export const TWO_WEEKS_IN_SECONDS = 60 * 60 * 24 * 14;

export const DUB_FOUNDING_DATE = new Date("2022-09-22T00:00:00.000Z");

export const INFINITY_NUMBER = 1000000000;
