import Link from "next/link";
import { useRouter } from "next/router";
import { useRef, useState } from "react";
import useSWR from "swr";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";
import { useArchiveLinkModal } from "@/components/app/modals/archive-link-modal";
import { useDeleteLinkModal } from "@/components/app/modals/delete-link-modal";
import { useLinkQRModal } from "@/components/app/modals/link-qr-modal";
import IconMenu from "@/components/shared/icon-menu";
import BlurImage from "@/components/shared/blur-image";
import CopyButton from "@/components/shared/copy-button";
import {
  Archive,
  Chart,
  Delete,
  Edit,
  LoadingDots,
  QR,
  ThreeDots,
} from "@/components/shared/icons";
import Popover from "@/components/shared/popover";
import Tooltip, { TooltipContent } from "@/components/shared/tooltip";
import useProject from "@/lib/swr/use-project";
import useUsage from "@/lib/swr/use-usage";
import { LinkProps } from "@/lib/types";
import {
  fetcher,
  getApexDomain,
  linkConstructor,
  nFormatter,
  timeAgo,
} from "@/lib/utils";
import useIntersectionObserver from "@/lib/hooks/use-intersection-observer";

export default function LinkCard({ props }: { props: LinkProps }) {
  const { key, url, createdAt, archived, expiresAt } = props;

  const apexDomain = getApexDomain(url);

  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const { project } = useProject();
  const { domain, domainVerified } = project || {};
  const { isOwner } = useProject();
  const { exceededUsage } = useUsage();

  const linkRef = useRef<any>();
  const entry = useIntersectionObserver(linkRef, {});
  const isVisible = !!entry?.isIntersecting;

  const { data: clicks } = useSWR<number>(
    isVisible &&
      (domain
        ? `/api/projects/${slug}/domains/${domain}/links/${key}/clicks`
        : `/api/edge/links/${key}/clicks`),
    fetcher,
    {
      fallbackData: props.clicks,
    },
  );

  const { setShowLinkQRModal, LinkQRModal } = useLinkQRModal({
    props,
  });
  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal({
    props,
  });
  const { setShowArchiveLinkModal, ArchiveLinkModal } = useArchiveLinkModal({
    props,
    archived: !archived,
  });
  const { setShowDeleteLinkModal, DeleteLinkModal } = useDeleteLinkModal({
    props,
  });
  const [openPopover, setOpenPopover] = useState(false);

  const expired = expiresAt && new Date() > new Date(expiresAt);

  return (
    <div
      ref={linkRef}
      className="relative rounded-lg border border-gray-100 bg-white p-3 pr-1 shadow transition-all hover:shadow-md sm:p-4"
    >
      <LinkQRModal />
      <AddEditLinkModal />
      <ArchiveLinkModal />
      <DeleteLinkModal />
      <div className="absolute top-0 left-0 flex h-full w-1.5 flex-col overflow-hidden rounded-l-lg">
        {archived && <div className="h-full w-full bg-gray-400" />}
        {expired ? (
          <div className="h-full w-full bg-amber-500" />
        ) : (
          <div className="h-full w-full bg-green-500" />
        )}
      </div>
      <li className="relative flex items-center justify-between">
        <div className="relative flex shrink items-center space-x-2 sm:space-x-4">
          <BlurImage
            src={`https://www.google.com/s2/favicons?sz=64&domain_url=${apexDomain}`}
            alt={apexDomain}
            className="h-8 w-8 rounded-full sm:h-10 sm:w-10"
            width={20}
            height={20}
          />
          <div>
            <div className="flex max-w-fit items-center space-x-2">
              {slug && !domainVerified ? (
                <Tooltip
                  content={
                    <TooltipContent
                      title="Your branded links won't work until you verify your domain."
                      cta="Verify your domain"
                      ctaLink={`/${slug}/settings`}
                    />
                  }
                >
                  <div className="w-24 -translate-x-2 cursor-not-allowed truncate text-sm font-semibold text-gray-400 line-through sm:w-full sm:text-base">
                    <span className="hidden sm:block">
                      {linkConstructor({ key, domain, pretty: true })}
                    </span>
                    <span className="sm:hidden">
                      {linkConstructor({
                        key,
                        domain,
                        pretty: true,
                        noDomain: true,
                      })}
                    </span>
                  </div>
                </Tooltip>
              ) : (
                <a
                  className="w-24 truncate text-sm font-semibold text-blue-800 sm:w-full sm:text-base"
                  href={linkConstructor({ key, domain })}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="hidden sm:block">
                    {linkConstructor({ key, domain, pretty: true })}
                  </span>
                  <span className="sm:hidden">
                    {linkConstructor({
                      key,
                      domain,
                      pretty: true,
                      noDomain: true,
                    })}
                  </span>
                </a>
              )}
              <CopyButton url={linkConstructor({ key, domain })} />
              <button
                onClick={() => setShowLinkQRModal(true)}
                className="group rounded-full bg-gray-100 p-1.5 transition-all duration-75 hover:scale-105 hover:bg-blue-100 active:scale-95"
              >
                <span className="sr-only">Download QR</span>
                <QR className="text-gray-700 transition-all group-hover:text-blue-800" />
              </button>
              <Link
                href={`/${slug || "links"}/${encodeURI(key)}`}
                className="flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-0.5 transition-all duration-75 hover:scale-105 active:scale-100"
              >
                <Chart className="h-4 w-4" />
                <p className="whitespace-nowrap text-sm text-gray-500">
                  {nFormatter(clicks)}
                  <span className="ml-1 hidden sm:inline-block">clicks</span>
                </p>
              </Link>
            </div>
            <h3 className="max-w-[200px] truncate text-sm font-medium text-gray-700 md:max-w-md lg:max-w-2xl xl:max-w-3xl">
              {url}
            </h3>
          </div>
        </div>

        <div className="flex items-center">
          <p className="mr-3 hidden whitespace-nowrap text-sm text-gray-500 sm:block">
            Added {timeAgo(createdAt)}
          </p>
          <p className="mr-1 whitespace-nowrap text-sm text-gray-500 sm:hidden">
            {timeAgo(createdAt, true)}
          </p>
          <Popover
            content={
              <div className="grid w-full gap-1 p-2 sm:w-48">
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
                    <div className="w-full cursor-not-allowed p-2 text-left text-sm font-medium text-gray-300 transition-all duration-75">
                      <IconMenu
                        text="Edit"
                        icon={<Edit className="h-4 w-4" />}
                      />
                    </div>
                  </Tooltip>
                ) : (
                  <button
                    onClick={() => {
                      setOpenPopover(false);
                      setShowAddEditLinkModal(true);
                    }}
                    className="w-full rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
                  >
                    <IconMenu text="Edit" icon={<Edit className="h-4 w-4" />} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenPopover(false);
                    setShowArchiveLinkModal(true);
                  }}
                  className="w-full rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
                >
                  <IconMenu
                    text={archived ? "Unarchive" : "Archive"}
                    icon={<Archive className="h-4 w-4" />}
                  />
                </button>
                <button
                  onClick={() => {
                    setOpenPopover(false);
                    setShowDeleteLinkModal(true);
                  }}
                  className="w-full rounded-md p-2 text-left text-sm font-medium text-red-600 transition-all duration-75 hover:bg-red-600 hover:text-white"
                >
                  <IconMenu
                    text="Delete"
                    icon={<Delete className="h-4 w-4" />}
                  />
                </button>
              </div>
            }
            align="end"
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
          >
            <button
              type="button"
              onClick={() => setOpenPopover(!openPopover)}
              className="rounded-md px-1 py-2 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
            >
              <ThreeDots className="h-5 w-5 text-gray-500" />
            </button>
          </Popover>
        </div>
      </li>
    </div>
  );
}
