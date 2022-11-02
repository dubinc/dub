import { nFormatter } from "@/lib/utils";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Tweet from "@/components/shared/tweet";

export default function Testimonials({
  userCount,
  tweets,
}: {
  userCount: number;
  tweets: any[];
}) {
  return (
    <MaxWidthWrapper className="py-20">
      <div className="mx-auto max-w-md text-center sm:max-w-xl">
        <h2 className="font-display text-4xl font-extrabold leading-tight text-black sm:text-5xl sm:leading-tight">
          Loved by{" "}
          <span className="bg-gradient-to-r from-red-600 to-amber-600 bg-clip-text text-transparent">
            {nFormatter(userCount)} users
          </span>
        </h2>
        <p className="mt-5 text-gray-600 sm:text-lg">
          Don't take it from us - here's what our users have to say about Dub.
        </p>
      </div>
      <div className="columns-3 gap-6 space-y-6 py-8">
        {tweets.map((tweet) => (
          <Tweet
            key={tweet.id}
            id={tweet.id}
            metadata={JSON.stringify(tweet)}
          />
        ))}
      </div>
    </MaxWidthWrapper>
  );
}
