import querystring from "querystring";
import { getTwitterMedia } from "./twitter-media";

export const getTweet = async (id: string) => {
  const queryParams = querystring.stringify({
    expansions:
      "author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id,attachments.poll_ids",
    "tweet.fields":
      "attachments,author_id,public_metrics,created_at,id,in_reply_to_user_id,referenced_tweets,text,entities",
    "user.fields": "id,name,profile_image_url,protected,url,username,verified",
    "media.fields":
      "duration_ms,height,media_key,preview_image_url,type,url,width,public_metrics",
    "poll.fields": "duration_minutes,end_datetime,id,options,voting_status",
  });

  const response = await fetch(
    `https://api.twitter.com/2/tweets/${id}?${queryParams}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_AUTH_TOKEN}`,
      },
    },
  );

  const tweet = await response.json();

  //console.log(JSON.stringify(tweet, null, 4));

  const getAuthorInfo = (author_id) => {
    return tweet.includes.users.find((user) => user.id === author_id);
  };

  const getReferencedTweets = (mainTweet) => {
    return (
      mainTweet?.referenced_tweets?.map((referencedTweet) => {
        const fullReferencedTweet = tweet.includes.tweets.find(
          (tweet) => tweet.id === referencedTweet.id,
        );

        return {
          type: referencedTweet.type,
          author: getAuthorInfo(fullReferencedTweet.author_id),
          ...fullReferencedTweet,
        };
      }) || []
    );
  };

  // function to distinguish between external URLs and external t.co links and internal t.co links
  // (e.g. images, videos, gifs, quote tweets) and remove/replace them accordingly
  const getExternalUrls = (tweet) => {
    const externalURLs = tweet.entities?.urls;
    const mappings = {};
    if (externalURLs) {
      externalURLs.map((url) => {
        mappings[`${url.url}`] =
          !url.display_url.startsWith("pic.twitter.com") &&
          !url.display_url.startsWith("twitter.com")
            ? `<a style='color: rgb(29,161,242); font-weight:normal; text-decoration: none' href='${url.expanded_url.replace(
                "@",
                "",
              )}' target='_blank'>${url.display_url.replace("@", "")}</a>`
            : "";
      });
    }
    var processedText = tweet.text;
    Object.entries(mappings).map(([k, v], i) => {
      processedText = processedText.replace(k, v);
    });
    return processedText;
  };
  tweet.data.text = getExternalUrls(tweet.data); // removing/replacing t.co links for main tweet
  tweet?.includes?.tweets?.map((twt) => {
    // removing/replacing t.co links for referenced tweets
    twt.text = getExternalUrls(twt);
  });

  const media = tweet.data?.attachments?.media_keys?.map((key) =>
    tweet.includes.media.find((media) => media.media_key === key),
  );

  const referenced_tweets = getReferencedTweets(tweet.data);

  return {
    ...tweet.data,
    media: media || [],
    video:
      media && (media[0].type == "video" || media[0].type == "animated_gif")
        ? await getTwitterMedia(id)
        : null,
    polls: tweet.includes.polls || [],
    url_meta:
      media ||
      referenced_tweets.length > 0 ||
      tweet.data?.entities?.urls == undefined
        ? null
        : tweet.data.entities?.urls[0],
    referenced_tweets: referenced_tweets,
    author: getAuthorInfo(tweet.data.author_id),
  };
};
