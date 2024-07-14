import { DUB_WORKSPACE_ID, SHORT_DOMAIN } from "./main";

export const DUB_DOMAINS = [
  {
    id: "clce1z7ch00j0rbstbjufva4j",
    slug: SHORT_DOMAIN,
    verified: true,
    primary: true,
    archived: false,
    placeholder: "https://dub.co/help/article/what-is-dub",
    allowedHostnames: [],
    description: "The default domain for all new accounts.",
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
          placeholder: "https://chat.openai.com/g/g-UGjKKONEe-domainsgpt",
          allowedHostnames: ["chat.openai.com", "chatgpt.com"],
          description:
            "Branded domain for ChatGPT links (convos, custom GPTs).",
          projectId: DUB_WORKSPACE_ID,
        },
        {
          id: "cloxw8y2u0003js08a7mqg1j8",
          slug: "spti.fi",
          verified: true,
          primary: false,
          archived: false,
          placeholder: "https://open.spotify.com/album/1SCyi9a5pOasikidToUY5y",
          allowedHostnames: ["open.spotify.com"],
          description:
            "Branded domain for Spotify links (songs, playlists, etc.).",
          projectId: DUB_WORKSPACE_ID,
        },
        {
          id: "cltgtd6s5000341itdszz20u2",
          slug: "git.new",
          verified: true,
          primary: false,
          archived: false,
          placeholder: "https://github.com/dubinc/dub",
          allowedHostnames: ["github.com", "gist.github.com"],
          description:
            "Branded domain for GitHub links (repositories, gists, etc.).",
          projectId: DUB_WORKSPACE_ID,
        },
        {
          id: "cloxw8qtk000bjt08n9b812vs",
          slug: "amzn.id",
          verified: true,
          primary: false,
          archived: false,
          placeholder: "https://www.amazon.com/dp/B0BW4SWNC8",
          allowedHostnames: [
            "amazon.com",
            "amazon.co.uk",
            "amazon.ca",
            "amazon.es",
            "amazon.fr",
          ],
          description:
            "Branded domain for Amazon links (products, wishlists, etc.).",
          projectId: DUB_WORKSPACE_ID,
        },
        {
          id: "clugy7euh000a11h6ignmj42o",
          slug: "loooooooo.ng",
          verified: true,
          primary: false,
          archived: true,
          placeholder: "https://d.to/long",
          description:
            "Branded domain for lengthening links instead of shortening them.",
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
