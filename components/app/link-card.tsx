import BlurImage from "@/components/shared/blur-image";
import CopyButton from "@/components/shared/copy-button";
import { LoadingDots } from "@/components/shared/icons";
import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher, nFormatter, linkConstructor, timeAgo } from "@/lib/utils";
import Link from "next/link";
import { LinkProps } from "@/lib/api/types";
import { useEditModal } from "./edit-modal";

export default function LinkCard({
  props,
  slug,
}: {
  props: LinkProps;
  slug?: string;
}) {
  const { key, url, title, timestamp } = props;

  const urlHostname = new URL(url).hostname;

  const router = useRouter();

  const { data: clicks, isValidating } = useSWR<string>(
    slug
      ? `/api/projects/${slug}/links/${key}/clicks`
      : `/api/edge/links/${key}/clicks`,
    fetcher
  );

  const { setShowEditModal, EditModal } = useEditModal({ props, slug });

  return (
    <div className="flex justify-between items-center border border-gray-200 dark:border-gray-600 bg-white dark:bg-black p-4 rounded-md transition-all">
      <EditModal />
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
              href={linkConstructor(key)}
              target="_blank"
              rel="noreferrer"
            >
              {linkConstructor(key, true)}
            </a>
            <CopyButton url={linkConstructor(key)} />
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
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-sm">
            {title}
          </h3>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Added {timeAgo(timestamp)}
        </p>
        <button
          onClick={() => setShowEditModal(true)}
          className="font-medium text-sm text-gray-500 px-5 py-2 border rounded-md border-gray-200 dark:border-gray-600 hover:border-black dark:hover:border-white active:scale-95 transition-all duration-75"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
