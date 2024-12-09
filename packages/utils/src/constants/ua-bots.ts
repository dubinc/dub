// This list is copied from https://github.com/matomo-org/device-detector/blob/master/regexes/bots.yml

const UA_BOTS = [
  {
    regex: "WireReaderBot(?:/([\\d+.]+))?",
    name: "WireReaderBot",
  },
  {
    regex: "monitoring360bot",
    name: "360 Monitoring",
  },
  {
    regex: "Cloudflare-Healthchecks",
    name: "Cloudflare Health Checks",
  },
  {
    regex: "360Spider",
    name: "360Spider",
  },
  {
    regex: "Aboundex",
    name: "Aboundexbot",
  },
  {
    regex: "AcoonBot",
    name: "Acoon",
  },
  {
    regex: "AddThis\\.com",
    name: "AddThis.com",
  },
  {
    regex: "AhrefsBot",
    name: "aHrefs Bot",
  },
  {
    regex: "AhrefsSiteAudit/[\\d.]+",
    name: "AhrefsSiteAudit",
  },
  {
    regex: "ia_archiver|alexabot|verifybot",
    name: "Alexa Crawler",
  },
  {
    regex: "alexa site audit",
    name: "Alexa Site Audit",
  },
  {
    regex: "Amazonbot/[\\d.]+",
    name: "Amazon Bot",
  },
  {
    regex: "AmazonAdBot/[\\d.]+",
    name: "Amazon AdBot",
  },
  {
    regex: "Amazon[ -]Route ?53[ -]Health[ -]Check[ -]Service",
    name: "Amazon Route53 Health Check",
  },
  {
    regex: "AmorankSpider",
    name: "Amorank Spider",
  },
  {
    regex: "ApacheBench",
    name: "ApacheBench",
  },
  {
    regex: "Applebot",
    name: "Applebot",
  },
  {
    regex: "iTMS",
    name: "iTMS",
  },
  {
    regex: "AppSignalBot",
    name: "AppSignalBot",
  },
  {
    regex: "Arachni",
    name: "Arachni",
  },
  {
    regex: "AspiegelBot",
    name: "AspiegelBot",
  },
  {
    regex: "Castro 2, Episode Duration Lookup",
    name: "Castro 2",
  },
  {
    regex: "Curious George",
    name: "Analytics SEO Crawler",
  },
  {
    regex: "archive\\.org_bot|special_archiver",
    name: "archive.org bot",
  },
  {
    regex: "Ask Jeeves/Teoma",
    name: "Ask Jeeves",
  },
  {
    regex: "Backlink-Check\\.de",
    name: "Backlink-Check.de",
  },
  {
    regex: "BacklinkCrawler",
    name: "BacklinkCrawler",
  },
  {
    regex: "Baidu.*spider|baidu Transcoder",
    name: "Baidu Spider",
  },
  {
    regex: "BazQux",
    name: "BazQux Reader",
  },
  {
    regex: "Better Uptime Bot",
    name: "Better Uptime Bot",
  },
  {
    regex:
      "MSNBot|msrbot|bingbot|bingadsbot|BingPreview|msnbot-(UDiscovery|NewsBlogs)|adidxbot",
    name: "BingBot",
  },
  {
    regex: "Blackbox Exporter",
    name: "Blackbox Exporter",
  },
  {
    regex: "Blekkobot",
    name: "Blekkobot",
  },
  {
    regex: "BLEXBot",
    name: "BLEXBot Crawler",
  },
  {
    regex: "Bloglovin",
    name: "Bloglovin",
  },
  {
    regex: "Blogtrottr",
    name: "Blogtrottr",
  },
  {
    regex: "BoardReader Blog Indexer",
    name: "BoardReader Blog Indexer",
  },
  {
    regex: "BountiiBot",
    name: "Bountii Bot",
  },
  {
    regex: "Browsershots",
    name: "Browsershots",
  },
  {
    regex: "BUbiNG",
    name: "BUbiNG",
  },
  {
    regex: "(?<!HTC)[ _]Butterfly/",
    name: "Butterfly Robot",
  },
  {
    regex: "CareerBot",
    name: "CareerBot",
  },
  {
    regex: "CCBot",
    name: "ccBot crawler",
  },
  {
    regex: "Cliqzbot",
    name: "Cliqzbot",
  },
  {
    regex: "Cloudflare-AMP",
    name: "CloudFlare AMP Fetcher",
  },
  {
    regex: "Cloudflare-?Diagnostics",
    name: "Cloudflare Diagnostics",
  },
  {
    regex: "CloudFlare-AlwaysOnline",
    name: "CloudFlare Always Online",
  },
  {
    regex: "Cloudflare-SSLDetector",
    name: "Cloudflare SSL Detector",
  },
  {
    regex: "Cloudflare Custom Hostname Verification",
    name: "Cloudflare Custom Hostname Verification",
  },
  {
    regex: "Cloudflare-Traffic-Manager",
    name: "Cloudflare Traffic Manager",
  },
  {
    regex: "Cloudflare-Smart-Transit",
    name: "Cloudflare Smart Transit",
  },
  {
    regex: "CloudflareObservatory",
    name: "Cloudflare Observatory",
  },
  {
    regex: "https://developers\\.cloudflare\\.com/security-center/",
    name: "Cloudflare Security Insights",
  },
  {
    regex: "coccoc\\.com",
    name: "Cốc Cốc Bot",
  },
  {
    regex: "collectd",
    name: "Collectd",
  },
  {
    regex: "CommaFeed",
    name: "CommaFeed",
  },
  {
    regex: "CSS Certificate Spider",
    name: "CSS Certificate Spider",
  },
  {
    regex: "Datadog Agent|Datadog/?Synthetics",
    name: "Datadog Agent",
  },
  {
    regex: "Datanyze",
    name: "Datanyze",
  },
  {
    regex: "Dataprovider",
    name: "Dataprovider",
  },
  {
    regex: "Daum(?!(?:Apps|Device))",
    name: "Daum",
  },
  {
    regex: "Dazoobot",
    name: "Dazoobot",
  },
  {
    regex: "discobot",
    name: "Discobot",
  },
  {
    regex: "Domain Re-Animator Bot|support@domainreanimator\\.com",
    name: "Domain Re-Animator Bot",
  },
  {
    regex: "DotBot",
    name: "DotBot",
  },
  {
    regex: "DuckDuck(?:Go-Favicons-)?Bot",
    name: "DuckDuckBot",
  },
  {
    regex: "DuckAssistBot",
    name: "DuckAssistBot",
  },
  {
    regex: "EasouSpider",
    name: "Easou Spider",
  },
  {
    regex: "eCairn-Grabber",
    name: "eCairn-Grabber",
  },
  {
    regex: "EMail Exractor",
    name: "EMail Exractor",
  },
  {
    regex: "evc-batch",
    name: "evc-batch",
  },
  {
    regex: "Exabot|ExaleadCloudview",
    name: "ExaBot",
  },
  {
    regex: "ExactSeek Crawler",
    name: "ExactSeek Crawler",
  },
  {
    regex: "Ezooms",
    name: "Ezooms",
  },
  {
    regex: "facebook(?:catalog|externalhit|externalua|platform|scraper)",
    name: "Facebook Crawler",
  },
  {
    regex: "meta-externalagent",
    name: "Meta-ExternalAgent",
  },
  {
    regex: "meta-externalfetcher",
    name: "Meta-ExternalFetcher",
  },
  {
    regex: "FacebookBot/[\\d.]+",
    name: "FacebookBot",
  },
  {
    regex: "Feedbin",
    name: "Feedbin",
  },
  {
    regex: "FeedBurner",
    name: "FeedBurner",
  },
  {
    regex: "Feed Wrangler",
    name: "Feed Wrangler",
  },
  {
    regex: "Feedly",
    name: "Feedly",
  },
  {
    regex: "Feedspot",
    name: "Feedspot",
  },
  {
    regex: "Fever/[0-9]",
    name: "Fever",
  },
  {
    regex: "FlipboardProxy|FlipboardRSS",
    name: "Flipboard",
  },
  {
    regex: "Findxbot",
    name: "Findxbot",
  },
  {
    regex: "FreshRSS",
    name: "FreshRSS",
  },
  {
    regex: "Genieo",
    name: "Genieo Web filter",
  },
  {
    regex: "GigablastOpenSource",
    name: "Gigablast",
  },
  {
    regex: "Gluten Free Crawler",
    name: "Gluten Free Crawler",
  },
  {
    regex: "gobuster",
    name: "Gobuster",
  },
  {
    regex: "ichiro/mobile goo",
    name: "Goo",
  },
  {
    regex: "Storebot-Google",
    name: "Google StoreBot",
  },
  {
    regex: "Google Favicon",
    name: "Google Favicon",
  },
  {
    regex: "Google Search Console",
    name: "Google Search Console",
  },
  {
    regex: "Google Page Speed Insights",
    name: "Google PageSpeed Insights",
  },
  {
    regex: "google_partner_monitoring",
    name: "Google Partner Monitoring",
  },
  {
    regex: "Google-Cloud-Scheduler",
    name: "Google Cloud Scheduler",
  },
  {
    regex: "Google-Structured-Data-Testing-Tool",
    name: "Google Structured Data Testing Tool",
  },
  {
    regex: "GoogleStackdriverMonitoring",
    name: "Google Stackdriver Monitoring",
  },
  {
    regex: "Google-Transparency-Report",
    name: "Google Transparency Report",
  },
  {
    regex: "Google-CloudVertexBot",
    name: "Google-CloudVertexBot",
  },
  {
    regex: "via ggpht\\.com GoogleImageProxy",
    name: "Gmail Image Proxy",
  },
  {
    regex: "Google-Document-Conversion",
    name: "Google-Document-Conversion",
  },
  {
    regex: "GoogleDocs; apps-spreadsheets",
    name: "Google Sheets",
  },
  {
    regex: "GoogleDocs; apps-presentations",
    name: "Google Slides",
  },
  {
    regex: "GoogleDocs;",
    name: "Google Docs",
  },
  {
    regex: "SeznamEmailProxy",
    name: "Seznam Email Proxy",
  },
  {
    regex: "Seznam-Zbozi-robot",
    name: "Seznam Zbozi.cz",
  },
  {
    regex: "Heurekabot-Feed",
    name: "Heureka Feed",
  },
  {
    regex: "ShopAlike",
    name: "ShopAlike",
  },
  {
    regex: "deepcrawl\\.com",
    name: "Lumar",
  },
  {
    regex: "Googlebot-News",
    name: "Googlebot News",
  },
  {
    regex:
      "Adwords-(?:DisplayAds|Express|Instant)|Google Web Preview|Google[ -]Publisher[ -]Plugin|Google-(?:adstxt|Ads-Conversions|Ads-Qualify|Adwords|AMPHTML|Assess|Extended|HotelAdsVerifier|InspectionTool|Lens|PageRenderer|Read-Aloud|Shopping-Quality|Site-Verification|Sites-Thumbnails|speakr|Stale-Content-Probe|Test|Youtube-Links)|(?:AdsBot|APIs|Feedfetcher|Mediapartners)-Google(?:-Mobile)?|Google(?:AdSenseInfeed|AssociationService|bot|Other|Prober|Producer|Sites)|Google.*/\\+/web/snippet",
    name: "Googlebot",
  },
  {
    regex: "^Google$",
    name: "Googlebot",
  },
  {
    regex: "Google-Safety",
    name: "Google-Safety",
  },
  {
    regex: "DuplexWeb-Google",
    name: "DuplexWeb-Google",
  },
  {
    regex: "Google-Area120-PrivacyPolicyFetcher",
    name: "Google Area 120 Privacy Policy Fetcher",
  },
  {
    regex: "HubSpot ",
    name: "HubSpot",
  },
  {
    regex: "vuhuv(?:Bot|RBT)",
    name: "vuhuvBot",
  },
  {
    regex: "HTTPMon/[\\d.]+",
    name: "HTTPMon",
  },
  {
    regex: "ICC-Crawler",
    name: "ICC-Crawler",
  },
  {
    regex: "inoreader\\.com",
    name: "inoreader",
  },
  {
    regex: "iisbot",
    name: "IIS Site Analysis",
  },
  {
    regex: "ips-agent",
    name: "IPS Agent",
  },
  {
    regex: "IP-Guide\\.com",
    name: "IP-Guide Crawler",
  },
  {
    regex: "k6/[0-9.]+",
    name: "K6",
  },
  {
    regex: "kouio",
    name: "Kouio",
  },
  {
    regex: "larbin",
    name: "Larbin web crawler",
  },
  {
    regex: "[A-z0-9]*-Lighthouse",
    name: "Lighthouse",
  },
  {
    regex: "last-modified\\.com",
    name: "LastMod Bot",
  },
  {
    regex: "linkdexbot|linkdex\\.com",
    name: "Linkdex Bot",
  },
  {
    regex: "LinkedInBot",
    name: "LinkedIn Bot",
  },
  {
    regex: "ltx71",
    name: "LTX71",
  },
  {
    regex: "Mail\\.RU",
    name: "Mail.Ru Bot",
  },
  {
    regex: "magpie-crawler",
    name: "Magpie-Crawler",
  },
  {
    regex: "MagpieRSS",
    name: "MagpieRSS",
  },
  {
    regex: "masscan-ng/[\\d.]+",
    name: "masscan-ng",
  },
  {
    regex: ".*masscan",
    name: "masscan",
  },
  {
    regex: "Mastodon/",
    name: "Mastodon Bot",
  },
  {
    regex: "meanpathbot",
    name: "Meanpath Bot",
  },
  {
    regex: "MetaJobBot",
    name: "MetaJobBot",
  },
  {
    regex: "MetaInspector",
    name: "MetaInspector",
  },
  {
    regex: "MixrankBot",
    name: "Mixrank Bot",
  },
  {
    regex: "MJ12bot",
    name: "MJ12 Bot",
  },
  {
    regex: "Mnogosearch",
    name: "Mnogosearch",
  },
  {
    regex: "MojeekBot",
    name: "MojeekBot",
  },
  {
    regex: "munin",
    name: "Munin",
  },
  {
    regex: "NalezenCzBot",
    name: "NalezenCzBot",
  },
  {
    regex: "check_http/v",
    name: "Nagios check_http",
  },
  {
    regex: "nbertaupete95\\(at\\)gmail\\.com",
    name: "nbertaupete95",
  },
  {
    regex: "Netcraft(?: Web Server Survey| SSL Server Survey|SurveyAgent)",
    name: "Netcraft Survey Bot",
  },
  {
    regex: "netEstate NE Crawler",
    name: "netEstate",
  },
  {
    regex: "Netvibes",
    name: "Netvibes",
  },
  {
    regex: "NewsBlur .*(?:Fetcher|Finder)",
    name: "NewsBlur",
  },
  {
    regex: "NewsGatorOnline",
    name: "NewsGator",
  },
  {
    regex: "nlcrawler",
    name: "NLCrawler",
  },
  {
    regex: "Nmap Scripting Engine",
    name: "Nmap",
  },
  {
    regex: "Nuzzel",
    name: "Nuzzel",
  },
  {
    regex: "NodePing",
    name: "NodePing",
  },
  {
    regex: "Octopus [0-9]",
    name: "Octopus",
  },
  {
    regex: "OnlineOrNot\\.com_bot",
    name: "OnlineOrNot Bot",
  },
  {
    regex: "omgili",
    name: "Omgili bot",
  },
  {
    regex: "OpenindexSpider",
    name: "Openindex Spider",
  },
  {
    regex: "spbot",
    name: "OpenLinkProfiler",
  },
  {
    regex: "OpenWebSpider",
    name: "OpenWebSpider",
  },
  {
    regex: "OrangeBot|VoilaBot",
    name: "Orange Bot",
  },
  {
    regex: "PaperLiBot",
    name: "PaperLiBot",
  },
  {
    regex: "phantomas/",
    name: "Phantomas",
  },
  {
    regex: "phpservermon",
    name: "PHP Server Monitor",
  },
  {
    regex: "Pocket(?:ImageCache|Parser)/[\\d.]+",
    name: "Pocket",
  },
  {
    regex: "PritTorrent",
    name: "PritTorrent",
  },
  {
    regex: "PRTG Network Monitor",
    name: "PRTG Network Monitor",
  },
  {
    regex: "psbot",
    name: "Picsearch bot",
  },
  {
    regex: "Pingdom(?:\\.com|TMS)",
    name: "Pingdom Bot",
  },
  {
    regex: "Quora Link Preview",
    name: "Quora Link Preview",
  },
  {
    regex: "Quora-Bot",
    name: "Quora Bot",
  },
  {
    regex: "RamblerMail",
    name: "RamblerMail Image Proxy",
  },
  {
    regex: "QuerySeekerSpider",
    name: "QuerySeekerSpider",
  },
  {
    regex: "Qwantify|Qwantbot",
    name: "Qwantbot",
  },
  {
    regex: "Rainmeter",
    name: "Rainmeter",
  },
  {
    regex: "redditbot",
    name: "Reddit Bot",
  },
  {
    regex: "Riddler",
    name: "Riddler",
  },
  {
    regex: "rogerbot",
    name: "Rogerbot",
  },
  {
    regex: "ROI Hunter",
    name: "ROI Hunter",
  },
  {
    regex: "SafeDNSBot",
    name: "SafeDNSBot",
  },
  {
    regex: "Scrapy",
    name: "Scrapy",
  },
  {
    regex: "Screaming Frog SEO Spider",
    name: "Screaming Frog SEO Spider",
  },
  {
    regex: "ScreenerBot",
    name: "ScreenerBot",
  },
  {
    regex: "SemrushBot",
    name: "SemrushBot",
  },
  {
    regex: "SerpReputationManagementAgent/[\\d.]+",
    name: "Semrush Reputation Management",
  },
  {
    regex: "SplitSignalBot",
    name: "SplitSignalBot",
  },
  {
    regex: "SiteAuditBot/[\\d.]+",
    name: "SiteAuditBot",
  },
  {
    regex: "SensikaBot",
    name: "Sensika Bot",
  },
  {
    regex: "SEOENG(?:World)?Bot",
    name: "SEOENGBot",
  },
  {
    regex: "SEOkicks-Robot",
    name: "SEOkicks-Robot",
  },
  {
    regex: "seoscanners\\.net",
    name: "Seoscanners.net",
  },
  {
    regex: "SkypeUriPreview",
    name: "Skype URI Preview",
  },
  {
    regex: "SeznamBot|SklikBot|Seznam screenshot-generator",
    name: "Seznam Bot",
  },
  {
    regex: "shopify-partner-homepage-scraper",
    name: "Shopify Partner",
  },
  {
    regex: "ShopWiki",
    name: "ShopWiki",
  },
  {
    regex: "SilverReader",
    name: "SilverReader",
  },
  {
    regex: "SimplePie",
    name: "SimplePie",
  },
  {
    regex: "SISTRIX Crawler",
    name: "SISTRIX Crawler",
  },
  {
    regex: "compatible; (?:SISTRIX )?Optimizer",
    name: "SISTRIX Optimizer",
  },
  {
    regex: "SiteSucker",
    name: "SiteSucker",
  },
  {
    regex: "sixy\\.ch",
    name: "Sixy.ch",
  },
  {
    regex: "Slackbot|Slack-ImgProxy",
    name: "Slackbot",
  },
  {
    regex:
      "Sogou[ -](?:head|inst|Orion|Pic|Test|web)[ -]spider|New-Sogou-Spider",
    name: "Sogou Spider",
  },
  {
    regex: "Sosospider|Sosoimagespider",
    name: "Soso Spider",
  },
  {
    regex: "Sprinklr",
    name: "Sprinklr",
  },
  {
    regex: "sqlmap/",
    name: "sqlmap",
  },
  {
    regex: "SSL Labs",
    name: "SSL Labs",
  },
  {
    regex: "StatusCake",
    name: "StatusCake",
  },
  {
    regex: "Superfeedr bot",
    name: "Superfeedr Bot",
  },
  {
    regex: "Sparkler/[0-9]",
    name: "Sparkler",
  },
  {
    regex: "Spinn3r",
    name: "Spinn3r",
  },
  {
    regex: "SputnikBot",
    name: "Sputnik Bot",
  },
  {
    regex: "SputnikFaviconBot",
    name: "Sputnik Favicon Bot",
  },
  {
    regex: "SputnikImageBot",
    name: "Sputnik Image Bot",
  },
  {
    regex: "SurveyBot",
    name: "Survey Bot",
  },
  {
    regex: "TarmotGezgin",
    name: "Tarmot Gezgin",
  },
  {
    regex: "TelegramBot",
    name: "TelegramBot",
  },
  {
    regex: "TLSProbe",
    name: "TLSProbe",
  },
  {
    regex: "TinEye-bot",
    name: "TinEye Crawler",
  },
  {
    regex: "Tiny Tiny RSS",
    name: "Tiny Tiny RSS",
  },
  {
    regex: "theoldreader\\.com",
    name: "theoldreader",
  },
  {
    regex: "Trackable/0\\.1",
    name: "Chartable",
  },
  {
    regex: "trendictionbot",
    name: "Trendiction Bot",
  },
  {
    regex: "TurnitinBot",
    name: "TurnitinBot",
  },
  {
    regex: "TweetedTimes",
    name: "TweetedTimes Bot",
  },
  {
    regex: "TweetmemeBot",
    name: "Tweetmeme Bot",
  },
  {
    regex: "Twingly Recon",
    name: "Twingly Recon",
  },
  {
    regex: "Twitterbot",
    name: "Twitterbot",
  },
  {
    regex: "UniversalFeedParser",
    name: "UniversalFeedParser",
  },
  {
    regex: "via secureurl\\.fwdcdn\\.com",
    name: "UkrNet Mail Proxy",
  },
  {
    regex: "Uptime(?:bot)?/[\\d.]+",
    name: "Uptimebot",
  },
  {
    regex: "UptimeRobot",
    name: "UptimeRobot",
  },
  {
    regex: "URLAppendBot",
    name: "URLAppendBot",
  },
  {
    regex: "Vagabondo",
    name: "Vagabondo",
  },
  {
    regex: "vkShare; ",
    name: "VK Share Button",
  },
  {
    regex: "VKRobot",
    name: "VK Robot",
  },
  {
    regex: "VSMCrawler",
    name: "Visual Site Mapper Crawler",
  },
  {
    regex: "Jigsaw",
    name: "W3C CSS Validator",
  },
  {
    regex: "W3C_I18n-Checker",
    name: "W3C I18N Checker",
  },
  {
    regex: "W3C-checklink",
    name: "W3C Link Checker",
  },
  {
    regex: "W3C_Validator|Validator\\.nu",
    name: "W3C Markup Validation Service",
  },
  {
    regex: "W3C-mobileOK",
    name: "W3C MobileOK Checker",
  },
  {
    regex: "W3C_Unicorn",
    name: "W3C Unified Validator",
  },
  {
    regex: "P3P Validator",
    name: "W3C P3P Validator",
  },
  {
    regex: "Wappalyzer",
    name: "Wappalyzer",
  },
  {
    regex: "PTST/",
    name: "WebPageTest",
  },
  {
    regex: "WeSEE",
    name: "WeSEE:Search",
  },
  {
    regex: "WebbCrawler",
    name: "WebbCrawler",
  },
  {
    regex: "websitepulse[+ ]checker",
    name: "WebSitePulse",
  },
  {
    regex: "WordPress.+isitwp\\.com",
    name: "IsItWP",
  },
  {
    regex: "Automattic Analytics Crawler/[\\d.]+",
    name: "Automattic Analytics",
  },
  {
    regex: "WordPress\\.com mShots",
    name: "WordPress.com mShots",
  },
  {
    regex: "wp\\.com feedbot",
    name: "wp.com feedbot",
  },
  {
    regex: "WordPress",
    name: "WordPress",
  },
  {
    regex: "Wotbox",
    name: "Wotbox",
  },
  {
    regex: "XenForo",
    name: "XenForo",
  },
  {
    regex: "yacybot",
    name: "YaCy",
  },
  {
    regex: "Yahoo! Slurp|Yahoo!-AdCrawler",
    name: "Yahoo! Slurp",
  },
  {
    regex: "Yahoo Link Preview|Yahoo:LinkExpander:Slingstone",
    name: "Yahoo! Link Preview",
  },
  {
    regex: "YahooMailProxy",
    name: "Yahoo! Mail Proxy",
  },
  {
    regex: "YahooCacheSystem",
    name: "Yahoo! Cache System",
  },
  {
    regex: "Y!J-BRW",
    name: "Yahoo! Japan BRW",
  },
  {
    regex: "Y!J-WSC",
    name: "Yahoo! Japan WSC",
  },
  {
    regex: "Y!J-ASR",
    name: "Yahoo! Japan ASR",
  },
  {
    regex: "^Y!J",
    name: "Yahoo! Japan",
  },
  {
    regex:
      "Yandex(?:(?:\\.Gazeta |Accessibility|Mobile|MobileScreenShot|RenderResources|Screenshot|Sprav)?Bot|(?:AdNet|Antivirus|Blogs|Calendar|Catalog|Direct|Favicons|ForDomain|ImageResizer|Images|Market|Media|Metrika|News|OntoDB(?:API)?|Pagechecker|Partner|RCA|SearchShop|(?:News|Site)links|Tracker|Turbo|Userproxy|Verticals|Vertis|Video|Webmaster))|YaDirectFetcher",
    name: "Yandex Bot",
  },
  {
    regex: "Yeti|NaverJapan|AdsBot-Naver",
    name: "Yeti/Naverbot",
  },
  {
    regex: "YoudaoBot",
    name: "Youdao Bot",
  },
  {
    regex: "YOURLS v[0-9]",
    name: "Yourls",
  },
  {
    regex: "YRSpider|YYSpider",
    name: "Yunyun Bot",
  },
  {
    regex: "zgrab",
    name: "zgrab",
  },
  {
    regex: "Zookabot",
    name: "Zookabot",
  },
  {
    regex: "ZumBot",
    name: "ZumBot",
  },
  {
    regex: "YottaaMonitor",
    name: "Yottaa Site Monitor",
  },
  {
    regex: "Yahoo Ad monitoring.*yahoo-ad-monitoring-SLN24857",
    name: "Yahoo Gemini",
  },
  {
    regex: ".*Java.*outbrain",
    name: "Outbrain",
  },
  {
    regex: "HubPages.*crawlingpolicy",
    name: "HubPages",
  },
  {
    regex: "Pinterest(?:bot)?/[\\d.]+.*www\\.pinterest\\.com",
    name: "Pinterest",
  },
  {
    regex: ".*Site24x7",
    name: "Site24x7 Website Monitoring",
  },
  {
    regex: ".* HLB/[\\d.]+",
    name: "Site24x7 Defacement Monitor",
  },
  {
    regex: "s~snapchat-proxy",
    name: "Snapchat Proxy",
  },
  {
    regex: "Snap URL Preview Service",
    name: "Snap URL Preview Service",
  },
  {
    regex: "SnapchatAds/[\\d.]+",
    name: "Snapchat Ads",
  },
  {
    regex: "Let's Encrypt validation server",
    name: "Let's Encrypt Validation",
  },
  {
    regex: "GrapeshotCrawler",
    name: "Grapeshot",
  },
  {
    regex: "www\\.monitor\\.us",
    name: "Monitor.Us",
  },
  {
    regex: "Catchpoint",
    name: "Catchpoint",
  },
  {
    regex: "bitlybot",
    name: "BitlyBot",
  },
  {
    regex: "Zao/",
    name: "Zao",
  },
  {
    regex: "lycos",
    name: "Lycos",
  },
  {
    regex: "Slurp",
    name: "Inktomi Slurp",
  },
  {
    regex: "Speedy Spider",
    name: "Speedy",
  },
  {
    regex: "ScoutJet",
    name: "ScoutJet",
  },
  {
    regex: "nrsbot|netresearch",
    name: "NetResearchServer",
  },
  {
    regex: "scooter",
    name: "Scooter",
  },
  {
    regex: "gigabot",
    name: "Gigabot",
  },
  {
    regex: "charlotte",
    name: "Charlotte",
  },
  {
    regex: "Pompos",
    name: "Pompos",
  },
  {
    regex: "ichiro",
    name: "ichiro",
  },
  {
    regex: "PagePeeker",
    name: "PagePeeker",
  },
  {
    regex: "WebThumbnail",
    name: "WebThumbnail",
  },
  {
    regex: "Willow Internet Crawler",
    name: "Willow Internet Crawler",
  },
  {
    regex: "EmailWolf",
    name: "EmailWolf",
  },
  {
    regex: "NetLyzer FastProbe",
    name: "NetLyzer FastProbe",
  },
  {
    regex: "AdMantX.*admantx\\.com",
    name: "ADMantX",
  },
  {
    regex: "Server Density Service Monitoring",
    name: "Server Density",
  },
  {
    regex: "RSSRadio \\(Push Notification Scanner;support@dorada\\.co\\.uk\\)",
    name: "RSSRadio Bot",
  },
  {
    regex: "^sentry",
    name: "Sentry Bot",
  },
  {
    regex: "^Spotify/[\\d.]+$",
    name: "Spotify",
  },
  {
    regex: "The Knowledge AI",
    name: "The Knowledge AI",
  },
  {
    regex: "Embedly",
    name: "Embedly",
  },
  {
    regex: "BrandVerity",
    name: "BrandVerity",
  },
  {
    regex: "Kaspersky Lab CFR link resolver",
    name: "Kaspersky",
  },
  {
    regex: "eZ Publish Link Validator",
    name: "eZ Publish Link Validator",
  },
  {
    regex: "woorankreview",
    name: "WooRank",
  },
  {
    regex: "by Siteimprove\\.com",
    name: "Siteimprove",
  },
  {
    regex: "CATExplorador",
    name: "CATExplorador",
  },
  {
    regex: "Buck",
    name: "Buck",
  },
  {
    regex: "tracemyfile",
    name: "TraceMyFile",
  },
  {
    regex: "zelist\\.ro feed parser",
    name: "Ze List",
  },
  {
    regex: "weborama-fetcher",
    name: "Weborama",
  },
  {
    regex: "BoardReader Favicon Fetcher",
    name: "BoardReader",
  },
  {
    regex: "IDG/IT",
    name: "IDG/IT",
  },
  {
    regex: "Bytespider",
    name: "Bytespider",
  },
  {
    regex: "WikiDo",
    name: "WikiDo",
  },
  {
    regex: "Awario(?:Smart)?Bot",
    name: "Awario",
  },
  {
    regex: "AwarioRssBot",
    name: "Awario",
  },
  {
    regex: "oBot",
    name: "oBot",
  },
  {
    regex: "SMTBot",
    name: "SMTBot",
  },
  {
    regex: "LCC",
    name: "LCC",
  },
  {
    regex: "Startpagina-Linkchecker",
    name: "Startpagina Linkchecker",
  },
  {
    regex: "MoodleBot-Linkchecker",
    name: "MoodleBot Linkchecker",
  },
  {
    regex: "GTmetrix",
    name: "GTmetrix",
  },
  {
    regex: "CyberFind ?Crawler",
    name: "CyberFind Crawler",
  },
  {
    regex: "Nutch",
    name: "Nutch-based Bot",
  },
  {
    regex: "Seobility",
    name: "Seobility",
  },
  {
    regex: "Vercelbot",
    name: "Vercel Bot",
  },
  {
    regex: "Grammarly",
    name: "Grammarly",
  },
  {
    regex: "Robozilla",
    name: "Robozilla",
  },
  {
    regex: "Domains Project",
    name: "Domains Project",
  },
  {
    regex: "PetalBot",
    name: "Petal Bot",
  },
  {
    regex: "SerendeputyBot",
    name: "Serendeputy Bot",
  },
  {
    regex:
      "ias-(?:va|sg).*admantx.*service-fetcher|admantx\\.com.*service-fetcher",
    name: "ADmantX Service Fetcher",
  },
  {
    regex: "SemanticScholarBot",
    name: "Semantic Scholar Bot",
  },
  {
    regex: "VelenPublicWebCrawler",
    name: "Velen Public Web Crawler",
  },
  {
    regex: "Barkrowler",
    name: "Barkrowler",
  },
  {
    regex: "BDCbot",
    name: "BDCbot",
  },
  {
    regex: "adbeat",
    name: "Adbeat",
  },
  {
    regex: "(?:BuiltWith|BW)/[\\d.]+",
    name: "BuiltWith",
  },
  {
    regex: "https://whatis\\.contentkingapp\\.com",
    name: "ContentKing",
  },
  {
    regex: "MicroAdBot",
    name: "MicroAdBot",
  },
  {
    regex: "PingAdmin\\.Ru",
    name: "PingAdmin.Ru",
  },
  {
    regex: "notifyninja.+monitoring",
    name: "Notify Ninja",
  },
  {
    regex: "WebDataStats",
    name: "WebDataStats",
  },
  {
    regex: "parse\\.ly scraper",
    name: "parse.ly",
  },
  {
    regex: "Nimbostratus-Bot",
    name: "Nimbostratus Bot",
  },
  {
    regex: "HeartRails_Capture/[\\d.]+",
    name: "Heart Rails Capture",
  },
  {
    regex: "Project-Resonance",
    name: "Project Resonance",
  },
  {
    regex: "DataXu/[\\d.]+",
    name: "DataXu",
  },
  {
    regex: "Cocolyzebot",
    name: "Cocolyzebot",
  },
  {
    regex: "veryhip",
    name: "VeryHip",
  },
  {
    regex: "LinkpadBot",
    name: "LinkpadBot",
  },
  {
    regex: "MuscatFerret",
    name: "MuscatFerret",
  },
  {
    regex: "PageThing\\.com",
    name: "PageThing",
  },
  {
    regex: "ArchiveBox",
    name: "ArchiveBox",
  },
  {
    regex: "Choosito",
    name: "Choosito",
  },
  {
    regex: "datagnionbot",
    name: "datagnionbot",
  },
  {
    regex: "WhatCMS",
    name: "WhatCMS",
  },
  {
    regex: "httpx",
    name: "httpx",
  },
  {
    regex: ".*\\.oast\\.",
    name: "Interactsh",
  },
  {
    regex: "scaninfo@(?:expanseinc|paloaltonetworks)\\.com",
    name: "Expanse",
  },
  {
    regex: "HuaweiWebCatBot",
    name: "HuaweiWebCatBot",
  },
  {
    regex: "Hatena-Favicon",
    name: "Hatena Favicon",
  },
  {
    regex: "Hatena-?Bookmark",
    name: "Hatena Bookmark",
  },
  {
    regex: "RyowlEngine/[\\d.]+",
    name: "Ryowl",
  },
  {
    regex: "OdklBot/[\\d.]+",
    name: "Odnoklassniki Bot",
  },
  {
    regex: "Mediatoolkitbot",
    name: "Mediatoolkit Bot",
  },
  {
    regex: "ZoominfoBot",
    name: "ZoominfoBot",
  },
  {
    regex: "WeViKaBot/[\\d.]+",
    name: "WeViKaBot",
  },
  {
    regex: "SEOkicks",
    name: "SEOkicks",
  },
  {
    regex: "Plukkie/[\\d.]+",
    name: "Plukkie",
  },
  {
    regex: "proximic;",
    name: "Comscore",
  },
  {
    regex: "SurdotlyBot/[\\d.]+",
    name: "SurdotlyBot",
  },
  {
    regex: "Gowikibot/[\\d.]+",
    name: "Gowikibot",
  },
  {
    regex: "SabsimBot/[\\d.]+",
    name: "SabsimBot",
  },
  {
    regex: "LumtelBot/[\\d.]+",
    name: "LumtelBot",
  },
  {
    regex: "PiplBot",
    name: "PiplBot",
  },
  {
    regex: "woobot/[\\d.]+",
    name: "WooRank",
  },
  {
    regex: "Cookiebot/[\\d.]+",
    name: "Cookiebot",
  },
  {
    regex: "NetSystemsResearch",
    name: "NetSystemsResearch",
  },
  {
    regex: "CensysInspect/[\\d.]+",
    name: "CensysInspect",
  },
  {
    regex: "gdnplus\\.com",
    name: "GDNP",
  },
  {
    regex: "WellKnownBot/[\\d.]+",
    name: "WellKnownBot",
  },
  {
    regex: "Adsbot/[\\d.]+",
    name: "Adsbot",
  },
  {
    regex: "MTRobot/[\\d.]+",
    name: "MTRobot",
  },
  {
    regex: "serpstatbot/[\\d.]+",
    name: "serpstatbot",
  },
  {
    regex: "colly",
    name: "colly",
  },
  {
    regex: "l9tcpid/v[\\d.]+",
    name: "l9tcpid",
  },
  {
    regex: "l9explore/[\\d.]+",
    name: "l9explore",
  },
  {
    regex: "l9scan/|^Lkx-.*/[\\d.]+",
    name: "LeakIX",
  },
  {
    regex: "MegaIndex\\.ru/[\\d.]+",
    name: "MegaIndex",
  },
  {
    regex: "Seekport",
    name: "Seekport",
  },
  {
    regex: "seolyt/[\\d.]+",
    name: "seolyt",
  },
  {
    regex: "YaK/[\\d.]+",
    name: "YaK",
  },
  {
    regex: "KomodiaBot/[\\d.]+",
    name: "KomodiaBot",
  },
  {
    regex: "KStandBot/[\\d.]+",
    name: "KStandBot",
  },
  {
    regex: "Neevabot/[\\d.]+",
    name: "Neevabot",
  },
  {
    regex: "LinkPreview/[\\d.]+",
    name: "LinkPreview",
  },
  {
    regex: "JungleKeyThumbnail/[\\d.]+",
    name: "JungleKeyThumbnail",
  },
  {
    regex: "rocketmonitor(?: |bot/)[\\d.]+",
    name: "RocketMonitorBot",
  },
  {
    regex: "SitemapParser-VIPnytt/[\\d.]+",
    name: "SitemapParser-VIPnytt",
  },
  {
    regex: "^Turnitin",
    name: "Turnitin",
  },
  {
    regex: "DMBrowser/[\\d.]+|DMBrowser-[UB]V",
    name: "Dotcom Monitor",
  },
  {
    regex: "ThinkChaos/",
    name: "ThinkChaos",
  },
  {
    regex: "DataForSeoBot",
    name: "DataForSeoBot",
  },
  {
    regex: "Discordbot/[\\d.]+",
    name: "Discord Bot",
  },
  {
    regex: "Linespider/[\\d.]+",
    name: "Linespider",
  },
  {
    regex: "Cincraw/[\\d.]+",
    name: "Cincraw",
  },
  {
    regex: "CISPA Web Analyzer",
    name: "CISPA Web Analyzer",
  },
  {
    regex: "IonCrawl",
    name: "IONOS Crawler",
  },
  {
    regex: "Crawldad",
    name: "Crawldad",
  },
  {
    regex: "https://securitytxt-scan\\.cs\\.hm\\.edu/",
    name: "security.txt scanserver",
  },
  {
    regex: "TigerBot/[\\d.]+",
    name: "TigerBot",
  },
  {
    regex: "TestCrawler/[\\d.]+",
    name: "TestCrawler",
  },
  {
    regex: "CrowdTanglebot/[\\d.]+",
    name: "CrowdTangle",
  },
  {
    regex: "Sellers\\.Guide Crawler by Primis",
    name: "Sellers.Guide",
  },
  {
    regex: "OnalyticaBot",
    name: "Onalytica",
  },
  {
    regex: "deepnoc",
    name: "deepnoc",
  },
  {
    regex: "Newslitbot/[\\d.]+",
    name: "Newslitbot",
  },
  {
    regex: "um-(?:ANS|CC|FC|IC|LN)/[\\d.]+",
    name: "uMBot",
  },
  {
    regex: "Abonti/[\\d.]+",
    name: "Abonti",
  },
  {
    regex: "collection@infegy\\.com",
    name: "Infegy",
  },
  {
    regex: "HTTP Banner Detection \\(https://security\\.ipip\\.net\\)",
    name: "IPIP",
  },
  {
    regex: "ev-crawler/[\\d.]+",
    name: "Headline",
  },
  {
    regex: "webprosbot/[\\d.]+",
    name: "WebPros",
  },
  {
    regex: "ELB-HealthChecker",
    name: "Amazon ELB",
  },
  {
    regex: "Wheregoes\\.com Redirect Checker/[\\d.]+",
    name: "WhereGoes",
  },
  {
    regex: "project_patchwatch",
    name: "Project Patchwatch",
  },
  {
    regex: "InternetMeasurement/[\\d.]+",
    name: "InternetMeasurement",
  },
  {
    regex: "DomainAppender /[\\d.]+",
    name: "DomainAppender",
  },
  {
    regex: "FreeWebMonitoring SiteChecker/[\\d.]+",
    name: "FreeWebMonitoring",
  },
  {
    regex: "Page Modified Pinger",
    name: "Page Modified Pinger",
  },
  {
    regex: "adstxtlab\\.com",
    name: "adstxtlab.com",
  },
  {
    regex: "Iframely/[\\d.]+",
    name: "Iframely",
  },
  {
    regex: "DomainStatsBot/[\\d.]+",
    name: "DomainStatsBot",
  },
  {
    regex: "aiHitBot/[\\d.]+",
    name: "aiHitBot",
  },
  {
    regex: "DomainCrawler/",
    name: "DomainCrawler",
  },
  {
    regex: "DNSResearchBot",
    name: "DNSResearchBot",
  },
  {
    regex: "GitCrawlerBot",
    name: "GitCrawlerBot",
  },
  {
    regex: "AdAuth/[\\d.]+",
    name: "AdAuth",
  },
  {
    regex: "faveeo\\.com",
    name: "Faveeo",
  },
  {
    regex: "kozmonavt\\.",
    name: "Kozmonavt",
  },
  {
    regex: "CriteoBot/",
    name: "CriteoBot",
  },
  {
    regex: "PayPal IPN",
    name: "PayPal IPN",
  },
  {
    regex: "MaCoCu",
    name: "MaCoCu",
  },
  {
    regex: "CLASSLA",
    name: "CLASSLA-web",
  },
  {
    regex: "dnt-policy@eff\\.org",
    name: "EFF Do Not Track Verifier",
  },
  {
    regex: "InfoTigerBot",
    name: "InfoTigerBot",
  },
  {
    regex: "(?:Birdcrawlerbot|CrawlaDeBot)",
    name: "Birdcrawlerbot",
  },
  {
    regex: "ScamadviserExternalHit/[\\d.]+",
    name: "Scamadviser External Hit",
  },
  {
    regex: "ZaldamoSearchBot",
    name: "Zaldamo",
  },
  {
    regex: "AFB/[\\d.]+",
    name: "Allloadin Favicon Bot",
  },
  {
    regex: "SeolytBot/[\\d.]+",
    name: "Seolyt Bot",
  },
  {
    regex: "LinkWalker/[\\d.]+",
    name: "LinkWalker",
  },
  {
    regex: "RenovateBot/[\\d.]+",
    name: "RenovateBot",
  },
  {
    regex: "INETDEX-BOT/[\\d.]+",
    name: "Inetdex Bot",
  },
  {
    regex: "NETZZAPPEN",
    name: "NETZZAPPEN",
  },
  {
    regex: "panscient\\.com",
    name: "Panscient",
  },
  {
    regex: "research@pdrlabs\\.net",
    name: "PDR Labs",
  },
  {
    regex: "Nicecrawler/[\\d.]+",
    name: "NiceCrawler",
  },
  {
    regex: "t3versionsBot/[\\d.]+",
    name: "t3versions",
  },
  {
    regex: "Crawlson/[\\d.]+",
    name: "Crawlson",
  },
  {
    regex: "tchelebi/[\\d.]+",
    name: "tchelebi",
  },
  {
    regex: "JobboerseBot",
    name: "JobboerseBot",
  },
  {
    regex: "RepoLookoutBot/v?[\\d.]+",
    name: "Repo Lookout",
  },
  {
    regex: "PATHspider",
    name: "PATHspider",
  },
  {
    regex: "everyfeed-spider/[\\d.]+",
    name: "Everyfeed",
  },
  {
    regex: "Exchange check",
    name: "Exchange check",
  },
  {
    regex: "Sublinq",
    name: "Sublinq",
  },
  {
    regex: "Gregarius/[\\d.]+",
    name: "Gregarius",
  },
  {
    regex: "COMODO DCV",
    name: "COMODO DCV",
  },
  {
    regex: "Sectigo DCV|acme\\.sectigo\\.com",
    name: "Sectigo DCV",
  },
  {
    regex:
      "KlarnaBot-(?:DownloadProductImage|EnrichProducts|PriceWatcher)/[\\d.]+",
    name: "KlarnaBot",
  },
  {
    regex: "Taboolabot/[\\d.]+",
    name: "Taboolabot",
  },
  {
    regex: "Asana/[\\d.]+",
    name: "Asana",
  },
  {
    regex: "Chrome Privacy Preserving Prefetch Proxy",
    name: "Chrome Privacy Preserving Prefetch Proxy",
  },
  {
    regex: "URLinspectorBot/[\\d.]+",
    name: "URLinspector",
  },
  {
    regex: "EntferBot/[\\d.]+",
    name: "Entfer",
  },
  {
    regex: "TagInspector/[\\d.]+",
    name: "Tag Inspector",
  },
  {
    regex: "pageburst",
    name: "Pageburst",
  },
  {
    regex: ".+diffbot",
    name: "Diffbot",
  },
  {
    regex: "DisqusAdstxtCrawler/[\\d.]+",
    name: "Disqus",
  },
  {
    regex: "startmebot/[\\d.]+",
    name: "start.me",
  },
  {
    regex: "2ip bot/[\\d.]+",
    name: "2ip",
  },
  {
    regex: "ReqBin Curl Client/[\\d.]+",
    name: "ReqBin",
  },
  {
    regex: "XoviBot/[\\d.]+",
    name: "XoviBot",
  },
  {
    regex: "Overcast/[\\d.]+ Podcast Sync",
    name: "Overcast Podcast Sync",
  },
  {
    regex: "^Verity/[\\d.]+",
    name: "GumGum Verity",
  },
  {
    regex: "hackermention",
    name: "hackermention",
  },
  {
    regex: "BitSightBot/[\\d.]+",
    name: "BitSight",
  },
  {
    regex: "Ezgif/[\\d.]+",
    name: "Ezgif",
  },
  {
    regex: "intelx\\.io_bot",
    name: "Intelligence X",
  },
  {
    regex: "FemtosearchBot/[\\d.]+",
    name: "Femtosearch",
  },
  {
    regex: "AdsTxtCrawler/[\\d.]+",
    name: "AdsTxtCrawler",
  },
  {
    regex: "Morningscore",
    name: "Morningscore Bot",
  },
  {
    regex: "Uptime-Kuma/[\\d.]+",
    name: "Uptime-Kuma",
  },
  {
    regex: "OAI-SearchBot",
    name: "OAI-SearchBot",
  },
  {
    regex: "GPTBot/[\\d.]+",
    name: "GPTBot",
  },
  {
    regex: "ChatGPT-User",
    name: "ChatGPT-User",
  },
  {
    regex: "BrightEdge Crawler/[\\d.]+",
    name: "BrightEdge",
  },
  {
    regex: "sfFeedReader/[\\d.]+",
    name: "sfFeedReader",
  },
  {
    regex: "cyberscan\\.io",
    name: "Cyberscan",
  },
  {
    regex: "researchscan\\.comsys\\.rwth-aachen\\.de",
    name: "Research Scan",
  },
  {
    regex: "newspaper/[\\d.]+",
    name: "Scraping Robot",
  },
  {
    regex: "Ant(?:\\.com beta|Bot)(?:/([\\d+.]+))?",
    name: "Ant",
  },
  {
    regex: "WebwikiBot/[\\d.]+",
    name: "Webwiki",
  },
  {
    regex: "phpMyAdmin",
    name: "phpMyAdmin",
  },
  {
    regex: "Matomo/[\\d.]+",
    name: "Matomo",
  },
  {
    regex: "Prometheus/[\\d.]+",
    name: "Prometheus",
  },
  {
    regex: "ArchiveTeam ArchiveBot",
    name: "ArchiveBot",
  },
  {
    regex: "MADBbot/[\\d.]+",
    name: "MADBbot",
  },
  {
    regex: "MeltwaterNews",
    name: "MeltwaterNews",
  },
  {
    regex: "owler",
    name: "OWLer",
  },
  {
    regex: "bbc\\.co\\.uk/display/men/Page\\+Monitor",
    name: "BBC Page Monitor",
  },
  {
    regex: "BBC-Forge-URL-Monitor-Twisted",
    name: "BBC Forge URL Monitor",
  },
  {
    regex: "ClaudeBot",
    name: "ClaudeBot",
  },
  {
    regex: "Imagesift",
    name: "ImageSift",
  },
  {
    regex: "TactiScout",
    name: "TactiScout",
  },
  {
    regex: "Brightbot ([\\d+.]+)",
    name: "BrightBot",
  },
  {
    regex: "DaspeedBot/([\\d+.]+)",
    name: "DaspeedBot",
  },
  {
    regex: "StractBot(?:/([\\d+.]+))?",
    name: "Stract",
  },
  {
    regex: "GeedoBot(?:/([\\d+.]+))?",
    name: "GeedoBot",
  },
  {
    regex: "GeedoProductSearch",
    name: "GeedoProductSearch",
  },
  {
    regex: "BackupLand(?:/([\\d+.]+))?",
    name: "BackupLand",
  },
  {
    regex: "Konturbot(?:/([\\d+.]+))?",
    name: "Konturbot",
  },
  {
    regex: "keys-so-bot",
    name: "Keys.so",
  },
  {
    regex: "LetsearchBot(?:/([\\d+.]+))?",
    name: "LetSearch",
  },
  {
    regex: "Example3(?:/([\\d+.]+))?",
    name: "Example3",
  },
  {
    regex: "StatOnlineRuBot(?:/([\\d+.]+))?",
    name: "StatOnline.ru",
  },
  {
    regex: "Spawning-AI",
    name: "Spawning AI",
  },
  {
    regex: "domain research project",
    name: "Domain Research Project",
  },
  {
    regex: "getodin\\.com",
    name: "Odin",
  },
  {
    regex: "YouBot",
    name: "YouBot",
  },
  {
    regex: "SiteScoreBot",
    name: "SiteScore",
  },
  {
    regex: "MBCrawler",
    name: "Monitor Backlinks",
  },
  {
    regex: "mariadb-mysql-kbs-bot",
    name: "MariaDB/MySQL Knowledge Base",
  },
  {
    regex: "GitHubCopilotChat",
    name: "GitHubCopilotChat",
  },
  {
    regex: "^pdrl\\.fm",
    name: "Podroll Analyzer",
  },
  {
    regex: "PodUptime/",
    name: "PodUptime",
  },
  {
    regex: "anthropic-ai",
    name: "Anthropic AI",
  },
  {
    regex: "NetpeakCheckerBot/[\\d.]+",
    name: "Netpeak Checker",
  },
  {
    regex: "SandobaCrawler/[\\d.]+",
    name: "Sandoba//Crawler",
  },
  {
    regex: "SirdataBot",
    name: "Sirdata",
  },
  {
    regex: "CheckMarkNetwork/[\\d.]+",
    name: "CheckMark Network",
  },
  {
    regex: "cohere-ai",
    name: "Cohere AI",
  },
  {
    regex: "PerplexityBot/[\\d.]+",
    name: "PerplexityBot",
  },
  {
    regex: "TTD-Content",
    name: "The Trade Desk Content",
  },
  {
    regex: "montastic-monitor",
    name: "Montastic Monitor",
  },
  {
    regex: "Ruby, Twurly v[\\d.]+",
    name: "Twurly",
  },
  {
    regex: "Mixnode(?:(?:Cache)?/[\\d.]+)?",
    name: "Mixnode",
  },
  {
    regex: "CSSCheck/[\\d.]+",
    name: "CSSCheck",
  },
  {
    regex: "MicrosoftPreview/[\\d.]+",
    name: "Microsoft Preview",
  },
  {
    regex: "s~virustotalcloud",
    name: "VirusTotal Cloud",
  },
  {
    regex: "TinEye/[\\d.]+",
    name: "TinEye",
  },
  {
    regex: "e~arsnova-filter-system",
    name: "ARSNova Filter System",
  },
  {
    regex: "botify",
    name: "Botify",
  },
  {
    regex: "adscanner",
    name: "Adscanner",
  },
  {
    regex: "online-webceo-bot/[\\d.]+",
    name: "WebCEO",
  },
  {
    regex: "NetTrack",
    name: "NetTrack",
  },
  {
    regex: "htmlyse",
    name: "htmlyse",
  },
  {
    regex: "TrendsmapResolver/[\\d.]+",
    name: "Trendsmap",
  },
  {
    regex: "Shareaholic(?:bot)?/[\\d.]+",
    name: "Steve Bot",
  },
  {
    regex: "keycdn-tools:",
    name: "KeyCDN Tools",
  },
  {
    regex: "keycdn-tools/",
    name: "KeyCDN Tools",
  },
  {
    regex: "Arquivo-web-crawler",
    name: "Arquivo.pt",
  },
  {
    regex: "WhatsMyIP\\.org",
    name: "WhatsMyIP.org",
  },
  {
    regex: "SenutoBot/[\\d.]+",
    name: "Senuto",
  },
  {
    regex: "spaziodati",
    name: "SpazioDati",
  },
  {
    regex: "GozleBot",
    name: "Gozle",
  },
  {
    regex: "Quantcastbot/[\\d.]+",
    name: "Quantcast",
  },
  {
    regex: "FontRadar",
    name: "FontRadar",
  },
  {
    regex: "ViberUrlDownloader",
    name: "Viber Url Downloader",
  },
  {
    regex: "^Zeno$",
    name: "Zeno",
  },
  {
    regex: "Barracuda Sentinel",
    name: "Barracuda Sentinel",
  },
  {
    regex: "RuxitSynthetic/[\\d.]+",
    name: "RuxitSynthetic",
  },
  {
    regex: "DynatraceSynthetic/[\\d.]+",
    name: "DynatraceSynthetic",
  },
  {
    regex: "sitebulb",
    name: "Sitebulb",
  },
  {
    regex: "Monsidobot/[\\d.]+",
    name: "Monsidobot",
  },
  {
    regex: "AccompanyBot",
    name: "AccompanyBot",
  },
  {
    regex: "Ghost Inspector",
    name: "Ghost Inspector",
  },
  {
    regex: "Google-Apps-Script",
    name: "Google Apps Script",
  },
  {
    regex: "SiteOne-Crawler/[\\d.]+",
    name: "SiteOne Crawler",
  },
  {
    regex: "Detectify",
    name: "Detectify",
  },
  {
    regex: "DomCopBot",
    name: "DomCop Bot",
  },
  {
    regex: "Paqlebot/[\\d.]+",
    name: "Paqlebot",
  },
  {
    regex: "Wibybot",
    name: "Wibybot",
  },
  {
    regex: "Synapse",
    name: "Synapse",
  },
  {
    regex: "OSZKbot/[\\d.]+",
    name: "OSZKbot",
  },
  {
    regex: "ZoomBot",
    name: "ZoomBot",
  },
  {
    regex: "RavenCrawler/[\\d.]+",
    name: "RavenCrawler",
  },
  {
    regex: "KadoBot",
    name: "KadoBot",
  },
  {
    regex: "Dubbotbot/[\\d.]+",
    name: "Dubbotbot",
  },
  {
    regex: "Swiftbot/[\\d.]+",
    name: "Swiftbot",
  },
  {
    regex: "EyeMonIT",
    name: "EyeMonit",
  },
  {
    regex: "ThousandEyes",
    name: "ThousandEyes",
  },
  {
    regex: "OmtrBot/[\\d.]+",
    name: "OmtrBot",
  },
  {
    regex: "WebMon/[\\d.]+",
    name: "WebMon",
  },
  {
    regex: "AdsTxtCrawlerTP/[\\d.]+",
    name: "AdsTxtCrawlerTP",
  },
  {
    regex: "fragFINN",
    name: "fragFINN",
  },
  {
    regex: "Clickagy",
    name: "Clickagy",
  },
  {
    regex: "kiwitcms-gitops/[\\d.]+",
    name: "Kiwi TCMS GitOps",
  },
  {
    regex: "webtru_crawler",
    name: "webtru",
  },
  {
    regex: "URLSuMaBot",
    name: "URLSuMaBot",
  },
  {
    regex: "360JK yunjiankong",
    name: "360JK",
  },
  {
    regex: "UCSBNetworkMeasurement",
    name: "UCSB Network Measurement",
  },
  {
    regex: "Plesk screenshot bot",
    name: "Plesk Screenshot Service",
  },
  {
    regex: "Who\\.is",
    name: "Who.is Bot",
  },
  {
    regex: "Probely",
    name: "Probely",
  },
  {
    regex: "Uptimia(?:/[\\d.]+)?",
    name: "Uptimia",
  },
  {
    regex: "2GDPR/[\\d.]+",
    name: "2GDPR",
  },
  {
    regex: "abuse\\.xmco\\.fr",
    name: "Serenety",
  },
  {
    regex: "CheckHost",
    name: "CheckHost",
  },
  {
    regex: "LAC_IAHarvester/[\\d.]+",
    name: "LAC IA Harvester",
  },
  {
    regex: "InsytfulBot/[\\d.]+",
    name: "InsytfulBot",
  },
  {
    regex: "statista\\.com",
    name: "Statista",
  },
  {
    regex: "SubstackContentFetch/[\\d.]+",
    name: "Substack Content Fetch",
  },
  {
    regex: "^ds9",
    name: "Deep SEARCH 9",
  },
  {
    regex: "LiveJournal\\.com",
    name: "LiveJournal",
  },
  {
    regex: "bitdiscovery",
    name: "Tenable.asm",
  },
  {
    regex: "Castopod/[\\d.]+",
    name: "Castopod",
  },
  {
    regex: "Elastic/Synthetics",
    name: "Elastic Synthetics",
  },
  {
    regex: "WDG_Validator/[\\d.]+",
    name: "WDG HTML Validator",
  },
  {
    regex: "scan@aegis.network",
    name: "Aegis",
  },
  {
    regex: "CrawlyProjectCrawler/[\\d.]+",
    name: "Crawly Project",
  },
  {
    regex: "BDFetch",
    name: "BDFetch",
  },
  {
    regex: "PunkMap",
    name: "Punk Map",
  },
  {
    regex: "GenomeCrawlerd/[\\d.]+",
    name: "Deepfield Genome",
  },
  {
    regex: "Gaisbot/[\\d.]+",
    name: "Gaisbot",
  },
  {
    regex: "FAST-WebCrawler/[\\d.]+",
    name: "AlltheWeb",
  },
  {
    regex: "ducks\\.party",
    name: "ducks.party",
  },
  {
    regex: "DepSpid/[\\d.]+",
    name: "DepSpid",
  },
  {
    regex: "Website-info\\.net",
    name: "Website-info",
  },
  {
    regex: "RedekenBot",
    name: "RedekenBot",
  },
  {
    regex: "semaltbot",
    name: "semaltbot",
  },
  {
    regex: "MakeMerryBot",
    name: "MakeMerryBot",
  },
  {
    regex: "Timpibot",
    name: "Timpibot",
  },
  {
    regex: "Validbot",
    name: "ValidBot",
  },
  {
    regex: "NPBot",
    name: "NameProtectBot",
  },
  {
    regex: "domaincodex\\.com",
    name: "Domain Codex",
  },
  {
    regex: "Swisscows Favicons",
    name: "Swisscows Favicons",
  },
  {
    regex: "leak\\.info",
    name: "leak.info",
  },
  {
    regex: "workona",
    name: "Workona",
  },
  {
    regex: "Bloglines",
    name: "Bloglines",
  },
  {
    regex: "heritrix",
    name: "Heritrix",
  },
  {
    regex: "search\\.marginalia\\.nu",
    name: "Marginalia",
  },
  {
    regex: "vu-server-health-scanner/[\\d.]+",
    name: "VU Server Health Scanner",
  },
  {
    regex: "Functionize",
    name: "Functionize",
  },
  {
    regex: "Prerender",
    name: "Prerender",
  },
  {
    regex: "bl\\.uk_ldfc_bot",
    name: "The British Library Legal Deposit Bot",
  },
  {
    regex: "Miniature\\.io",
    name: "Miniature.io",
  },
  {
    regex: "Convertify",
    name: "Convertify",
  },
  {
    regex: "ZoteroTranslationServer",
    name: "Zotero Translation Server",
  },
  {
    regex: "MuckRack",
    name: "MuckRack",
  },
  {
    regex: "Golfe",
    name: "Golfe",
  },
  {
    regex: "SpiderLing",
    name: "SpiderLing",
  },
  {
    regex: "Bravebot",
    name: "Bravebot",
  },
  {
    regex: "1001FirmsBot",
    name: "1001FirmsBot",
  },
  {
    regex: "SteamChatURLLookup",
    name: "Steam Chat URL Lookup",
  },
  {
    regex: "ohdear\\.app",
    name: "Oh Dear",
  },
  {
    regex: "Inspici",
    name: "Inspici",
  },
  {
    regex: "peer39_crawler",
    name: "Peer39",
  },
  {
    regex: "Pandalytics",
    name: "Pandalytics",
  },
  {
    regex: "CloudServerMarketSpider",
    name: "CloudServerMarketSpider",
  },
  {
    regex: "Pigafetta",
    name: "Pigafetta",
  },
  {
    regex: "Cotoyogi",
    name: "Cotoyogi",
  },
  {
    regex: "SuggestBot",
    name: "SuggestBot",
  },
  {
    regex:
      "nuhk|grub-client|Download Demon|SearchExpress|Microsoft URL Control|borg|altavista|dataminr\\.com|teoma|oegp|http%20client|htdig|mogimogi|larbin|scrubby|searchsight|semanticdiscovery|snappy|vortex(?!(?: Build|Plus| CM62| HD65))|zeal(?!ot)|dataparksearch|findlinks|BrowserMob|URL2PNG|ZooShot|GomezA|Google SketchUp|Read%20Later|7Siters|centuryb\\.o\\.t9|InterNaetBoten|EasyBib AutoCite|Bidtellect|tomnomnom/meg|cortex|Re-re Studio|adreview|AHC/|NameOfAgent|Request-Promise|ALittle Client|Hello,? world|wp_is_mobile|0xAbyssalDoesntExist|Anarchy99|^revolt|nvd0rz|xfa1|Hakai|gbrmss|fuck-your-hp|IDBTE4M CODE87|Antoine|Insomania|Hells-Net|b3astmode|Linux Gnu \\(cow\\)|Test Certificate Info|iplabel|Magellan|TheSafex?Internetx?Search|Searcherx?web|kirkland-signature|LinkChain|survey-security-dot-txt|infrawatch|Time/|r00ts3c-owned-you|nvdorz|Root Slut|NiggaBalls|BotPoke|GlobalWebSearch|xx032_bo9vs83_2a|sslshed|geckotrail|Wordup|Keydrop|^xenu|^(?:chrome|firefox|Abcd|Dark|KvshClient|Node.js|Report Runner|url|Zeus|ZmEu)$",
    name: "Generic Bot",
  },
  {
    regex:
      "[a-z0-9_-]*(?:(?<!cu|power[ _]|m[ _])bot(?![ _]TAB|[ _]?5[0-9]|[ _]Senior|[ _]Junior)|analyzer|appengine|archiver?|checker|collector|crawl|crawler|(?<!node-|uclient-|Mikrotik/\\d\\.[x\\d] |electron-)fetch(?:er)?|indexer|inspector|monitor|(?<!Microsoft |banshee-)project(?!or)|(?<!Google Wap |Blue |SpeedMode; )proxy|(?<!P)research|resolver|robots|(?<!Cam)scanner|scraper|script|searcher|(?<!-)security|spider(?! 8)|study|transcoder|uptime|user[ _]?agent|validator)(?:[^a-z]|$)",
    name: "Generic Bot",
  },

  /////
  {
    regex: "WhatsApp",
    name: "WhatsApp",
  },
  {
    regex: "bluesky",
    name: "BlueSky",
  },
  {
    regex: "facebookexternalhit",
    name: "Facebook External Hit",
  },
  {
    regex: "Go-http-client",
    name: "Go HTTP Client",
  },
  {
    regex: "metatags",
    name: "Dub.co Metatags API",
  },
] as const;

export const UA_BOTS_REGEX = new RegExp(
  UA_BOTS.map((bot) => bot.regex).join("|"),
);
