import { getAndCacheTweet } from "#/lib/twitter";
import Tweet from "#/ui/tweet";

export default async function LaunchTweet() {
  const tweet = await getAndCacheTweet("1695798379836796961");
  if (!tweet) return null;
  return (
    <div className="text-left">
      <Tweet data={tweet} />
    </div>
  );
}
