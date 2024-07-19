import {
  GOOGLE_FAVICON_URL,
  cn,
  fetcher,
  getApexDomain,
  isDubDomain,
  linkConstructor,
  nFormatter,
  punycode,
  timeAgo,
} from "@dub/utils";
import {
  Archive,
  CheckCircle,
  Copy,
  CopyPlus,
  CornerDownRight,
  Delete,
  Edit3,
  EllipsisVertical,
  FolderInput,
  QrCode,
  Share2,
  Timer,
  TimerOff,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import IconMenu from "../../public/IconMenu";
import ClickIcon from "../../public/icons/clickIcon";
import { Button, CopyButton, Popover, useIntersectionObserver } from "../../ui";
import { useAddEditLinkModal } from "../../ui/modal/add-edit-link-modal";
import { useArchiveLinkModal } from "../../ui/modal/archive-link-modal";
import { useDeleteLinkModal } from "../../ui/modal/delete-link-modal";
import { useLinkQRModal } from "../../ui/modal/link-qr-modal";
import { useShareLinkModal } from "../../ui/modal/share-link-modal";
import { useTransferLinkModal } from "../../ui/modal/transfer-link-modal";
import { ShortLinkProps } from "../types";
import { useSelectedWorkspace } from "../workspace/workspace-now";

export default function LinkCard({ props }: { props: ShortLinkProps }) {
  const [isHovered, setIsHovered] = useState(false);

  const { selectedWorkspace } = useSelectedWorkspace();

  const apexDomain = getApexDomain(props.url);

  const shortLink = useMemo(() => {
    return linkConstructor({
      key: props.key,
      domain: props.domain,
      pretty: true,
    });
  }, [props.key, props.domain]);

  const linkRef = useRef<any>();
  const entry = useIntersectionObserver(linkRef, {});
  const isVisible = !!entry?.isIntersecting;

  const { data: clicks } = useSWR<number>(
    // only fetch clicks if the link is visible and there's a slug and the usage is not exceeded
    isVisible &&
      props.workspaceId &&
      `/api/analytics/clicks?workspaceId=${props.workspaceId}&domain=${props.domain}&key=${props.key}`,
    fetcher,
    {
      fallbackData: props.clicks,
      dedupingInterval: 60000,
    },
  );

  const { setShowLinkQRModal, LinkQRModal } = useLinkQRModal({
    props: { domain: props.domain, key: props.key, url: props.url },
  });
  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal({
    props: props,
  });

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
      key: `${punycode(props.key)}-copy`,
      clicks: 0,
    },
  });

  const expired = props.expiresAt && new Date(props.expiresAt) < new Date();

  const { setShowArchiveLinkModal, ArchiveLinkModal } = useArchiveLinkModal({
    props: props,
  });
  const { setShowTransferLinkModal, TransferLinkModal } = useTransferLinkModal({
    props: props,
  });
  const { setShowDeleteLinkModal, DeleteLinkModal } = useDeleteLinkModal({
    props: props,
  });

  const { setShowShareLinkModal, ShareLinkModal } = useShareLinkModal({
    props: props,
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

  const [copiedLinkId, setCopiedLinkId] = useState(false);

  const copyLinkId = () => {
    navigator.clipboard.writeText(props.id);
    setCopiedLinkId(true);
    toast.success("Link ID copied!");
    setTimeout(() => setCopiedLinkId(false), 3000);
  };

  const onKeyDown = (e: any) => {
    const key = e.key.toLowerCase();
    // only run shortcut logic if:
    // - usage is not exceeded
    // - link is selected or the 3 dots menu is open
    // - the key pressed is one of the shortcuts
    // - there is no existing modal backdrop
    if (
      (selected || openPopover) &&
      ["e", "d", "q", "a", "t", "i", "x"].includes(key)
    ) {
      setSelected(false);
      e.preventDefault();
      switch (key) {
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
        case "t":
          if (isDubDomain(props.domain)) {
            setShowTransferLinkModal(true);
          }
          break;
        case "i":
          copyLinkId();
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
      className="relative mb-4 mt-2 w-[400px] flex cursor-grab items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-3 text-gray-500 shadow-lg transition-[border-color] hover:border-black active:cursor-grabbing"
      draggable={false}
      tabIndex={0}
      style={{ transform: "none", userSelect: "none", touchAction: "pan-y" }}
    >
      {isVisible && (
        <>
          <LinkQRModal />
          <ShareLinkModal />
          <AddEditLinkModal />
          <DuplicateLinkModal />
          <ArchiveLinkModal />
          <TransferLinkModal />
          <DeleteLinkModal />
        </>
      )}


      <span
        className={`
       ${expired ? "text-red-800" : "text-gray-800"}
      absolute z-[99999] -top-2 right-0 flex max-w-fit cursor-help items-center space-x-1 whitespace-nowrap rounded-full border border-gray-400 bg-gray-100 px-2 py-px text-xs font-medium capitalize`}
      >
        {expired ? (
          <TimerOff className="h-3 w-3" />
        ) : (
          <Timer className="h-3 w-3" />
        )}
        <p className="mb-0 mt-0 gap-5">{timeAgo(props.createdAt)}</p>
      </span>
      <div
        className="group flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-gray-100 text-white shadow-inner transition-all duration-75 hover:scale-110 hover:bg-red-600 active:scale-95"
        onClick={() => {
          setOpenPopover(false);
          setShowDeleteLinkModal(true);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {props.archived || expired ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 px-0 sm:h-10 sm:w-10">
            {props.archived ? (
              <Archive className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
            ) : (
              <TimerOff className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
            )}
          </div>
        ) : (
          <>
            <img
              src={
                props?.image
                  ? props.image
                  : `${GOOGLE_FAVICON_URL}${apexDomain}`
              }
              alt="link"
              className="absolute m-2 h-8 w-8 rounded-full border border-gray-100 transition-transform duration-300"
              style={{
                transform: isHovered ? "rotateY(180deg)" : "rotateY(0deg)",
                opacity: isHovered ? "0" : "1",
              }}
            />
            <IconMenu
              icon={<Trash2 className="h-5 w-5" />}
              style={{
                transform: isHovered ? "rotateY(180deg)" : "rotateY(0deg)",
                opacity: isHovered ? "1" : "0",
              }}
            />
          </>
        )}
      </div>

      <div className="flex w-20 flex-col">
        <a
          className={cn("line-clamp-2 text-base font-semibold text-black", {
            "text-gray-500": props.archived || expired,
          })}
          href={shortLink}
          target={shortLink}
          rel="noreferrer"
        >
          {shortLink}
        </a>
        <div className="flex items-center w-full">
        <CornerDownRight className="h-4 w-4 mr-1 flex-shrink-0" />
        <a
          href={props.url}
          target={props.url}
          rel="noreferrer"
          className={cn(
            "line-clamp-2 text-xs text-gray-600 transition-all hover:text-gray-800 overflow-hidden flex-grow",
          )}
        >{apexDomain ?? props.url}</a>
        </div>
      </div>

      <CopyButton
        className={cn(
          "group cursor-pointer rounded-full bg-gray-100 p-3 transition-all duration-75 hover:scale-110 hover:bg-blue-100 hover:text-gray-800 focus:outline-none active:scale-95",
        )}       
        value={shortLink}
      />
      <div
        className={cn(
          "group cursor-pointer rounded-full bg-gray-100 p-3 transition-all duration-75 hover:scale-110 hover:bg-blue-100 hover:text-gray-800 focus:outline-none active:scale-95",
        )}
        onClick={() => {
          setOpenPopover(false);
          setShowLinkQRModal(true);
        }}
      >
        <IconMenu icon={<QrCode className={"h-4 w-4"} />} />
      </div>
      <div
        className={cn(
          "group cursor-pointer rounded-full bg-gray-100 p-3 transition-all duration-75 hover:scale-110 hover:bg-blue-100 hover:text-gray-800 focus:outline-none active:scale-95",
        )}
        onClick={() => {
          setOpenPopover(false);
          setShowShareLinkModal(true);
        }}
      >
        <IconMenu icon={<Share2 className="h-4 w-4 " />} />
      </div>
      <a
        href={`https://dub.sh/stats/${props.key}`}
        className="flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-0.5 text-center text-gray-500 transition-all duration-75 hover:scale-105 active:scale-100"
      >
        <IconMenu icon={<ClickIcon />} />
        <p className="mb-0 mt-0 text-sm">{nFormatter(clicks)}</p>
      </a>
      <Popover
        content={
          <div className="!z-50 grid w-full gap-px p-2 sm:w-40">
            <Button
              text="Edit"
              variant="outline"
              onClick={() => {
                setOpenPopover(false);
                setShowAddEditLinkModal(true);
              }}
              icon={<Edit3 className="h-4 w-4" />}
              shortcut="E"
              className="h-9 px-2 font-medium"
            />
            <Button
              text="Duplicate"
              variant="outline"
              onClick={() => {
                setOpenPopover(false);
                setShowDuplicateLinkModal(true);
              }}
              icon={<CopyPlus className="h-4 w-4" />}
              shortcut="D"
              className="h-9 px-2 font-medium"
            />
            <Button
              text="QR Code"
              variant="outline"
              onClick={() => {
                setOpenPopover(false);
                setShowLinkQRModal(true);
              }}
              icon={<QrCode className="h-4 w-4" />}
              shortcut="Q"
              className="h-9 px-2 font-medium"
            />
            <Button
              text={props.archived ? "Unarchive" : "Archive"}
              variant="outline"
              onClick={() => {
                setOpenPopover(false);
                setShowArchiveLinkModal(true);
              }}
              icon={<Archive className="h-4 w-4" />}
              shortcut="A"
              className="h-9 px-2 font-medium"
            />
            <Button
              text="Transfer"
              variant="outline"
              onClick={() => {
                setOpenPopover(false);
                setShowTransferLinkModal(true);
              }}
              icon={<FolderInput className="h-4 w-4" />}
              shortcut="T"
              className="h-9 px-2 font-medium"
            />
            <Button
              text="Copy ID"
              variant="outline"
              onClick={() => copyLinkId()}
              icon={
                copiedLinkId ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )
              }
              shortcut="I"
              className="h-9 px-2 font-medium"
            />
            <Button
              text="Delete"
              variant="danger-outline"
              onClick={() => {
                setOpenPopover(false);
                setShowDeleteLinkModal(true);
              }}
              icon={<Delete className="h-4 w-4" />}
              shortcut="X"
              className="h-9 px-2 font-medium"
            />
            {selectedWorkspace && ( // this is only shown in admin mode (where there's no slug)
              // !slug
              <button
                onClick={() => {
                  window.confirm(
                    "Are you sure you want to ban this link? It will blacklist the domain and prevent any links from that domain from being created.",
                  ) &&
                    (setOpenPopover(false),
                    toast.promise(
                      fetch(`/api/admin/links/${props.id}/ban`, {
                        method: "DELETE",
                      }).then(async () => {
                        await mutate(
                          (key) =>
                            typeof key === "string" &&
                            key.startsWith("/api/admin/links"),
                          undefined,
                          { revalidate: true },
                        );
                      }),
                      {
                        loading: "Banning link...",
                        success: "Link banned!",
                        error: "Error banning link.",
                      },
                    ));
                }}
                className="group flex w-full items-center justify-between rounded-md p-2 text-left text-sm font-medium text-red-600 transition-all duration-75 hover:bg-red-600 hover:text-white"
              >
                <IconMenu text="Ban" icon={<Delete className="h-4 w-4" />} />
                <kbd className="hidden rounded bg-red-100 px-2 py-0.5 text-xs font-light text-red-600 transition-all duration-75 group-hover:bg-red-500 group-hover:text-white sm:inline-block">
                  B
                </kbd>
              </button>
            )}
          </div>
        }
        align="end"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <div
          onClick={() => {
            setOpenPopover(!openPopover);
          }}
          className="cursor-pointer rounded-md bg-white px-1 py-2 text-black transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
        >
          <span className="sr-only">More options</span>
          <IconMenu
            icon={<EllipsisVertical className="h-4 w-4 hover:text-black" />}
          />
        </div>
      </Popover>
    </div>
  );
}
