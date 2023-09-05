import Link from "next/link";
import { useRouter } from "next/router";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";
import { useArchiveLinkModal } from "@/components/app/modals/archive-link-modal";
import { useDeleteLinkModal } from "@/components/app/modals/delete-link-modal";
import { useLinkQRModal } from "@/components/app/modals/link-qr-modal";
import IconMenu from "@/components/shared/icon-menu";
import BlurImage from "#/ui/blur-image";
import CopyButton from "@/components/shared/copy-button";
import { Chart, Delete, ThreeDots } from "@/components/shared/icons";
import Popover from "#/ui/popover";
import Tooltip, { SimpleTooltipContent, TooltipContent } from "#/ui/tooltip";
import useProject from "#/lib/swr/use-project";
import { type Link as LinkProps } from "@prisma/client";
import {
  cn,
  fetcher,
  getApexDomain,
  linkConstructor,
  nFormatter,
  setQueryString,
  timeAgo,
} from "#/lib/utils";
import useIntersectionObserver from "#/lib/hooks/use-intersection-observer";
import useDomains from "#/lib/swr/use-domains";
import {
  Archive,
  CopyPlus,
  Edit3,
  EyeOff,
  MessageCircle,
  QrCode,
} from "lucide-react";
import punycode from "punycode/";
import { GOOGLE_FAVICON_URL, HOME_DOMAIN } from "#/lib/constants";
import useTags from "#/lib/swr/use-tags";
import TagBadge from "@/components/app/links/tag-badge";
import { ModalContext } from "#/ui/modal-provider";
import Number from "#/ui/number";
import Avatar from "#/ui/avatar";
import { UserProps } from "#/lib/types";

