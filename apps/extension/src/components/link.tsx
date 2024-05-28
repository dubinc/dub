import {
  Archive,
  Check,
  CheckCircle,
  Copy,
  CopyPlus,
  Delete,
  Edit3,
  EllipsisVertical,
  FolderInput,
  QrCode,
  Share2,
  SignalHigh,
  TimerOff,
  Trash2,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { DotIcon } from "../../public";
import IconMenu from "../../public/IconMenu";
import Modal from "../../ui/src/modal";
import { QRCodeDownload, useLinkQRModal } from "./Qrcode/QrDownload";
import ShareModal from "./Share/ShareModal";
import { LinkProp, LinkProps, LinkWithTagsProps, ShortLinkProps, UserProps } from "../types";
import { cn, fetcher, getApexDomain, GOOGLE_FAVICON_URL, isDubDomain } from "@dub/utils";
import useWorkspace from "../../hooks/use-workspace";
import useDomains from "../../hooks/use-domain";
import { Button, Popover, SimpleTooltipContent, Tooltip, useIntersectionObserver } from "../../ui/s/src";
import useSWR, { mutate } from "swr";
import { useAddEditLinkModal } from "../link/add-edit-link-modal";
import { useArchiveLinkModal } from "../../ui/s/src/modal/archive-link-modal";
import { useTransferLinkModal } from "../../ui/s/src/modal/transfer-link-modal";
import { useDeleteLinkModal } from "../../ui/s/src/modal/delete-link-modal";
import { toast } from "sonner";
import LinkLogo from "../../src/link/link-logo";


const Link: React.FC<{ link: ShortLinkProps }> = ({ link }) => {
  const [expired, setExpired] = useState<number | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copy, setCopy] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const apexDomain = getApexDomain(link.url);

  const linkRef = useRef<any>();
  const entry = useIntersectionObserver(linkRef, {});
  const isVisible = !!entry?.isIntersecting;

  const { data: clicks } = useSWR<number>(
    // only fetch clicks if the link is visible and there's a slug and the usage is not exceeded
    isVisible &&
      link.workspaceId &&
      `/api/analytics/clicks?workspaceId=${link.workspaceId}&domain=${link.domain}&key=${link.key}`,
    fetcher,
    {
      fallbackData: link.clicks,
      dedupingInterval: 60000,
    },
  );

  const { setShowLinkQRModal, LinkQRModal } = useLinkQRModal({
    props: {domain:link.domain, key:link.key, url:link.url},
  });
  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal({
    props: link
  });

  const {
    id: _,
    createdAt: __,
    updatedAt: ___,
    userId: ____,
    ...propsToDuplicate
  } = link;
  const {
    setShowAddEditLinkModal: setShowDuplicateLinkModal,
    AddEditLinkModal: DuplicateLinkModal,
  } = useAddEditLinkModal({
    // duplicateProps: {
    //   ...propsToDuplicate,
    //   key: `${punycode(key)}-copy`,
    //   clicks: 0,
    // },
  });

  const expireds = link.expiresAt && new Date(link.expiresAt) < new Date();

  const { setShowArchiveLinkModal, ArchiveLinkModal } = useArchiveLinkModal({
    props:link,
  });
  const { setShowTransferLinkModal, TransferLinkModal } = useTransferLinkModal({
    props:link,
  });
  const { setShowDeleteLinkModal, DeleteLinkModal } = useDeleteLinkModal({
    props:link,
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
  }

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
    navigator.clipboard.writeText(link.id);
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
          if (isDubDomain(link.domain)) {
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

  useEffect(() => {
    if (link && link.createdAt) {
      const expirationTime =
        new Date(link.createdAt).getTime() + 30 * 60 * 1000;
      const intervalId = setInterval(() => {
        const remaining = Math.ceil((expirationTime - Date.now()) / 1000);
        setExpired(remaining > 0 ? Math.floor(remaining / 60) : 0);
      }, 60000);

      return () => clearInterval(intervalId);
    }
  }, [link?.createdAt]);

  const handleCopy = () => {
    if (link?.shortLink) {
      navigator.clipboard
        .writeText(link.shortLink)
        .then(() => {
          setCopy(true);
          setTimeout(() => {
            setCopy(false);
          }, 2000);
        })
        .catch((error) => {
          console.error("Failed to copy link to clipboard:", error);
        });
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleShowQRCode = () => {
    setShowQRCode((prevState) => !prevState);
    console.log(`Showing QR code for link: ${link?.qrCode}`);
  };

  const handleDelete = () => {
    console.log("delete");
  };

  return (
    <div
    ref={linkRef}
      className="relative z-0 mb-4 mt-4 flex cursor-grab items-center justify-between gap-2 rounded-md border border-gray-200 bg-white p-3 text-gray-500 shadow-lg transition-[border-color] hover:border-black active:cursor-grabbing"
      draggable={false}
      tabIndex={0}
      style={{ transform: "none", userSelect: "none", touchAction: "pan-y" }}
    >

      <span className=" absolute -right-2 -top-1.5 flex max-w-fit cursor-help items-center space-x-1 whitespace-nowrap rounded-full border border-gray-400 bg-gray-100 px-2 py-px text-xs font-medium capitalize text-gray-800 sm:-right-5">
        <IconMenu icon={<TimerOff className="h-3 w-3" />} />
        {expired !== null && expired > 0 ? (
          <p>Expire In {expired} Min</p>
        ) : (
          <p>Expired</p>
        )}
      </span>
      <button
        className="group flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-white transition-all duration-75 hover:scale-110 hover:bg-red-600 active:scale-95"
        onClick={handleDelete}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {link.archived || expireds ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 px-0 sm:h-10 sm:w-10">
                {link.archived ? (
                  <Archive className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
                ) : (
                  <TimerOff className="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
                )}
              </div>
          ) : (
            <>
          <img
          src={link?.image ? link.image : `${GOOGLE_FAVICON_URL}${apexDomain}`}
          alt="link"
          className="absolute h-12 w-12 transition-transform duration-300"
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

      </button>

      <div className="flex w-20 flex-col">
        <a
          className={cn("line-clamp-2 text-base font-semibold text-blue-700",
          {
            "text-gray-500": link.archived || expireds,
          },
          )}
          href={link.shortLink}
          target={link.shortLink}
          rel="noreferrer"
        >
          {link.shortLink}
        </a>
        <a
          href={link?.url}
          target={link?.url}
          rel="noreferrer"
          className="line-clamp-2  text-xs text-gray-500 transition-all hover:text-gray-800 "
        >
        {link?.url}
        </a>
      </div>
      <button
        className="group rounded-full bg-gray-100 p-3 transition-all duration-75 hover:scale-110 hover:bg-blue-100  active:scale-95"
        onClick={handleCopy}
      >
        <IconMenu
          icon={
            copy ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-3 w-3 text-gray-800 hover:text-black" />
            )
          }
        />
      </button>
      <button
        className="group rounded-full bg-gray-100 p-3 transition-all duration-75 hover:scale-110 hover:bg-blue-100 focus:outline-none active:scale-95"
        onClick={handleShowQRCode}
      >
        <IconMenu icon={<QrCode className="h-4 w-4  hover:text-black" />} />
      </button>
      {showQRCode && (
        <Modal show={showQRCode} onClose={handleShowQRCode}>
          <QRCodeDownload
            // props={{ url: link?.url, key: link?.key }}
            props={link} setShowLinkQRModal={setShowLinkQRModal}
                   />
        </Modal>
      )}
      <button
        className="group rounded-full bg-gray-100 p-3 transition-all duration-75 hover:scale-110 hover:bg-blue-100 focus:outline-none active:scale-95"
        onClick={handleShare}
      >
        <IconMenu icon={<Share2 className="h-4 w-4  hover:text-black" />} />
      </button>
      {showShareModal && (
        <ShareModal
          show={showShareModal}
          onClose={() => setShowShareModal(false)}
          link={link?.shortLink || ""}
        />
      )}
      <button
        onClick={handleShowQRCode}
        className="flex items-center justify-center gap-1 rounded-md bg-gray-100 p-1 text-gray-700 transition-all duration-75 hover:scale-105 active:scale-95"
      >
        <IconMenu icon={<SignalHigh className="h-4 w-4 hover:text-black" />} />
        {link?.clicks ? (
          <p className="text-sm">{link?.clicks}</p>
        ) : (
          <>
            <DotIcon />
            <p className="text-sm">
              <span className="ml-1 hidden sm:inline-block">clicks</span>
            </p>
          </>
        )}
      </button>
      <Popover
            content={
              <div className="grid w-full z-10 gap-px p-2 sm:w-48">
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
                  text={link.archived ? "Unarchive" : "Archive"}
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
                  text="Copy Link ID"
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
                {true 
                // !slug
                 && ( // this is only shown in admin mode (where there's no slug)
                  <button
                    onClick={() => {
                      window.confirm(
                        "Are you sure you want to ban this link? It will blacklist the domain and prevent any links from that domain from being created.",
                      ) &&
                        (setOpenPopover(false),
                        toast.promise(
                          fetch(`/api/admin/links/${link.id}/ban`, {
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
                    <IconMenu
                      text="Ban"
                      icon={<Delete className="h-4 w-4" />}
                    />
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
            <button
              type="button"
              onClick={() => {
                setOpenPopover(!openPopover);
              }}
              className="rounded-md px-1 py-2 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
            >
              <span className="sr-only">More options</span>
              <IconMenu
          icon={<EllipsisVertical className="h-4 w-4 hover:text-black" />}
        /> 
        </button>
          </Popover>
        

  </div>
  );
};

export default Link;
