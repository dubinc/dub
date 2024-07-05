export * from "./cctlds";
export * from "./countries";
export * from "./domains";
export * from "./framer-motion";
export * from "./layout";
export * from "./localhost";
export * from "./middleware";
export * from "./misc";
export * from "./pricing";
export * from "./saml";

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Dub.co";

export const SHORT_DOMAIN =
  process.env.NEXT_PUBLIC_APP_SHORT_DOMAIN || "dub.sh";

export const HOME_DOMAIN = `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`;

export const APP_HOSTNAMES = new Set([
  `app.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
  `preview.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
  "localhost:8888",
  "localhost",
]);

export const APP_DOMAIN =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? `https://app.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? `https://preview.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
      : "http://localhost:8888";

export const APP_DOMAIN_WITH_NGROK =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? `https://app.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? `https://preview.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
      : process.env.NEXT_PUBLIC_NGROK_URL || "http://localhost:8888";

export const API_HOSTNAMES = new Set([
  `api.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
  `api-staging.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
  `api.${SHORT_DOMAIN}`,
  "api.localhost:8888",
]);

export const API_DOMAIN =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? `https://api.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? `https://api-staging.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
      : "http://api.localhost:8888";

export const ADMIN_HOSTNAMES = new Set([
  `admin.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
  "admin.localhost:8888",
]);

export const DUB_LOGO = "https://assets.dub.co/logo.png";
export const DUB_WORDMARK = "https://assets.dub.co/wordmark.png";
export const DUB_THUMBNAIL = "https://assets.dub.co/thumbnail.jpg";

export const DUB_WORKSPACE_ID = "cl7pj5kq4006835rbjlt2ofka";
export const LEGAL_WORKSPACE_ID = "clrflia0j0000vs7sqfhz9c7q";
export const LEGAL_USER_ID = "clqei1lgc0000vsnzi01pbf47";

export const DUB_DOMAINS = [
  {
    id: "clce1z7ch00j0rbstbjufva4j",
    slug: SHORT_DOMAIN,
    verified: true,
    primary: true,
    archived: false,
    publicStats: false,
    target: `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
    type: "redirect",
    placeholder: "https://dub.co/help/article/what-is-dub",
    clicks: 0,
    allowedHostnames: [],
    projectId: DUB_WORKSPACE_ID,
  },
  ...(process.env.NEXT_PUBLIC_IS_DUB
    ? [
        {
          id: "clce1z7cs00y8rbstk4xtnj0k",
          slug: "chatg.pt",
          verified: true,
          primary: false,
          archived: false,
          publicStats: false,
          target: "https://dub.co/tools/chatgpt-link-shortener",
          type: "redirect",
          placeholder: "https://chat.openai.com/g/g-UGjKKONEe-domainsgpt",
          clicks: 0,
          allowedHostnames: ["chat.openai.com", "chatgpt.com"],
          projectId: DUB_WORKSPACE_ID,
        },
        {
          id: "cloxw8y2u0003js08a7mqg1j8",
          slug: "spti.fi",
          verified: true,
          primary: false,
          archived: false,
          publicStats: false,
          target: "https://dub.co/tools/spotify-link-shortener",
          type: "redirect",
          placeholder: "https://open.spotify.com/album/1SCyi9a5pOasikidToUY5y",
          clicks: 0,
          allowedHostnames: ["open.spotify.com"],
          projectId: DUB_WORKSPACE_ID,
        },
        {
          id: "cltgtd6s5000341itdszz20u2",
          slug: "git.new",
          verified: true,
          primary: false,
          archived: false,
          publicStats: false,
          target: "https://dub.co/tools/github-link-shortener",
          type: "redirect",
          placeholder: "https://github.com/dubinc/dub",
          clicks: 0,
          allowedHostnames: ["github.com", "gist.github.com"],
          projectId: DUB_WORKSPACE_ID,
        },
        {
          id: "cloxw8qtk000bjt08n9b812vs",
          slug: "amzn.id",
          verified: true,
          primary: false,
          archived: false,
          publicStats: false,
          target: "https://dub.co/tools/amazon-link-shortener",
          type: "redirect",
          placeholder: "https://www.amazon.com/dp/B0BW4SWNC8",
          clicks: 0,
          allowedHostnames: [
            "amazon.com",
            "amazon.co.uk",
            "amazon.ca",
            "amazon.es",
            "amazon.fr",
          ],
          projectId: DUB_WORKSPACE_ID,
        },
        {
          id: "clugy7euh000a11h6ignmj42o",
          slug: "loooooooo.ng",
          verified: true,
          primary: false,
          archived: true,
          publicStats: true,
          target: "https://dub.co/tools/url-lengthener",
          type: "redirect",
          placeholder: "https://d.to/long",
          clicks: 0,
          projectId: DUB_WORKSPACE_ID,
        },
      ]
    : []),
];

export const DUB_DOMAINS_ARRAY = DUB_DOMAINS.map((domain) => domain.slug);

export const DUB_DEMO_LINKS = [
  {
    id: "clqo10sum0006js08vutzfxt3",
    domain: "d.to",
    key: "try",
  },
  {
    id: "cltshzzpd0005126z3rd2lvo4",
    domain: "dub.sh",
    key: "try",
  },
  {
    id: "clot0z5rg000djp08ue98hxkn",
    domain: "chatg.pt",
    key: "domains",
  },
  {
    id: "clp4jh9av0001l308ormavtlu",
    domain: "spti.fi",
    key: "hans",
  },
  {
    id: "cltgtsex40003ck8z444hum5u",
    domain: "git.new",
    key: "dub",
  },
  {
    id: "clp3k3yoi0001ju0874nz899q",
    domain: "amzn.id",
    key: "tv",
  },
];
