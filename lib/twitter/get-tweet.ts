import { getTwitterMedia } from "./twitter-media";

const queryParams = new URLSearchParams({
  expansions:
    "author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id,attachments.poll_ids",
  "tweet.fields":
    "attachments,author_id,public_metrics,created_at,id,in_reply_to_user_id,referenced_tweets,text,entities",
  "user.fields": "id,name,profile_image_url,protected,url,username,verified",
  "media.fields":
    "duration_ms,height,media_key,preview_image_url,type,url,width,public_metrics",
  "poll.fields": "duration_minutes,end_datetime,id,options,voting_status",
}).toString();

export const getTweet = async (id: string) => {
  try {
    const response = await fetch(
      `https://api.twitter.com/2/tweets/${id}?${queryParams}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TWITTER_AUTH_TOKEN}`,
        },
        next: {
          revalidate: 3600, // revalidate every 1 hour
        },
      },
    );
    const tweet = await response.json();

    if (!tweet.data)
      throw new Error(`Failed to get tweet data for tweet ID: ${id}`);

    const getAuthorInfo = (author_id: string) =>
      tweet.includes.users.find((user) => user.id === author_id);

    const getReferencedTweets = (mainTweet) =>
      mainTweet?.referenced_tweets?.map((referencedTweet) => {
        const fullReferencedTweet = tweet.includes.tweets?.find(
          (tweet) => tweet.id === referencedTweet.id,
        );
        if (!fullReferencedTweet)
          throw new Error(
            `Failed to find full tweet from referenced tweet ID: ${referencedTweet.id}`,
          );

        return {
          type: referencedTweet.type,
          ...fullReferencedTweet,
        };
      }) || [];

    // Function to distinguish between external URLs and external t.co links and internal t.co links
    // (e.g. images, videos, gifs, quote tweets) and remove/replace them accordingly

    if (tweet.data) tweet.data.text = getExternalUrls(tweet?.data); // removing/replacing t.co links for main tweet
    tweet?.includes?.tweets?.map((twt) => {
      // removing/replacing t.co links for referenced tweets
      twt.text = getExternalUrls(twt);
    });

    const media = tweet.data?.attachments?.media_keys?.map((key) =>
      tweet.includes.media?.find((media) => media.media_key === key),
    );

    const referenced_tweets = getReferencedTweets(tweet.data);

    return {
      ...tweet.data,
      author: getAuthorInfo(tweet.data?.author_id),
      media: media || [],
      polls: tweet?.includes?.polls || [],
      referenced_tweets: referenced_tweets,
      url_meta:
        media || referenced_tweets.length > 0 || !tweet.data?.entities?.urls
          ? null
          : tweet.data?.entities?.urls.at(-1), // take the last unfurled URL in the tweet (similar to Twitter's behavior)
      video:
        media &&
        media[0] &&
        (media[0].type === "video" || media[0].type === "animated_gif")
          ? await getTwitterMedia(id)
          : null,
    };
  } catch (error) {
    return null;
  }
};

function getExternalUrls(tweet) {
  const externalURLs = tweet?.entities?.urls;

  let mappings: {
    [I in string]: string;
  } = {};

  if (externalURLs)
    externalURLs.map((url) => {
      mappings[url.url] =
        !url.display_url.startsWith("pic.twitter.com") &&
        !url.display_url.startsWith("twitter.com")
          ? url.expanded_url
          : "";
    });

  let processedText = tweet?.text;
  Object.entries(mappings).map(([key, value]) => {
    processedText = processedText.replace(key, value);
  });

  return processedText;
}
