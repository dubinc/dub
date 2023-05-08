import { Github, Twitter } from "@/components/shared/icons";
import { Suspense } from "react";
import Background from "@/components/shared/background";
import LaunchTweet from "./launch";
import MetatagsContent from "./content";

export const metadata = {
  title: "Metatags API - The Free API to Get Meta Tags from a URL",
  description:
    "Dub's Metatags API is a free & simple API to retrieve meta & OG tags from a URL, powered by Vercel Edge Functions.",
};

export default function Metatags() {
  return (
    <>
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

        <MetatagsContent />

        <a
          href="https://dub.sh/metatags-code"
          target="_blank"
          rel="noreferrer"
          className="mx-auto mt-2 flex items-center justify-center space-x-2 text-sm text-gray-500 transition-all hover:text-black"
        >
          <Github className="h-4 w-4" />
          <p>View the source code</p>
        </a>

        <Suspense fallback="">
          {/* @ts-expect-error Async Server Component */}
          <LaunchTweet />
        </Suspense>
      </div>
      <Background />
    </>
  );
}
