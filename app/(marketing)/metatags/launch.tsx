import Tweet from "#/ui/tweet";
import { getTweet } from "#/lib/twitter/get-tweet";

export default async function LaunchTweet() {
  const tweet = await getTweet("1595465648938930180");
  return (
    <div className="text-left">
      <Tweet key={tweet.id} metadata={JSON.stringify(tweet)} />
    </div>
  );
}
