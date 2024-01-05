import useDomains from "@/lib/swr/use-domains";
import useProject from "@/lib/swr/use-project";
import useTags from "@/lib/swr/use-tags";
import { UserProps } from "@/lib/types";
import { ModalContext } from "@/ui/modals/provider";
import TagBadge from "@/ui/links/tag-badge";
import { useAddEditLinkModal } from "@/ui/modals/add-edit-link-modal";
import { useArchiveLinkModal } from "@/ui/modals/archive-link-modal";
import { useDeleteLinkModal } from "@/ui/modals/delete-link-modal";
import { useLinkQRModal } from "@/ui/modals/link-qr-modal";
import { BlurImage } from "@/ui/shared/blur-image";
import { Chart, Delete, ThreeDots } from "@/ui/shared/icons";
import {
  Avatar,
  CopyButton,
  IconMenu,
  NumberTooltip,
  Popover,
  SimpleTooltipContent,
  Tooltip,
  TooltipContent,
  useIntersectionObserver,
  useRouterStuff,
} from "@dub/ui";
import {
  GOOGLE_FAVICON_URL,
  HOME_DOMAIN,
  cn,
  fetcher,
  getApexDomain,
  linkConstructor,
  nFormatter,
  timeAgo,
} from "@dub/utils";
import { type Link as LinkProps } from "@prisma/client";
import {
  Archive,
  CopyPlus,
  Edit3,
  EyeOff,
  MessageCircle,
  QrCode,
  TimerOff,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Linkify from "linkify-react";
import punycode from "punycode/";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

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
    expiresAt,
    createdAt,
    lastClicked,
    archived,
    tagId,
    comments,
    user,
  } = props;
  const { tags } = useTags();
  const tag = useMemo(() => tags?.find((t) => t.id === tagId), [tags, tagId]);

  const apexDomain = getApexDomain(url);

  const params = useParams() as { slug?: string };
  const { slug } = params;
  const { queryParams } = useRouterStuff();

  const { exceededUsage } = useProject();
  const { verified, loading } = useDomains({ domain });

  const linkRef = useRef<any>();
  const entry = useIntersectionObserver(linkRef, {});
  const isVisible = !!entry?.isIntersecting;

  const { data: clicks } = useSWR<number>(
    isVisible &&
      !exceededUsage &&
      `/api${
        slug ? `/projects/${slug}` : ""
      }/stats/clicks?domain=${domain}&key=${key}`,
    fetcher,
    {
      fallbackData: props.clicks,
      dedupingInterval: 60000,
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

  const expired = expiresAt && new Date(expiresAt) < new Date();

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
    // Check if the clicked element is a linkRef or one of its descendants
    const isLinkCardClick =
      linkRef.current && linkRef.current.contains(e.target);

    // Check if the clicked element is an <a> or <button> element
    const isExcludedElement =
      e.target.tagName.toLowerCase() === "a" ||
      e.target.tagName.toLowerCase() === "button";

    if (isLinkCardClick && !isExcludedElement) {
      setSelected(!selected);
    } else {
      setSelected(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      document.addEventListener("click", handlClickOnLinkCard);
    }
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
    <li
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
      <div className="relative flex items-center justify-between">
        <div className="relative flex shrink items-center">
          {archived || expired ? (
            <Tooltip
              content={
                archived
                  ? "This link is archived. It will still work, but won't be shown in your dashboard."
                  : "This link has expired. It will still show up in your dashboard, but users will get an 'Expired Link' page when they click on it."
              }
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 px-0 sm:h-10 sm:w-10">
                {archived ? (
                  <Archive className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
                ) : (
                  <TimerOff className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
                )}
              </div>
            </Tooltip>
          ) : (
            <BlurImage
              src={`${GOOGLE_FAVICON_URL}${apexDomain}`}
              alt={apexDomain}
              className="h-8 w-8 rounded-full sm:h-10 sm:w-10"
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
                  className={cn(
                    "w-full max-w-[140px] truncate text-sm font-semibold text-blue-800 sm:max-w-[300px] sm:text-base md:max-w-[360px] xl:max-w-[500px]",
                    {
                      "text-gray-500": archived || expired,
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
              <CopyButton value={linkConstructor({ key, domain })} />
              {comments && (
                <Tooltip
                  content={
                    <div className="block max-w-sm px-4 py-2 text-center text-sm text-gray-700">
                      <Linkify
                        as="p"
                        options={{
                          target: "_blank",
                          rel: "noopener noreferrer nofollow",
                          className:
                            "underline underline-offset-4 text-gray-400 hover:text-gray-700",
                        }}
                      >
                        {comments}
                      </Linkify>
                    </div>
                  }
                >
                  <button
                    onClick={() => {
                      setShowAddEditLinkModal(true);
                    }}
                    className="group rounded-full bg-gray-100 p-1.5 transition-all duration-75 hover:scale-105 active:scale-100"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-gray-700" />
                  </button>
                </Tooltip>
              )}
              {tag?.color && (
                <button
                  onClick={() => {
                    queryParams({
                      set: {
                        tagId: tag.id,
                      },
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
                      {user?.name || user?.email || "Anonymous User"}
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
              <p
                className="whitespace-nowrap text-sm text-gray-500"
                suppressHydrationWarning
              >
                {timeAgo(createdAt)}
              </p>
              <p className="xs:block hidden">•</p>
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
                  <EyeOff className="xs:block hidden h-4 w-4 text-gray-500" />
                </Tooltip>
              )}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="xs:block hidden max-w-[140px] truncate text-sm font-medium text-gray-700 underline-offset-2 hover:underline sm:max-w-[300px] md:max-w-[360px] xl:max-w-[440px]"
              >
                {url}
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <NumberTooltip value={clicks} lastClicked={lastClicked}>
            <Link
              href={`${
                slug ? `/${slug}` : ""
              }/analytics?domain=${domain}&key=${key}`}
              className="flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-0.5 transition-all duration-75 hover:scale-105 active:scale-100"
            >
              <Chart className="h-4 w-4" />
              <p className="whitespace-nowrap text-sm text-gray-500">
                {nFormatter(clicks)}
                <span className="ml-1 hidden sm:inline-block">clicks</span>
              </p>
            </Link>
          </NumberTooltip>
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
                    text={archived ? "Unarchive" : "Archive"}
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
              onClick={() => {
                setOpenPopover(!openPopover);
              }}
              className="rounded-md px-1 py-2 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
            >
              <span className="sr-only">Edit</span>
              <ThreeDots className="h-5 w-5 text-gray-500" />
            </button>
          </Popover>
        </div>
      </div>
    </li>
  );
}
