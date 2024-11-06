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
          id: "clxp3lfsb00011na8tfs7t0lx",
          slug: "dub.link",
          verified: true,
          primary: true,
          archived: false,
          placeholder: "https://dub.co/help/article/what-is-dub",
          allowedHostnames: [],
          description:
            "Premium short domain on Dub – only available on our Pro plan and above.",
          projectId: DUB_WORKSPACE_ID,
        },
        {
          id: "clce1z7cs00y8rbstk4xtnj0k",
          slug: "chatg.pt",
          verified: true,
          primary: false,
          archived: false,
          placeholder: "https://chat.openai.com/g/g-UGjKKONEe-domainsgpt",
          allowedHostnames: ["openai.com", "chatgpt.com"],
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
          allowedHostnames: ["spotify.com"],
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
          allowedHostnames: ["github.com"],
          description:
            "Branded domain for GitHub links (repositories, gists, etc.).",
          projectId: DUB_WORKSPACE_ID,
        },
        {
          id: "cm23qevp4000412mqwvtkthzw",
          slug: "cal.link",
          verified: true,
          primary: false,
          archived: false,
          placeholder: "https://cal.com/steven",
          allowedHostnames: [
            "cal.com",
            "calendly.com",
            "calendar.app.google",
            "chillipiper.com",
            "hubspot.com",
            "savvycal.com",
            "zcal.co",
          ],
          description:
            "Branded domain for your scheduling links (Cal.com, Calendly, etc.).",
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
          id: "clymd6zkc0001elilr1215tj9",
          slug: "ggl.link",
          verified: true,
          primary: false,
          archived: false,
          placeholder:
            "https://docs.google.com/document/d/15-GOZA12SXGEh8lNwU5QI1jBi04TCPgY2-LChTbXVpA",
          allowedHostnames: [
            "google.com",
            "google.co.uk",
            "google.co.id",
            "google.ca",
            "google.es",
            "google.fr",
            "googleblog.com",
            "blog.google",
            "g.co",
            "g.page",
            "youtube.com",
            "youtu.be",
          ],
          description:
            "Branded domain for Google links (Search, Docs, Sheets, Slides, Drive, Maps, etc.).",
          projectId: DUB_WORKSPACE_ID,
        },
        {
          id: "clymczttm0001jgkore3ltr37",
          slug: "fig.page",
          verified: true,
          primary: false,
          archived: false,
          placeholder:
            "https://www.figma.com/design/YAfTk6SGV2HcSvL2415oED/Dub.co-Brand-Assets-(Public)?node-id=1-36593&t=QMKQNtUzxSSzG3hX-1",
          allowedHostnames: ["figma.com"],
          description:
            "Branded domain for Figma links (portfolios, prototypes, presentations, etc.).",
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
            "Branded domain for lengthening links instead of shortening them (April Fool's Prank).",
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
    dashboardId: "dash_Rqy6tVEO5Ib4iVFvmYYTK4kO",
  },
  {
    id: "cltshzzpd0005126z3rd2lvo4",
    domain: "dub.sh",
    key: "try",
    dashboardId: "dash_bUNOfMQVcKS0VMDa2HaYhOjg",
  },
  {
    id: "clot0z5rg000djp08ue98hxkn",
    domain: "chatg.pt",
    key: "domains",
    dashboardId: "dash_lX4or5Yj6ZrPk3qW4SwgrQ5t",
  },
  {
    id: "clp4jh9av0001l308ormavtlu",
    domain: "spti.fi",
    key: "hans",
    dashboardId: "dash_v2Ygwn3hZNYx6kFYfBT4IApM",
  },
  {
    id: "cltgtsex40003ck8z444hum5u",
    domain: "git.new",
    key: "dub",
    dashboardId: "dash_FX5HKOKhtQ6uoIeSDxWM8eIb",
  },
  {
    id: "clymd5vqj0005jgkorsopklsk",
    domain: "fig.page",
    key: "dub",
    dashboardId: "dash_no9BFlfSjHDG6K7XIAuwLt5p",
  },
  {
    id: "clp3k3yoi0001ju0874nz899q",
    domain: "amzn.id",
    key: "tv",
    dashboardId: "dash_fKwai9V9nsLcC0IaY0rTF1yA",
  },
  {
    id: "clymd73o50001ulmzzxjumr8l",
    domain: "ggl.link",
    key: "dub",
    dashboardId: "dash_rx5c7pQPnx2MUCX3cL4t1Zpn",
  },
  {
    id: "cm24785ki0001ainw2qks4uq5",
    domain: "cal.link",
    key: "demo",
    dashboardId: "dash_zbzP2UVvTrv5SkIEPP2pV5pC",
  },
];
