import { getTweet, Tweet } from "react-tweet/api";
import { redis } from "./upstash";

export async function getAndCacheTweet(id: string): Promise<Tweet | null> {
  try {
    const tweet = await getTweet(id);
    if (!tweet) {
      throw new Error("Tweet not found");
    }
    // cache the tweet
    await redis.set(`tweet:${id}`, JSON.stringify(tweet));
    return tweet;
  } catch (error) {
    // check if the tweet is cached
    const cachedTweet = (await redis.get(`tweet:${id}`)) as Tweet | null;
    return cachedTweet;
  }
}
