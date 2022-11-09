import { getTweet } from "./get-tweet";

export default function getTweetsMetadata(ids: string[]) {
  return Promise.all(ids.map((id) => getTweet(id)));
}

export const homepageTweets = [
  "1574639172605816832",
  "1573744854655533069",
  "1585994819146391553",
  "1586745532386578433",
  "1582956754425421825",
  "1580891783277395970",
  "1581017931043196928",
  "1586262340949139456",
  "1580479816071270401",
];
