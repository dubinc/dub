import { getTweet } from "./get-tweet";

export default function getTweetsMetadata(ids: string[]) {
  return Promise.all(ids.map((id) => getTweet(id)));
}

export const homepageTweets = [
  "1574639172605816832",
  "1573744854655533069",
  "1581017931043196928",
  "1580891783277395970",
  "1582956754425421825",
  "1574164441498894339",
  //   "1580479816071270401",
];
