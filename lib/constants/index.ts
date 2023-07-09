export const LOCALHOST_GEO_DATA = {
  city: "San Francisco",
  region: "CA",
  country: "US",
  latitude: "37.7695",
  longitude: "-122.385",
};
export const LOCALHOST_IP = "63.141.56.109";

export const FRAMER_MOTION_LIST_ITEM_VARIANTS = {
  hidden: { scale: 0.8, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { type: "spring" } },
};

export const STAGGER_CHILD_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, type: "spring" } },
};

export const SWIPE_REVEAL_ANIMATION_SETTINGS = {
  initial: { height: 0 },
  animate: { height: "auto" },
  exit: { height: 0 },
  transition: { duration: 0.15, ease: "easeOut" },
};

export const FADE_IN_ANIMATION_SETTINGS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const HOME_HOSTNAMES = new Set([
  // comment for better diffs
  "dub.sh",
  "localhost",
  "localhost:3000",
]);

export const APP_HOSTNAMES = new Set([
  "app.dub.sh",
  "app.localhost:3000",
  "preview.dub.sh",
]);

export const DEFAULT_REDIRECTS = {
  home: "https://dub.sh",
  dub: "https://dub.sh",
  signin: "https://app.dub.sh/login",
  login: "https://app.dub.sh/login",
  register: "https://app.dub.sh/register",
  signup: "https://app.dub.sh/register",
  app: "https://app.dub.sh",
  dashboard: "https://app.dub.sh",
  links: "https://app.dub.sh/links",
  settings: "https://app.dub.sh/settings",
  welcome: "https://app.dub.sh/welcome",
  slack: "https://dub.slack.com",
  discord: "https://twitter.com/dubdotsh", // placeholder for now
  tags: "https://dub.sh/changelog/introducing-tags",
};

export const REDIRECT_HEADERS = {
  headers: {
    "x-powered-by": "Dub.sh - Link management for modern marketing teams",
  },
};

export const FAVICON_FOLDER = "/_static/favicons";
export const GOOGLE_FAVICON_URL =
  "https://www.google.com/s2/favicons?sz=64&domain_url=";

export const DUB_LOGO =
  "https://public.blob.vercel-storage.com/kmKY9FhOzDRAX28c/logo-1Y8NV0x4Wsy7LzPAYjBmkytJYTMJi0.png";
export const DUB_THUMBNAIL =
  "https://public.blob.vercel-storage.com/kmKY9FhOzDRAX28c/thumbnail-wU82A4LTeJMXrygW1ZR6O36k3edeJf.png";

export { default as COUNTRIES } from "./countries";
export { default as ccTLDs } from "./cctlds";

export const SECOND_LEVEL_DOMAINS = new Set([
  "com",
  "co",
  "net",
  "org",
  "edu",
  "gov",
  "in",
]);

export const SPECIAL_APEX_DOMAINS = {
  "youtu.be": "youtube.com",
};

export const DEFAULT_LINK_PROPS = {
  key: "github",
  url: "https://github.com/steven-tey/dub",
  domain: "dub.sh",
  archived: false,
  expiresAt: null,
  password: null,

  title: null,
  description: null,
  image: null,
  ios: null,
  android: null,

  clicks: 0,
  userId: "",

  proxy: false,
};

export const DUB_PROJECT_ID = "cl7pj5kq4006835rbjlt2ofka";
