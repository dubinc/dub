import BlurImage from "@/components/shared/blur-image";
import CopyButton from "@/components/shared/copy-button";
import { LoadingDots } from "@/components/shared/icons";
import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher, nFormatter, linkConstructor, timeAgo } from "@/lib/utils";
import Link from "next/link";
import { LinkProps } from "@/lib/types";
import { useEditLinkModal } from "./edit-link-modal";
import Tooltip from "@/components/shared/tooltip";

export default function LinkCard({
  props,
  exceededUsage,
  domain,
}: {
  props: LinkProps;
  exceededUsage: boolean;
  domain?: string;
}) {
  const { key, url, title, timestamp } = props;

  const urlHostname = url ? new URL(url).hostname : "";

  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const { data: clicks, isValidating } = useSWR<string>(
    domain
      ? `/api/projects/${slug}/domains/${domain}/links/${key}/clicks`
      : `/api/edge/links/${key}/clicks`,
    fetcher
  );

  const { setShowEditLinkModal, EditLinkModal } = useEditLinkModal({
    props,
    domain,
  });

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-5 sm:space-y-0 border border-gray-200 dark:border-gray-600 bg-white dark:bg-black p-4 rounded-md transition-all">
      <EditLinkModal />
      <div className="relative flex items-center space-x-4">
        <BlurImage
          src={`https://logo.clearbit.com/${urlHostname}`}
          alt={urlHostname}
          className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600"
          width={20}
          height={20}
        />
        <div>
          <div className="flex items-center space-x-2">
            <a
              className="text-blue-800 dark:text-blue-400 font-semibold"
              href={linkConstructor({ key, domain })}
              target="_blank"
              rel="noreferrer"
            >
              {linkConstructor({ key, domain, pretty: true })}
            </a>
            <CopyButton url={linkConstructor({ key, domain })} />
            <Link href={`${router.asPath}/${encodeURI(key)}`}>
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
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 line-clamp-1">
            {title}
          </h3>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Added {timeAgo(timestamp)}
        </p>
        {exceededUsage ? (
          <Tooltip content="You have exceeded your usage limit. We're still collecting data on your existing links, but you need to upgrade to edit them.">
            <div className="text-gray-300 cursor-not-allowed font-medium text-sm px-5 py-2 border rounded-md border-gray-200 dark:border-gray-600 transition-all duration-75">
              Edit
            </div>
          </Tooltip>
        ) : (
          <button
            onClick={() => setShowEditLinkModal(true)}
            className="font-medium text-sm text-gray-500 px-5 py-2 border rounded-md border-gray-200 dark:border-gray-600 hover:border-black dark:hover:border-white active:scale-95 transition-all duration-75"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
