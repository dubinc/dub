import { getAndCacheTweet } from "#/lib/twitter";
import Tweet from "#/ui/tweet";

export default async function LaunchTweet() {
  const tweet = await getAndCacheTweet("1595465648938930180");
  if (!tweet) return null;
  return (
    <div className="text-left">
      <Tweet data={tweet} />
    </div>
  );
}