export default function LinkCard({
  props,
}: {
  props: LinkProps & {
    user: UserProps;
  };
}) {
  const {
    key,
    domain,
    url,
    rewrite,
    createdAt,
    archived,
    tagId,
    comments,
    user,
  } = props;
  const { tags } = useTags();
  const tag = useMemo(() => tags?.find((t) => t.id === tagId), [tags, tagId]);

  const apexDomain = getApexDomain(url);

  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const { exceededUsage } = useProject();
  const { verified, loading } = useDomains({ domain });

  const linkRef = useRef<any>();
  const entry = useIntersectionObserver(linkRef, {});
  const isVisible = !!entry?.isIntersecting;

  const { data: clicks } = useSWR<number>(
    isVisible &&
      `/api/links/${encodeURIComponent(key)}/stats/clicks${
        slug ? `?slug=${slug}&domain=${domain}` : ""
      }`,
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
  const { setShowUpgradePlanModal } = useContext(ModalContext);

  // Duplicate link Modal
  const {
    id: _,
    createdAt: __,
    updatedAt: ___,
    userId: ____,
    ...propsToDuplicate
  } = props;
  const {
    setShowAddEditLinkModal: setShowDuplicateLinkModal,
    AddEditLinkModal: DuplicateLinkModal,
  } = useAddEditLinkModal({
    // @ts-expect-error
    duplicateProps: {
      ...propsToDuplicate,
      key: `${key}-copy`,
      clicks: 0,
    },
  });

  const { setShowArchiveLinkModal, ArchiveLinkModal } = useArchiveLinkModal({
    props,
    archived: !archived,
  });
  const { setShowDeleteLinkModal, DeleteLinkModal } = useDeleteLinkModal({
    props,
  });
  const [openPopover, setOpenPopover] = useState(false);
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    // if there's an existing modal backdrop and the link is selected, unselect it
    const existingModalBackdrop = document.getElementById("modal-backdrop");
    if (existingModalBackdrop && selected) {
      setSelected(false);
    }
  }, [selected]);

  const handlClickOnLinkCard = (e: any) => {
    // if clicked on linkRef, setSelected to true
    // else setSelected to false
    // do this via event listener
    if (linkRef.current && !linkRef.current.contains(e.target)) {
      setSelected(false);
    } else {
      setSelected(!selected);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handlClickOnLinkCard);
    return () => {
      document.removeEventListener("click", handlClickOnLinkCard);
    };
  }, [handlClickOnLinkCard]);

  const onKeyDown = (e: any) => {
    // only run shortcut logic if:
    // - usage is not exceeded
    // - link is selected or the 3 dots menu is open
    // - the key pressed is one of the shortcuts
    // - there is no existing modal backdrop
    if (
      !exceededUsage &&
      (selected || openPopover) &&
      ["e", "d", "q", "a", "x"].includes(e.key)
    ) {
      setSelected(false);
      e.preventDefault();
      switch (e.key) {
        case "e":
          setShowAddEditLinkModal(true);
          break;
        case "d":
          setShowDuplicateLinkModal(true);
          break;
        case "q":
          setShowLinkQRModal(true);
          break;
        case "a":
          setShowArchiveLinkModal(true);
          break;
        case "x":
          setShowDeleteLinkModal(true);
          break;
      }
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onKeyDown]);

  return (
    <div
      ref={linkRef}
      className={`${
        selected ? "border-black" : "border-gray-50"
      } relative rounded-lg border-2 bg-white p-3 pr-1 shadow transition-all hover:shadow-md sm:p-4`}
    >
      {isVisible && (
        <>
          <LinkQRModal />
          <AddEditLinkModal />
          <DuplicateLinkModal />
          <ArchiveLinkModal />
          <DeleteLinkModal />
        </>
      )}
      <li className="relative flex items-center justify-between">
        <div className="relative flex shrink items-center">
          {archived ? (
            <Tooltip content="This link is archived. It will still work, but won't be shown in your dashboard.">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 px-0 sm:h-10 sm:w-10">
                <Archive className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
              </div>
            </Tooltip>
          ) : (
            <BlurImage
              src={`${GOOGLE_FAVICON_URL}${apexDomain}`}
              alt={apexDomain}
              className="h-8 w-8 rounded-full sm:h-10 sm:w-10"
              unoptimized
              width={20}
              height={20}
            />
          )}
          {/* 
            Here, we're manually setting ml-* values because if we do space-x-* in the parent div, 
            it messes up the tooltip positioning.
          */}
          <div className="ml-2 sm:ml-4">
            <div className="flex max-w-fit items-center space-x-2">
              {slug && !verified && !loading ? (
                <Tooltip
                  content={
                    <TooltipContent
                      title="Your branded links won't work until you verify your domain."
                      cta="Verify your domain"
                      href={`/${slug}/domains`}
                    />
                  }
                >
                  <div className="w-24 -translate-x-2 cursor-not-allowed truncate text-sm font-semibold text-gray-400 line-through sm:w-full sm:text-base">
                    {linkConstructor({
                      key,
                      domain: punycode.toUnicode(domain || ""),
                      pretty: true,
                    })}
                  </div>
                </Tooltip>
              ) : (
                <a
                  onClick={(e) => {
                    e.stopPropagation(); // to avoid selecting the link card
                  }}
                  className={cn(
                    "w-full max-w-[170px] truncate text-sm font-semibold text-blue-800 sm:max-w-[300px] sm:text-base md:max-w-[360px] xl:max-w-[500px]",
                    {
                      "text-gray-500": archived,
                    },
                  )}
                  href={linkConstructor({ key, domain })}
                  target="_blank"
                  rel="noreferrer"
                >
                  {linkConstructor({
                    key,
                    domain: punycode.toUnicode(domain || ""),
                    pretty: true,
                  })}
                </a>
              )}
              <CopyButton url={linkConstructor({ key, domain })} />
              {comments && (
                <Tooltip
                  content={
                    <div className="block max-w-sm px-4 py-2 text-center text-sm text-gray-700">
                      {comments}
                    </div>
                  }
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddEditLinkModal(true);
                    }}
                    className="group rounded-full bg-gray-100 p-1.5 transition-all duration-75 hover:scale-105 active:scale-95"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-gray-700" />
                  </button>
                </Tooltip>
              )}
              {tag?.color && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setQueryString({
                      router,
                      param: "tagId",
                      value: tag.id,
                    });
                  }}
                  className="transition-all duration-75 hover:scale-105 active:scale-100"
                >
                  <TagBadge {...tag} withIcon />
                </button>
              )}
            </div>
            <div className="flex max-w-fit items-center space-x-1">
              <Tooltip
                content={
                  <div className="w-full p-4">
                    <Avatar user={user} className="h-10 w-10" />
                    <p className="mt-2 text-sm font-semibold text-gray-700">
                      {user?.name || user?.email}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Created{" "}
                      {new Date(createdAt).toLocaleDateString("en-us", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                }
              >
                {/* Without the wrapping div, the Tooltip won't be triggered for some reason */}
                <div className="w-4">
                  <Avatar user={user} className="h-4 w-4" />
                </div>
              </Tooltip>
              <p>•</p>
              <p className="whitespace-nowrap text-sm text-gray-500">
                {timeAgo(createdAt)}
              </p>
              <p>•</p>
              {rewrite && (
                <Tooltip
                  content={
                    <SimpleTooltipContent
                      title="This link is cloaked. Your users will only see the short link in the browser address bar."
                      cta="Learn more."
                      href={`${HOME_DOMAIN}/help/article/how-to-create-link#link-cloaking`}
                    />
                  }
                >
                  <EyeOff className="h-4 w-4 text-gray-500" />
                </Tooltip>
              )}
              <a
                onClick={(e) => {
                  e.stopPropagation(); // to avoid selecting the link card
                }}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-[180px] truncate text-sm font-medium text-gray-700 underline-offset-2 hover:underline sm:max-w-[300px] md:max-w-[360px] xl:max-w-[440px]"
              >
                {url}
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Number value={clicks}>
            <Link
              onClick={(e) => {
                e.stopPropagation();
              }}
              href={`/${
                slug ? `${slug}/${domain}` : "links"
              }/${encodeURIComponent(key)}`}
              className="flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-0.5 transition-all duration-75 hover:scale-105 active:scale-100"
            >
              <Chart className="h-4 w-4" />
              <p className="whitespace-nowrap text-sm text-gray-500">
                {nFormatter(clicks)}
                <span className="ml-1 hidden sm:inline-block">clicks</span>
              </p>
            </Link>
          </Number>
          <Popover
            content={
              <div className="grid w-full gap-px p-2 sm:w-48">
                {slug && exceededUsage ? (
                  <Tooltip
                    content={
                      <TooltipContent
                        title="Your project has exceeded its usage limit. We're still collecting data on your existing links, but you need to upgrade to edit them."
                        cta="Upgrade to Pro"
                        onClick={() => {
                          setOpenPopover(false);
                          setShowUpgradePlanModal(true);
                        }}
                      />
                    }
                  >
                    <div className="flex w-full cursor-not-allowed items-center justify-between p-2 text-left text-sm font-medium text-gray-300 transition-all duration-75">
                      <IconMenu
                        text="Edit"
                        icon={<Edit3 className="h-4 w-4" />}
                      />
                      <kbd className="hidden rounded bg-gray-100 px-2 py-0.5 text-xs font-light text-gray-300 transition-all duration-75 sm:inline-block">
                        E
                      </kbd>
                    </div>
                  </Tooltip>
                ) : (
                  <button
                    onClick={() => {
                      setOpenPopover(false);
                      setShowAddEditLinkModal(true);
                    }}
                    className="group flex w-full items-center justify-between rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
                  >
                    <IconMenu
                      text="Edit"
                      icon={<Edit3 className="h-4 w-4" />}
                    />
                    <kbd className="hidden rounded bg-gray-100 px-2 py-0.5 text-xs font-light text-gray-500 transition-all duration-75 group-hover:bg-gray-200 sm:inline-block">
                      E
                    </kbd>
                  </button>
                )}
                {slug && exceededUsage ? (
                  <Tooltip
                    content={
                      <TooltipContent
                        title="Your project has exceeded its usage limit. We're still collecting data on your existing links, but you need to upgrade to create a new link."
                        cta="Upgrade to Pro"
                        onClick={() => {
                          setOpenPopover(false);
                          setShowUpgradePlanModal(true);
                        }}
                      />
                    }
                  >
                    <div className="flex w-full cursor-not-allowed items-center justify-between p-2 text-left text-sm font-medium text-gray-300 transition-all duration-75">
                      <IconMenu
                        text="Duplicate"
                        icon={<CopyPlus className="h-4 w-4" />}
                      />
                      <kbd className="hidden rounded bg-gray-100 px-2 py-0.5 text-xs font-light text-gray-300 transition-all duration-75 sm:inline-block">
                        D
                      </kbd>
                    </div>
                  </Tooltip>
                ) : (
                  <button
                    onClick={() => {
                      setOpenPopover(false);
                      setShowDuplicateLinkModal(true);
                    }}
                    className="group flex w-full items-center justify-between rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
                  >
                    <IconMenu
                      text="Duplicate"
                      icon={<CopyPlus className="h-4 w-4" />}
                    />
                    <kbd className="hidden rounded bg-gray-100 px-2 py-0.5 text-xs font-light text-gray-500 transition-all duration-75 group-hover:bg-gray-200 sm:inline-block">
                      D
                    </kbd>
                  </button>
                )}
                <button
                  onClick={() => {
                    setOpenPopover(false);
                    setShowLinkQRModal(true);
                  }}
                  className="group flex w-full items-center justify-between rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
                >
                  <IconMenu
                    text="QR Code"
                    icon={<QrCode className="h-4 w-4" />}
                  />
                  <kbd className="hidden rounded bg-gray-100 px-2 py-0.5 text-xs font-light text-gray-500 transition-all duration-75 group-hover:bg-gray-200 sm:inline-block">
                    Q
                  </kbd>
                </button>
                <button
                  onClick={() => {
                    setOpenPopover(false);
                    setShowArchiveLinkModal(true);
                  }}
                  className="group flex w-full items-center justify-between rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
                >
                  <IconMenu
                    text="Archive"
                    icon={<Archive className="h-4 w-4" />}
                  />
                  <kbd className="hidden rounded bg-gray-100 px-2 py-0.5 text-xs font-light text-gray-500 transition-all duration-75 group-hover:bg-gray-200 sm:inline-block">
                    A
                  </kbd>
                </button>
                <button
                  onClick={() => {
                    setOpenPopover(false);
                    setShowDeleteLinkModal(true);
                  }}
                  className="group flex w-full items-center justify-between rounded-md p-2 text-left text-sm font-medium text-red-600 transition-all duration-75 hover:bg-red-600 hover:text-white"
                >
                  <IconMenu
                    text="Delete"
                    icon={<Delete className="h-4 w-4" />}
                  />
                  <kbd className="hidden rounded bg-red-100 px-2 py-0.5 text-xs font-light text-red-600 transition-all duration-75 group-hover:bg-red-500 group-hover:text-white sm:inline-block">
                    X
                  </kbd>
                </button>
              </div>
            }
            align="end"
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenPopover(!openPopover);
              }}
              className="rounded-md px-1 py-2 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
            >
              <span className="sr-only">Edit</span>
              <ThreeDots className="h-5 w-5 text-gray-500" />
            </button>
          </Popover>
        </div>
      </li>
    </div>
  );
}
