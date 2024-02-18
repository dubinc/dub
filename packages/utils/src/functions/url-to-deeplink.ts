export const urlToDeeplink = ({
  url,
  os,
}: {
  url: string;
  os: "ios" | "android";
}): string => {
  if (!url) return url; // weird edge case

  const patterns: [
    RegExp,
    (matches: RegExpMatchArray) => { ios: string; android: string },
  ][] = [
    // YouTube (youtube.com, youtu.be)
    [
      /https?:\/\/(?:www\.)?(youtube\.com|youtu\.be)\/([a-zA-Z0-9@_-]+)/,
      (matches) => ({
        ios: `vnd.youtube://www.youtube.com/${matches[1]}`,
        android: `intent://www.youtube.com/${matches[1]}&feature=youtu.be#Intent;package=com.google.android.youtube;scheme=https;end`,
      }),
    ],
    // Amazon (amazon.com, amazon.ca, amazon.co.uk, amazon.in, amazon.es etc.)
    [
      /https?:\/\/(?:www\.)?amazon\.(com|ca|co\.uk|in|es)\/([a-zA-Z0-9@_-]+)/,
      (matches) => ({
        ios: `com.amazon.mobile.shopping.web://amazon.com/${matches[1]}`,
        android: `com.amazon.mobile.shopping.web://amazon.com/${matches[1]}`,
      }),
    ],
    // Instagram media posts (instagram.com/p/abc123)
    [
      /https?:\/\/(?:www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
      (matches) => ({
        ios: `instagram://media?id=${matches[1]}`,
        android: `intent://instagram.com/p/${matches[1]}/#Intent;package=com.instagram.android;scheme=https;end`,
      }),
    ],
    // Instagram profiles (instagram.com/username)
    [
      /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_-]+)/,
      (matches) => ({
        ios: `instagram://user?username=${matches[1]}`,
        android: `intent://instagram.com/${matches[1]}#Intent;package=com.instagram.android;scheme=https;end`,
      }),
    ],
    // Spotify (open.spotify.com)
    [
      /https?:\/\/open\.spotify\.com\/([a-zA-Z0-9@_-]+)/,
      (matches) => ({
        ios: `spotify://${matches[1]}`,
        android: `spotify://${matches[1]}`,
      }),
    ],
    // Tweets (twitter.com/username/status/tweetid)
    [
      /https?:\/\/(?:www\.)?twitter\.com\/([a-zA-Z0-9_-]+)\/status\/([0-9]+)/,
      (matches) => ({
        ios: `twitter://status?id=${matches[2]}`,
        android: `intent://twitter.com/${matches[1]}/status/${matches[2]}#Intent;package=com.twitter.android;scheme=https;end`,
      }),
    ],
    // Twitter profiles (twitter.com/username)
    [
      /https?:\/\/(?:www\.)?twitter\.com\/([a-zA-Z0-9_-]+)/,
      (matches) => ({
        ios: `twitter://user?screen_name=${matches[1]}`,
        android: `intent://twitter.com/${matches[1]}#Intent;package=com.twitter.android;scheme=https;end`,
      }),
    ],
    // Telegram (t.me/username)
    [
      /https?:\/\/t\.me\/([a-zA-Z0-9_-]+)/,
      (matches) => ({
        ios: `tg://resolve?domain=${matches[1]}`,
        android: `intent://resolve?domain=${matches[1]}#Intent;package=org.telegram.messenger;scheme=tg;end`,
      }),
    ],
    // Example for another service, adjust the regex and deep link format accordingly
    // [
    //     /https?:\/\/(?:www\.)?example\.com\/content\/([a-zA-Z0-9_-]+)/,
    //     (matches) => ({
    //         ios: `example://content/${matches[1]}`,
    //         android: `example://content/${matches[1]}`
    // ],
  ];

  for (let [regex, transformer] of patterns) {
    const matches = url.match(regex);
    if (matches) {
      return transformer(matches)[os];
    }
  }

  // Return the original URL if no patterns match
  return url;
};
