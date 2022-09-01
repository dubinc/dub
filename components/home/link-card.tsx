import { useCallback, useEffect, useState } from "react";
import StatsModal from "@/components/stats/stats-modal";
import BlurImage from "@/components/shared/blur-image";
import CopyButton from "@/components/shared/copy-button";
import LoadingDots from "@/components/shared/loading-dots";
import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher, nFormatter, linkConstructor } from "@/lib/utils";
import Link from "next/link";

export default function LinkCard({
  _key: key,
  url,
}: {
  _key: string;
  url: string;
}) {
  const shortURL = linkConstructor(key);

  const urlHostname = new URL(url).hostname;

  const { data: clicks, isValidating } = useSWR<string>(
    `/api/links/${key}/clicks`,
    fetcher
  );

  const router = useRouter();
  const { stats } = router.query;
  const [showStatsModal, setShowStatsModal] = useState(false);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowStatsModal(false);
    }
  }, []);

  useEffect(() => {
    if (stats) {
      setShowStatsModal(true);
    } else {
      setShowStatsModal(false);
    }
  }, [stats]);

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <div
      key={key}
      className="flex items-center border border-gray-200 dark:border-gray-600 hover:border-black dark:hover:border-white p-3 rounded-md transition-all"
    >
      <StatsModal
        _key={stats as string}
        stats={[]}
        showStatsModal={showStatsModal}
        setShowStatsModal={setShowStatsModal}
      />
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
          <Link
            href={{ pathname: "/", query: { stats: key } }}
            as={`/stats/${encodeURI(key)}`}
            shallow
            scroll={false}
          >
            <a className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5">
              <p className="text-sm text-gray-500 dark:text-white">
                {isValidating || !clicks ? (
                  <LoadingDots color="#71717A" />
                ) : (
                  nFormatter(parseInt(clicks))
                )}{" "}
                clicks
              </p>
            </a>
          </Link>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate w-72">
          {url}
        </p>
      </div>
    </div>
  );
}
