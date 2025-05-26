export const UA_BOTS = [
  "bot", // most bots
  "crawler", // most crawlers
  "chatgpt", // ChatGPT
  "bluesky", // Bluesky crawler
  "facebookexternalhit", // Facebook crawler
  "meta-externalagent", // Meta external agent
  "WhatsApp", // WhatsApp crawler
  "google", // Google crawler
  "baidu", // Baidu crawler
  "bing", // Bing crawler
  "msn", // MSN crawler
  "duckduckbot", // DuckDuckGo crawler
  "teoma", // Teoma crawler
  "slurp", // Slurp crawler
  "yandex", // Yandex crawler
  "MetaInspector", // metatags.io
  "Go-http-client", // Go-http-client/1.1 is a bot: https://user-agents.net/string/go-http-client-1-1
  "iframely", // https://iframely.com/docs/about (used by Notion, Linear)
  "H1cbA69", // internal links/metatags API

  // new
  "ia_archiver",
  "Sogou",
  "SkypeUriPreview",
  "vkShare",
  "Slackbot",
  "Tumblr",
  "python",
  "FeedBurner",
  "upptime",
  "Hyperping",
  "cron-job",
  "InternetMeasurement",
  "HostTracker",
  "Expanse", // Expanse (Palo Alto Networks)

  // AI bots
  "anthropic-ai", // Anthropic AI
  "Claude-Web", // Claude AI
  "Applebot-Extended", // Applebot Extended
  "Bytespider", // Bytespider
  "CCBot", // Common Crawl
  "ChatGPT-User", // ChatGPT User
  "cohere", // Cohere AI
  "perplexity", // Perplexity AI
  "Omigili", // Omigili
  "timpi", // Timpi.io

  // more bots detected by Vercel
  "node", // node-fetch/1.0 (+https://github.com/bitinn/node-fetch)
  "ShortLinkTranslate",
  "okhttp",
];

export const IP_BOTS = [
  "127.0.0.1", // localhost

  // bot IPs from Tinybird dataset
  "52.112.74.60",
  "52.112.125.8",
  "52.112.49.104",
  "52.112.49.112",
  "52.112.39.132",
  "52.123.190.36",
  "52.123.190.60",
  "52.112.95.132",
  "52.123.190.88",
  "52.112.95.133",
  "52.123.190.124",
  "52.112.39.133",
  "52.112.49.156",
  "195.211.23.206",
  "172.69.34.226",
  "52.112.49.196",
  "172.69.34.225",
  "52.112.125.9",
  "172.69.34.17",
  "172.69.34.18",
  "195.211.23.207",
  "52.112.49.157",
  "172.69.22.217",
  "162.158.167.225",
  "162.158.167.226",
  "52.112.74.61",
  "172.69.34.194",
  "27.124.32.71",
  "172.69.22.216",
  "172.69.34.193",
  "195.211.23.208",
  "195.211.23.210",
  "110.40.20.105",
  "134.122.196.16",

  "35.185.193.22", // The Dalles
  "34.105.67.76", // The Dalles
  "154.28.229.7", // Ashburn

  "207.46.13.111", // microsoft IP
];

export const IP_RANGES_BOTS = [
  // weird bot activity from Miami
  "159.148.128.0/24",

  // Expanse (Palo Alto Networks)
  "198.235.24.0/24",
  "205.210.31.0/24",

  // odd traffic from Hong Kong (Aliexpress)
  "47.238.13.0/24",
  "47.238.14.0/24",
];
