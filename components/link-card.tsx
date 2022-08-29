import BlurImage from "@/components/blur-image";
import CopyButton from "@/components/copy-button";
import LoadingDots from "@/components/loading-dots";
import useSWR from "swr";
import fetcher from "@/lib/fetcher";
import nFormatter from "@/lib/n-formatter";

export default function LinkCard({
  _key: key,
  url,
}: {
  _key: string;
  url: string;
}) {
  const shortURL = `${
    process.env.NEXT_PUBLIC_DEMO_APP === "1"
      ? "https://dub.sh"
      : process.env.NEXT_PUBLIC_VERCEL === "1"
      ? process.env.NEXT_PUBLIC_VERCEL_URL
      : "http://localhost:3000"
  }/${key}`; // if you're self-hosting you can just replace this with your own domain

  const urlHostname = new URL(url).hostname;

  const { data: clicks, isValidating } = useSWR<string>(
    `/api/links/${key}/clicks`,
    fetcher
  );

  return (
    <div
      key={key}
      className="flex items-center border border-gray-200 dark:border-gray-600 hover:border-black dark:hover:border-white p-3 rounded-md transition-all"
    >
      <BlurImage
        src={`https://logo.clearbit.com/${urlHostname}`}
        alt={urlHostname}
        className="w-10 h-10 rounded-full mr-2 border border-gray-200 dark:border-gray-600"
        width={20}
        height={20}
      />
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <a
            className="text-blue-800 dark:text-blue-400 font-semibold"
            href={shortURL}
            target="_blank"
            rel="noreferrer"
          >
            {shortURL.replace(/^https?:\/\//, "")}
          </a>
          <CopyButton url={shortURL} />
          <div className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5">
            <p className="text-sm text-gray-500 dark:text-white">
              {isValidating || !clicks ? (
                <LoadingDots color="#71717A" />
              ) : (
                nFormatter(parseInt(clicks))
              )}{" "}
              clicks
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate w-72">
          {url}
        </p>
      </div>
    </div>
  );
}
