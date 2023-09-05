import Background from "#/ui/home/background";
import { constructMetadata } from "#/lib/utils";
import LinkInspectorForm from "./form";
import BlurImage from "#/ui/blur-image";

export const metadata = constructMetadata({
  title: "Link Inspector - Inspect a Short Link on Dub to Make Sure It's Safe",
  description:
    "Dub's Link Inspector is a simple tool for inspecting short links on Dub to make sure it's safe to click on.",
});

export default function LinkInspector() {
  return (
    <>
      <div className="mx-2 my-10 flex max-w-md flex-col space-y-5 px-2.5 text-center sm:mx-auto sm:max-w-lg sm:px-0 lg:mb-16">
        <h1 className="font-display text-5xl font-extrabold leading-[1.15] text-black sm:text-6xl sm:leading-[1.15]">
          Link Inspector
        </h1>
        <h2 className="text-lg text-gray-600 sm:text-xl">
          Inspect a short link on Dub to make sure it's safe to click on – no
          more unwanted Rick-Rolls or phishing links!
        </h2>
        <LinkInspectorForm />
        <a
          href="/changelog/link-inspector"
          target="_blank"
          className="relative overflow-hidden rounded-md border border-gray-300 bg-gray-50"
        >
          <BlurImage
            src="https://d2vwwcvoksz7ty.cloudfront.net/changelog/link-inspector.png"
            alt="Link Inspector OG image"
            width={1071}
            height={630}
            className="h-[250px] w-full border-b border-gray-300 object-cover"
          />

          <div className="grid gap-1 bg-white p-3 text-left">
            <p className="text-sm text-[#536471]">dub.co</p>
            <h3 className="truncate text-sm font-medium text-[#0f1419]">
              Link Inspector
            </h3>
            <p className="line-clamp-2 text-sm text-[#536471]">
              You can now inspect short links on Dub by adding a '+' to the end
              of the short link.
            </p>
          </div>
        </a>
        <a
          href="/changelog/link-inspector"
          rel="noreferrer"
          target="_blank"
          className="mx-auto mt-2 flex items-center justify-center space-x-2 text-sm text-gray-500 transition-all hover:text-black"
        >
          Read the changelog →
        </a>
      </div>
      <Background />
    </>
  );
}
