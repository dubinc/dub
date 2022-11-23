import HomeLayout from "@/components/layout/home";
import { Twitter } from "@/components/shared/icons";
import getTweetsMetadata from "@/lib/twitter";
import Tweet from "@/components/shared/tweet";
import { useState } from "react";
import Background from "@/components/shared/background";
import Meta from "@/components/layout/meta";

export default function Metatags({ tweets }: { tweets: any }) {
  const [url, setUrl] = useState("");
  return (
    <HomeLayout
      domain="api.dub.sh"
      meta={
        <Meta
          title="Metatags API - The Free API to Get Meta Tags from a URL"
          description="Dub's Metatags API is a free & simple API to retrieve meta & OG tags from a URL, powered by Vercel Edge Functions."
        />
      }
    >
      <Background />
      <div className="z-10 mx-auto my-10 max-w-md px-2.5 text-center sm:max-w-lg sm:px-0 lg:mb-28">
        <a
          href="https://twitter.com/dubdotsh/status/1595459224498233347"
          target="_blank"
          rel="noreferrer"
          className="mx-auto flex max-w-fit items-center justify-center space-x-2 overflow-hidden rounded-full bg-blue-100 px-7 py-2 transition-all hover:bg-blue-200"
        >
          <Twitter className="h-5 w-5 text-[#1d9bf0]" />
          <p className="text-sm font-semibold text-[#1d9bf0]">
            Watch it in action
          </p>
        </a>

        <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.15] text-black sm:text-6xl sm:leading-[1.15]">
          <span className="bg-gradient-to-r from-amber-500 via-orange-600 to-yellow-500 bg-clip-text text-transparent">
            Metatags
          </span>{" "}
          API
        </h1>
        <h2 className="mt-5 text-lg text-gray-600 sm:text-xl">
          A dead-simple API to retrieve the meta tags for a URL, using{" "}
          <a
            href="https://vercel.com/edge"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted hover:text-black"
          >
            Vercel Edge Functions ↗
          </a>
          .
        </h2>

        <div className="mx-auto mt-5 mb-10 flex justify-center space-x-4 lg:-mb-5">
          <form
            className="relative mt-1 flex rounded-md shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              window.open(`https://api.dub.sh/metatags?url=${url}`);
            }}
          >
            <span className="inline-flex items-center whitespace-nowrap rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-5 text-sm text-gray-500">
              api.dub.sh/metatags?url=
            </span>
            <input
              name="slug"
              id="slug"
              type="text"
              required
              className="w-66 block rounded-r-md border-gray-300 pr-12 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:w-72"
              placeholder="https://vercel.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-invalid="true"
            />
            <button className="group absolute inset-y-0 right-0 my-1.5 mr-1.5 w-8 rounded border border-gray-200 font-sans text-sm font-medium text-gray-400 hover:border-gray-700 hover:text-gray-700 peer-focus:border-gray-700 peer-focus:text-gray-700">
              <p>↵</p>
            </button>
          </form>
        </div>

        <div className="text-left">
          {tweets.map((tweet, idx) => (
            <Tweet
              key={tweet.id}
              id={tweet.id}
              metadata={JSON.stringify(tweet)}
              className={
                idx < Math.floor(tweets.length / 3) ||
                idx >= Math.floor(tweets.length / 3) * 2
                  ? "relative lg:top-16"
                  : ""
              }
            />
          ))}
        </div>
      </div>
    </HomeLayout>
  );
}

export async function getStaticProps() {
  const tweets = await getTweetsMetadata(["1595459224498233347"]);

  return {
    props: {
      tweets,
    },
    revalidate: 10,
  };
}
