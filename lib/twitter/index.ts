import { getTweet } from "./get-tweet";

export default function getTweetsMetadata(ids: string[]) {
  return Promise.all(ids.map((id) => getTweet(id)));
}

export const homepageTweets = [
  "1574639172605816832",
  "1631671657617059842",
  "1573744854655533069",
  "1586745532386578433",
  "1582956754425421825",
  "1586262340949139456",
  "1632125000386854912",
  "1581017931043196928",
  "1626946633207357440",
];
