import HomeLayout from "@/components/layout/home";
import {
  Copy,
  Github,
  LoadingCircle,
  Photo,
  Tick,
  Twitter,
} from "@/components/shared/icons";
import getTweetsMetadata from "@/lib/twitter";
import Tweet from "@/components/shared/tweet";
import { useMemo, useState } from "react";
import Background from "@/components/shared/background";
import Meta from "@/components/layout/meta";
import { useDebounce } from "use-debounce";
import { fetcher, getDomainWithoutWWW, getUrlFromString } from "@/lib/utils";
import useSWR from "swr";

export default function Metatags({ tweets }: { tweets: any }) {
  const [url, setUrl] = useState("https://github.com/steven-tey/dub");
  const [debouncedUrl] = useDebounce(getUrlFromString(url), 500);
  const hostname = useMemo(() => {
    return getDomainWithoutWWW(debouncedUrl);
  }, [debouncedUrl]);

  const { data, isValidating } = useSWR<{
    title: string | null;
    description: string | null;
    image: string | null;
  }>(debouncedUrl && `/api/edge/metatags?url=${debouncedUrl}`, fetcher, {
    revalidateOnFocus: false,
  });

  const { title, description, image } = data || {};

  const [copied, setCopied] = useState(false);

  return (
    <HomeLayout
      meta={{
        title: "Metatags API - The Free API to Get Meta Tags from a URL",
        description:
          "Dub's Metatags API is a free & simple API to retrieve meta & OG tags from a URL, powered by Vercel Edge Functions.",
      }}
    >
      <Background />
      <div className="z-10 mx-2 my-10 flex max-w-md flex-col space-y-5 px-2.5 text-center sm:mx-auto sm:max-w-lg sm:px-0 lg:mb-28">
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

        <h1 className="font-display text-5xl font-extrabold leading-[1.15] text-black sm:text-6xl sm:leading-[1.15]">
          <span className="bg-gradient-to-r from-amber-500 via-orange-600 to-yellow-500 bg-clip-text text-transparent">
            Metatags
          </span>{" "}
          API
        </h1>
        <h2 className="text-lg text-gray-600 sm:text-xl">
          A dead-simple API to retrieve the meta tags for a URL. Completely free
          and open-source.
        </h2>

        <div className="w-full rounded-md shadow-sm">
          <input
            name="url"
            id="url"
            type="url"
            className="block w-full rounded-md border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
            placeholder="Enter your URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-invalid="true"
          />
        </div>

        <div className="relative overflow-hidden rounded-md border border-gray-300 bg-gray-50">
          {isValidating && (
            <div className="absolute flex h-[250px] w-full flex-col items-center justify-center space-y-4 border-b border-gray-300 bg-gray-50">
              <LoadingCircle />
            </div>
          )}
          {image ? (
            <img
              src={image}
              alt="Preview"
              className="h-[250px] w-full border-b border-gray-300 object-cover"
            />
          ) : (
            <div className="flex h-[250px] w-full flex-col items-center justify-center space-y-4 border-b border-gray-300">
              <Photo className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-400">
                Enter a link to generate a preview.
              </p>
            </div>
          )}
          <div className="grid gap-1 bg-white p-3 text-left">
            {hostname ? (
              <p className="text-sm text-[#536471]">{hostname}</p>
            ) : (
              <div className="mb-1 h-4 w-24 rounded-md bg-gray-100" />
            )}
            {title ? (
              <h3 className="truncate text-sm font-medium text-[#0f1419]">
                {title}
              </h3>
            ) : (
              <div className="mb-1 h-4 w-full rounded-md bg-gray-100" />
            )}
            {description ? (
              <p className="text-sm text-[#536471] line-clamp-2">
                {description}
              </p>
            ) : (
              <div className="grid gap-2">
                <div className="h-4 w-full rounded-md bg-gray-100" />
                <div className="h-4 w-48 rounded-md bg-gray-100" />
              </div>
            )}
          </div>
        </div>

        <button
          className="hover:bg/black-[0.08] group relative flex cursor-copy items-center space-x-5 rounded-full bg-black/5 py-2.5 pr-3 pl-5 transition-all"
          onClick={() => {
            navigator.clipboard.writeText(
              `https://api.dub.sh/metatags?url=${getUrlFromString(url)}`,
            );
            setCopied(true);
            setTimeout(() => {
              setCopied(false);
            }, 2000);
          }}
        >
          <div className="w-11/12 overflow-scroll scrollbar-hide">
            <p className="whitespace-nowrap text-sm font-medium text-gray-600">
              https://api.dub.sh/metatags?url=
              <span className="text-amber-600">{getUrlFromString(url)}</span>
            </p>
          </div>
          <span className="absolute inset-y-0 top-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.07] transition-all group-hover:bg-black/10">
            {copied ? (
              <Tick className="h-4 w-4 text-gray-700" />
            ) : (
              <Copy className="h-4 w-4 text-gray-700" />
            )}
          </span>
        </button>

        <pre className="overflow-auto rounded-md border border-gray-400 bg-stone-800 p-5 text-left">
          <code className="text-xs text-white">
            {JSON.stringify(
              {
                title: title || null,
                description: description || null,
                image: image || null,
              },
              null,
              2,
            )}
          </code>
        </pre>

        <a
          href="https://dub.sh/metatags-code"
          target="_blank"
          rel="noreferrer"
          className="mx-auto mt-2 flex items-center justify-center space-x-2 text-sm text-gray-500 transition-all hover:text-black"
        >
          <Github className="h-4 w-4" />
          <p>View the source code</p>
        </a>

        <div className="text-left">
          {tweets.map((tweet) => (
            <Tweet
              key={tweet.id}
              id={tweet.id}
              metadata={JSON.stringify(tweet)}
            />
          ))}
        </div>
      </div>
    </HomeLayout>
  );
}

export async function getStaticProps() {
  const tweets = await getTweetsMetadata(["1595465648938930180"]);

  return {
    props: {
      tweets,
    },
    revalidate: 10,
  };
}
