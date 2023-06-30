import Tweet from "#/ui/tweet";
import { getTweet } from "react-tweet/api";

export default async function LaunchTweet() {
  const tweet = await getTweet("1595465648938930180");
  if (!tweet) return null;
  return (
    <div className="text-left">
      <Tweet data={tweet} />
    </div>
  );
}
