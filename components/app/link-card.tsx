import Link from "next/link";
import { useRouter } from "next/router";
import useSWR from "swr";
import BlurImage from "@/components/shared/blur-image";
import CopyButton from "@/components/shared/copy-button";
import { Chart, LoadingDots, QR } from "@/components/shared/icons";
import Tooltip, { TooltipContent } from "@/components/shared/tooltip";
import useProject from "@/lib/swr/use-project";
import useUsage from "@/lib/swr/use-usage";
import { LinkProps } from "@/lib/types";
import { fetcher, linkConstructor, nFormatter, timeAgo } from "@/lib/utils";
import { useAddEditLinkModal } from "./modals/add-edit-link-modal";
import { useDeleteLinkModal } from "./modals/delete-link-modal";
import { useLinkQRModal } from "./modals/link-qr-modal";

export default function LinkCard({ props }: { props: LinkProps }) {
  const { key, url, title, timestamp } = props;

  const urlHostname = url ? new URL(url).hostname : "";

  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const { project, isOwner } = useProject();
  const { domain } = project || {};
  const { exceededUsage } = useUsage();

  const { data: clicks, isValidating } = useSWR<string>(
    domain
      ? `/api/projects/${slug}/domains/${domain}/links/${key}/clicks`
      : `/api/edge/links/${key}/clicks`,
    fetcher,
  );

  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal({
    props,
  });

  const { setShowDeleteLinkModal, DeleteLinkModal } = useDeleteLinkModal({
    props,
  });

  const { setShowLinkQRModal, LinkQRModal } = useLinkQRModal({
    props,
  });

  return (
    <>
      <AddEditLinkModal />
      <DeleteLinkModal />
      <LinkQRModal />
      <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-5 sm:space-y-0 bg-white p-4 rounded-lg shadow hover:shadow-md transition-all">
        <div className="relative flex items-center space-x-4">
          <BlurImage
            src={`https://www.google.com/s2/favicons?sz=64&domain_url=${urlHostname}`}
            alt={urlHostname}
            className="w-10 h-10 rounded-full"
            width={20}
            height={20}
          />
          <div>
            <div className="flex items-center space-x-2 max-w-fit">
              <a
                className="text-blue-800 text-sm sm:text-base font-semibold truncate w-32 sm:w-full"
                href={linkConstructor({ key, domain })}
                target="_blank"
                rel="noreferrer"
              >
                {linkConstructor({ key, domain, pretty: true })}
              </a>
              <CopyButton url={linkConstructor({ key, domain })} />
              <button
                onClick={() => setShowLinkQRModal(true)}
                className="group p-1.5 rounded-full bg-gray-100 hover:bg-blue-100 hover:scale-105 active:scale-95 transition-all duration-75"
              >
                <span className="sr-only">Download QR</span>
                <QR className="text-gray-700 group-hover:text-blue-800 transition-all" />
              </button>
              <Link href={`${router.asPath}/${encodeURI(key)}`}>
                <a className="flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-0.5 hover:scale-105 active:scale-95 transition-all duration-75">
                  <Chart className="w-4 h-4" />
                  <p className="text-sm text-gray-500 whitespace-nowrap">
                    {isValidating || !clicks ? (
                      <LoadingDots color="#71717A" />
                    ) : (
                      nFormatter(parseInt(clicks))
                    )}
                    <span className="hidden sm:inline-block ml-1">clicks</span>
                  </p>
                </a>
              </Link>
            </div>
            <h3 className="text-sm font-medium text-gray-700 line-clamp-1">
              {title}
            </h3>
          </div>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <p className="text-sm hidden sm:block text-gray-500">
            Added {timeAgo(timestamp)}
          </p>
          {slug && exceededUsage ? (
            <Tooltip
              content={
                <TooltipContent
                  title={
                    isOwner
                      ? "You have exceeded your usage limit. We're still collecting data on your existing links, but you need to upgrade to edit them."
                      : "The owner of this project has exceeded their usage limit. We're still collecting data on all existing links, but they need to upgrade their plan to edit them."
                  }
                  cta={isOwner && "Upgrade"}
                  ctaLink={isOwner && "/settings"}
                />
              }
            >
              <div className="grow text-gray-300 cursor-not-allowed font-medium text-sm px-5 py-1.5 sm:py-2 border rounded-md border-gray-200 transition-all duration-75">
                Edit
              </div>
            </Tooltip>
          ) : (
            <button
              onClick={() => setShowAddEditLinkModal(true)}
              className="grow sm:grow-0 font-medium text-sm text-gray-500 px-5 py-1.5 sm:py-2 border rounded-md border-gray-200 hover:border-black active:scale-95 transition-all duration-75"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => setShowDeleteLinkModal(true)}
            className="grow sm:grow-0 font-medium text-sm text-white bg-red-600 hover:bg-white hover:text-red-600 border-red-600 px-5 py-1.5 sm:py-2 border rounded-md active:scale-95 transition-all duration-75"
          >
            Delete
          </button>
        </div>
      </li>
    </>
  );
}
