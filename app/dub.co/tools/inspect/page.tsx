import { Github, Twitter } from "@/components/shared/icons";
import { Suspense } from "react";
import Background from "#/ui/home/background";
import LaunchTweet from "./launch";
import { constructMetadata } from "#/lib/utils";
import LinkInspectorContent from "./content";

export const metadata = constructMetadata({
  title: "Link Inspector - Inspect a Short Link on Dub to Make Sure It's Safe",
  description:
    "Dub's Link Inspector is a simple tool for inspecting short links on Dub to make sure it's safe to click on. If you think this link is malicious, please report it.",
});

export default function LinkInspector() {
  return (
    <>
      <div className="z-10 mx-2 my-10 flex max-w-md flex-col space-y-5 px-2.5 text-center sm:mx-auto sm:max-w-lg sm:px-0 lg:mb-28">
        <a
          href="https://twitter.com/dubdotsh/status/1695798379836796961"
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
            Link Inspector
          </span>{" "}
        </h1>
        <h2 className="text-lg text-gray-600 sm:text-xl">
          Inspect a short link on Dub to make sure it's safe to click on. If you
          think this link is malicious, please report it.
        </h2>

        <LinkInspectorContent />

        <a
          href="https://github.com/steven-tey/dub/blob/be8a9f6ccf5aad8a9839cd0c8cc435a2095599e9/app/inspect/%5Bdomain%5D/%5Bkey%5D/page.tsx"
          target="_blank"
          rel="noreferrer"
          className="mx-auto mt-2 flex items-center justify-center space-x-2 text-sm text-gray-500 transition-all hover:text-black"
        >
          <Github className="h-4 w-4" />
          <p>View the source code</p>
        </a>

        <Suspense>
          <LaunchTweet />
        </Suspense>
      </div>
      <Background />
    </>
  );
}
