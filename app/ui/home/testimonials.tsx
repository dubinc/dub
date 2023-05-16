import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { nFormatter } from "@/lib/utils";
import getTweetsMetadata, { homepageTweets } from "#/lib/twitter";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Tweet from "#/ui/tweet";
import TestimonialsMobile from "./testimonials-mobile";

export default async function Testimonials() {
  const userCount = await unstable_cache(
    async () => {
      return prisma.user.count();
    },
    [],
    {
      revalidate: 300,
    },
  )();
  const tweets = await getTweetsMetadata(homepageTweets);

  return (
    <MaxWidthWrapper className="pt-20">
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
      <TestimonialsMobile tweets={tweets} />
      <div className="hidden space-y-6 py-8 sm:block sm:columns-2 sm:gap-6 xl:columns-3">
        {tweets.map((tweet, idx) => (
          <Tweet
            key={idx}
            metadata={JSON.stringify(tweet)}
            className={
              // this is a bit hacky but it allows us to have a 3-column mosaic layout on desktop
              // it basically says "if the card is NOT in the middle column, push it down by 4rem
              idx < Math.floor(tweets.length / 3) ||
              idx >= Math.floor(tweets.length / 3) * 2
                ? "relative lg:top-16"
                : ""
            }
          />
        ))}
      </div>
    </MaxWidthWrapper>
  );
}
