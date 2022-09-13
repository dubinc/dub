import { useCallback, useEffect } from "react";
import BlurImage from "@/components/shared/blur-image";
import CopyButton from "@/components/shared/copy-button";
import { LoadingDots } from "@/components/shared/icons";
import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher, nFormatter, linkConstructor } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";
import { FRAMER_MOTION_LIST_ITEM_VARIANTS } from "@/lib/constants";
import { useStatsModal } from "@/components/stats/stats-modal";

export default function LinkCard({
  _key: key,
  url,
}: {
  _key: string;
  url: string;
}) {
  const urlHostname = new URL(url).hostname;

  const { data: clicks, isValidating } = useSWR<string>(
    `/api/edge/links/${key}/clicks`,
    fetcher
  );

  const router = useRouter();
  const { key: stats } = router.query;
  const { setShowStatsModal, StatsModal } = useStatsModal();

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
    <motion.li
      variants={FRAMER_MOTION_LIST_ITEM_VARIANTS}
      className="flex items-center border border-gray-200 dark:border-gray-600 hover:border-black dark:hover:border-white bg-white dark:bg-black p-3 max-w-md rounded-md transition-all"
    >
      <StatsModal />
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
            href={linkConstructor({ key })}
            target="_blank"
            rel="noreferrer"
          >
            {linkConstructor({ key, pretty: true })}
          </a>
          <CopyButton url={linkConstructor({ key })} />
          <Link
            href={{ pathname: "/", query: { key } }}
            as={`/stats/${encodeURI(key)}`}
            shallow
            scroll={false}
          >
            <a className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 hover:scale-105 active:scale-95 transition-all duration-75">
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
    </motion.li>
  );
}
