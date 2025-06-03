export const UA_BOTS = [
  // generic bot UA name patterns
  "bot", // most bots
  "crawler", // most crawlers
  "spider", // most spiders
  "http", // HTTP clients and libraries (e.g., Apache-HttpClient, Go-http-client, etc.)
  "scraper", // most scrapers
  "fetch", // most fetch libraries
  "curl", // most curl libraries
  "wget", // most wget libraries
  "python", // most python libraries
  "node", // most node libraries – e.g. node-fetch/1.0 (+https://github.com/bitinn/node-fetch)
  "ruby", // most ruby libraries

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
  "iframely", // https://iframely.com/docs/about (used by Notion, Linear)
  "HeadlessChrome", // headless chrome

  // new
  "ia_archiver",
  "Sogou",
  "SkypeUriPreview",
  "vkShare",
  "Slackbot",
  "Tumblr",
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
  "perplexity", // Perplexity AI
  "Omigili", // Omigili
  "timpi", // Timpi.io

  // bots detected by Vercel
  "ShortLinkTranslate",

  // Additional legitimate crawlers from user-agents.net/bots
  "BingPreview", // Bing link preview
  "facebookcatalog", // Facebook catalog crawler
  "Embedly", // Embedly link preview
  "Scrapy", // Scrapy web scraping framework
  "axios", // axios HTTP client library
  "Guzzle", // PHP Guzzle HTTP client
  "Postman", // Postman API client
  "Insomnia", // Insomnia REST client
  "Newman", // Newman (Postman CLI runner)
  "Qwantify", // Qwant search engine
  "Wayback", // Wayback Machine
  "heritrix", // Heritrix web crawler
  "nutch", // Apache Nutch
  "seokicks", // SEOkicks robot
  "sistrix", // Sistrix crawler
  "searchmetrics", // Searchmetrics
  "linkdex", // Linkdex
  "opensiteexplorer", // Open Site Explorer
  "spyfu", // SpyFu
  "serpstat", // Serpstat
  "cognitiveseo", // CognitiveSEO
  "seobility", // Seobility
  "seositecheckup", // SeoSiteCheckup
  "woorank", // WooRank
  "gtmetrix", // GTmetrix
  "pingdom", // Pingdom
  "statuscake", // StatusCake
  "site24x7", // Site24x7
  "monitis", // Monitis
  "gomez", // Gomez
  "neustar", // Neustar
  "catchpoint", // Catchpoint
  "webpagetest", // WebPageTest
  "speedcurve", // SpeedCurve
  "dareboost", // Dareboost
  "yellowlab", // YellowLab Tools
  "linkchecker", // link checkers
  "deadlinkchecker", // dead link checker
  "brokenlinkcheck", // broken link checker
  "xenu", // Xenu link checker
  "scrutiny", // Scrutiny link checker
  "powermapper", // PowerMapper
  "siteimprove", // Siteimprove
  "monsido", // Monsido
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
